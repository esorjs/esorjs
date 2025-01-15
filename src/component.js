
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
 */
const templateCache = new Map();

/**
 * getCachedTemplate(key, maybeFragmentOrTemplate):
 * - Acepta un DocumentFragment O un <template>.
 * - Los cachea y retorna un clon de su contenido.
 */
function getCachedTemplate(key, maybeFragmentOrTemplate) {
    // Caso 1: El usuario (o html()) nos dio un DocumentFragment
    if (maybeFragmentOrTemplate instanceof DocumentFragment) {
        if (!templateCache.has(key))
            templateCache.set(key, maybeFragmentOrTemplate);
        
        return templateCache.get(key).cloneNode(true);

        // Caso 2: Es un elemento <template>, clonamos su .content
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

export function component(name, setup) {
    class EsorComponent extends HTMLElement {
        constructor() {
            super();

            setupDeclarativeShadowRoot(this);

            // Internos del framework
            this._cleanup = new Set();
            this._isUpdating = false;
            this._signalBindings = new Map();
            this._props = {};
            this.lifecycle = new LifecycleSystem();

            // Componente actual en STATE
            STATE.currentComponent = this;

            // 1) Inicializa props YA (si dependes de atributos, ojo con que en constructor todavía no siempre están).
            this._initializeProps();
            this.lifecycle.runHooks("beforeMount", this);
            this._render();
        }

        connectedCallback() {
            this.lifecycle.runHooks("mount", this);
        }

        disconnectedCallback() {
            // Hooks de destroy
            this.lifecycle.runHooks("destroy", this);
            // Limpia efectos, signals, etc.
            this._cleanup.forEach((fn) => fn());
            this._cleanup.clear();
            this._signalBindings.clear();
        }

        // Convierte atributos "especiales" en signals
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

        _render() {
            // beforeUpdate
            const prevComp = STATE.currentComponent;
            STATE.currentComponent = this;
            this.lifecycle.runHooks("beforeUpdate", this);

            // Llamamos al setup() del usuario
            const setupResult = setup.call(this, this._props);
            const templateData =
                typeof setupResult === "function" ? setupResult() : setupResult;

            // Restauramos el componente anterior
            STATE.currentComponent = prevComp;

            // Extraemos { template, signals, refs }
            const { template, signals, refs } = templateData || {};

            // Si no hay 'template', mostramos aviso y salimos
            if (!template) {
                warn(`No 'template' object found for component: ${name}.`);
                return;
            }

            // Usamos la función de caché (acepta DocumentFragment o <template>)
            const fragment = getCachedTemplate(name, template);
            this.shadowRoot.appendChild(fragment);

            // Enlazamos eventos
            this._bindEventsInRange();
            // Configuramos signals
            this._setupSignals(signals);
            // Configuramos refs
            this._setupRefs(refs);
            // Observamos cambios de atributos
            this._setupPropEffects();

            // update
            this.lifecycle.runHooks("update", this);
        }

        _bindEventsInRange(startNode, endNode) {
            const shadowRoot = this.shadowRoot;
            const elements = [];

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

        _setupRefs(refs) {
            refs?.forEach((ref, index) => {
                const element = this.shadowRoot.querySelector(
                    `[data-ref-${index}]`
                );
                if (element) {
                    element.removeAttribute(`data-ref-${index}`);
                    ref(element); // Asigna el nodo real al proxy
                }
            });
        }

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

    customElements.define(name, EsorComponent);
    return EsorComponent;
}
