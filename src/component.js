import { LifecycleSystem } from "./lifecycle.js";
import STATE from "./globals.js";
import { useSignal } from "./hooks/signals.js";
import { useEffect } from "./hooks/effects.js";
import { cleanAttributeValue } from "./utils/parser.js";
import {
    findCommentPlaceholders,
    setupDeclarativeShadowRoot,
} from "./utils/dom.js";
import { handleSignalBinding, isSpecialAttr } from "./templates/templates.js";
import { renderArrayDiff } from "./utils/ArrayDiff.js";
import { coerceAttrValue } from "./utils/types.js";
import { warn } from "./logger.js";

/**
 * Caché de plantillas / fragmentos,
 * para evitar re-parsear el DOM cada vez que se instancia un componente.
 */
const templateCache = new Map();

/**
 * getCachedTemplate(key, maybeFragmentOrTemplate):
 * - Acepta un DocumentFragment O un <template>.
 * - Los cachea y retorna un clon de su contenido.
 */
function getCachedTemplate(key, maybeFragmentOrTemplate) {
    // Caso 1: DocumentFragment
    if (maybeFragmentOrTemplate instanceof DocumentFragment) {
        if (!templateCache.has(key)) {
            templateCache.set(key, maybeFragmentOrTemplate);
        }
        return templateCache.get(key).cloneNode(true);

        // Caso 2: <template>
    } else if (maybeFragmentOrTemplate instanceof HTMLTemplateElement) {
        if (!templateCache.has(key)) {
            templateCache.set(key, maybeFragmentOrTemplate.content);
        }
        return templateCache.get(key).cloneNode(true);

        // Caso 3: Ni fragmento ni template => warning + fragmento vacío
    } else {
        warn(
            `No valid <template> or DocumentFragment found for component: ${key}`
        );
        return document.createDocumentFragment();
    }
}

/**
 * Función principal para definir un componente ESOR.
 * @param {string} name  - Nombre del custom element
 * @param {function} setup - Función que retorna { template, signals, refs } o similar
 * @returns {class} - La clase del Custom Element
 */
export function component(name, setup) {
    class EsorComponent extends HTMLElement {
        constructor() {
            super();

            // 1) Intenta reutilizar la ShadowRoot declarativa (si viene de SSR)
            setupDeclarativeShadowRoot(this);

            // 2) Inicializaciones del framework
            this._cleanup = new Set();
            this._isUpdating = false;
            this._signalBindings = new Map();
            this._props = {};
            this.lifecycle = new LifecycleSystem();
            STATE.currentComponent = this;

            // 3) Convierte atributos en signals antes del render
            this._initializeProps();

            // Llamamos hooks "beforeMount"
            this.lifecycle.runHooks("beforeMount", this);

            // 4) Render inmediatamente en el constructor,
            //    para reducir FOUC y reutilizar SSR si existe
            this._render();
        }

        connectedCallback() {
            // "mount" hooks cuando se conecta
            this.lifecycle.runHooks("mount", this);
        }

        disconnectedCallback() {
            // "destroy" hooks
            this.lifecycle.runHooks("destroy", this);
            // Limpia
            this._cleanup.forEach((fn) => fn());
            this._cleanup.clear();
            this._signalBindings.clear();
        }

        /**
         * Lee atributos especiales y los convierte en signals (props).
         */
        _initializeProps() {
            const props = this._props;
            for (const { name, value } of this.attributes) {
                if (!isSpecialAttr(name)) continue;
                const val = cleanAttributeValue(value);
                const [signal, setSignal] = useSignal(coerceAttrValue(val));
                signal.set = setSignal;
                props[name] = signal;
            }
        }

        /**
         * Vincula un signal a una función de actualización (DOM u otra).
         */
        _bindSignalToElement(signal, updateFn) {
            const effect = useEffect(() => {
                if (this._isUpdating) return;
                this._isUpdating = true;
                try {
                    updateFn(signal());
                } finally {
                    this._isUpdating = false;
                }
            });
            this._cleanup.add(effect);
        }

        /**
         * Render principal.
         * - Ejecuta setup() para obtener { template, signals, refs }.
         * - Inyecta la plantilla (si la ShadowRoot está vacía).
         * - Llama a _bindEventsInRange, _setupSignals, _setupRefs, etc.
         */
        _render() {
            const prevComp = STATE.currentComponent;
            STATE.currentComponent = this;
            this.lifecycle.runHooks("beforeUpdate", this);

            // Ejecutamos la función setup()
            const setupResult = setup.call(this, this._props);
            const templateData =
                typeof setupResult === "function" ? setupResult() : setupResult;

            STATE.currentComponent = prevComp;

            const { template, signals, refs } = templateData || {};

            // Si no hay template, mostramos aviso y terminamos
            if (!template) {
                warn(`No 'template' object found for component: ${name}.`);
                return;
            }

            // --- CLAVE PARA SSR/HIDRACIÓN ---
            // Solo inyectar DOM si está vacío (evita duplicar SSR)
            if (!this.shadowRoot.hasChildNodes()) {
                const fragment = getCachedTemplate(name, template);
                this.shadowRoot.appendChild(fragment);
            }
            // --- FIN CLAVE SSR ---

            // Hidratar: enlazar eventos, signals, refs, etc.
            this._bindEventsInRange();
            this._setupSignals(signals);
            this._setupRefs(refs);
            this._setupPropEffects();

            this.lifecycle.runHooks("update", this);
        }

        /**
         * Recorre el ShadowRoot (o rango) para encontrar data-event-* y enlazar handlers.
         */
        _bindEventsInRange(startNode, endNode) {
            const shadowRoot = this.shadowRoot;
            const elements = [];

            // Si no se definen nodos start/end => recorre todo
            if (!startNode && !endNode) {
                if (shadowRoot.nodeType === Node.ELEMENT_NODE) {
                    elements.push(shadowRoot);
                }
                shadowRoot
                    .querySelectorAll("*")
                    .forEach((child) => elements.push(child));
            } else {
                let currentNode = startNode?.nextSibling;
                while (currentNode && currentNode !== endNode) {
                    if (currentNode.nodeType === Node.ELEMENT_NODE) {
                        elements.push(currentNode);
                        currentNode
                            .querySelectorAll("*")
                            .forEach((child) => elements.push(child));
                    }
                    currentNode = currentNode.nextSibling;
                }
            }

            // Por cada elemento, busca atributos data-event-*
            elements.forEach((element) => {
                Array.from(element.attributes).forEach((attribute) => {
                    if (attribute.name.startsWith("data-event-")) {
                        const eventType = attribute.name.replace(
                            "data-event-",
                            ""
                        );
                        const handlerId = attribute.value;
                        const eventHandler = STATE.globalEvents.handlersByType
                            .get(eventType)
                            ?.get(parseInt(handlerId));

                        if (typeof eventHandler === "function") {
                            const eventHandlerWithContext = (...args) => {
                                const previousComponent =
                                    STATE.currentComponent;
                                STATE.currentComponent = this;
                                try {
                                    return eventHandler.call(this, ...args);
                                } finally {
                                    STATE.currentComponent = previousComponent;
                                }
                            };
                            const abortController = new AbortController();
                            element.addEventListener(
                                eventType,
                                eventHandlerWithContext,
                                {
                                    signal: abortController.signal,
                                }
                            );
                            this._cleanup.add(() => abortController.abort());
                        }
                    }
                });
            });
        }

        /**
         * Configura signals: atributos, arrays, text, expressions
         */
        _setupSignals(signals) {
            if (!signals) return;

            signals.forEach(({ type, signal, bindAttr, attributeName }) => {
                if (type === "attribute") {
                    const element = this.shadowRoot.querySelector(
                        `[${bindAttr}]`
                    );
                    if (!element) return;
                    element.removeAttribute(bindAttr);

                    this._bindSignalToElement(signal, (newVal) => {
                        const strVal = String(newVal);
                        if (element.getAttribute(attributeName) !== strVal) {
                            element.setAttribute(attributeName, strVal);
                        }
                    });
                } else if (type === "array") {
                    const [startNode, endNode] = findCommentPlaceholders(
                        this.shadowRoot,
                        bindAttr
                    );
                    if (!startNode || !endNode) return;

                    this._bindSignalToElement(signal, (newVal) => {
                        const oldVal = startNode.__oldItems || [];
                        const arrayItems = Array.isArray(newVal) ? newVal : [];
                        renderArrayDiff(
                            startNode,
                            endNode,
                            oldVal,
                            arrayItems,
                            this
                        );
                    });
                } else if (type === "text" || type === "expression") {
                    handleSignalBinding({
                        host: this,
                        type,
                        signal,
                        bindAttr,
                    });
                }
            });
        }

        /**
         * Configura refs: data-ref-N => pasa el elemento al ref()
         */
        _setupRefs(refs) {
            refs?.forEach((ref, index) => {
                const element = this.shadowRoot.querySelector(
                    `[data-ref-${index}]`
                );
                if (element) {
                    element.removeAttribute(`data-ref-${index}`);
                    ref(element);
                }
            });
        }

        /**
         * Observa cambios de atributos "especiales" y actualiza sus signals
         */
        _setupPropEffects() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === "attributes") {
                        const name = mutation.attributeName;
                        if (!isSpecialAttr(name)) return;

                        const signal = this._props[name];
                        if (signal?.set) {
                            signal.set(
                                coerceAttrValue(this.getAttribute(name))
                            );
                        }
                    }
                });
            });

            observer.observe(this, {
                attributes: true,
                attributeOldValue: true,
            });

            this._cleanup.add(() => observer.disconnect());
        }
    }

    // Define el custom element
    customElements.define(name, EsorComponent);
    return EsorComponent;
}
