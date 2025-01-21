import { Lifecycle } from "./lifecycle";
import STATE from "./globals";
import { useSignal } from "./hooks/signals";
import { useEffect } from "./hooks/effects";
import { cleanAttributeValue } from "./utils/parser";
import {
    findCommentPlaceholders,
    getDocumentFragment,
    setupDeclarativeShadowRoot,
} from "./utils/dom";
import { handleSignalBinding, specialAttr } from "./templates/templates";
import { reconcileArrays } from "./utils/ArrayDiff";
import { coerceAttrValue } from "./utils/types";
import { warn } from "./logger";

/** Caché de plantillas para no re-parsear en cada instancia */
const templateCache = new Map();

function withCurrentComponent(component, fn) {
    const prevComp = STATE.currentComponent;
    STATE.currentComponent = component;
    try {
        return fn();
    } finally {
        STATE.currentComponent = prevComp;
    }
}

function getCachedTemplate(key, maybeFragmentOrTemplate) {
    const content = getDocumentFragment(maybeFragmentOrTemplate);
    if (!templateCache.has(key)) {
        templateCache.set(key, content.cloneNode(true));
    }
    return templateCache.get(key).cloneNode(true);
}

/**
 * Función principal para definir un componente ESOR.
 * @param {string} name   Nombre del custom element
 * @param {function} setup  Función que retorna { template, signals, refs }
 */
export function component(name, setup) {
    class EsorComponent extends HTMLElement {
        constructor() {
            super();
            setupDeclarativeShadowRoot(this);
            this._cleanup = new Set();
            this._isUpdating = false;
            this._props = {};
            this.lifecycle = new Lifecycle();
            STATE.currentComponent = this;

            // Inicializamos props y configuramos MutationObserver
            this._initPropsAndObserve();

            this.lifecycle.runHooks("beforeMount", this);
            this._render(); // Render inmediato (SSR + reduce FOUC)
        }

        connectedCallback() {
            this.lifecycle.runHooks("mount", this);
        }

        disconnectedCallback() {
            this.lifecycle.runHooks("destroy", this);
            this._cleanup.forEach((fn) => fn());
            this._cleanup.clear();
        }

        /**
         * Combina la creación de props (signals) y la observación de atributos
         */
        _initPropsAndObserve() {
            // 1) Crear signals basados en atributos especiales
            for (const { name, value } of this.attributes) {
                if (!specialAttr(name)) continue;
                const val = cleanAttributeValue(value);
                const [signal, setSignal] = useSignal(coerceAttrValue(val));
                signal.set = setSignal;
                this._props[name] = signal;
            }

            // 2) Observar mutaciones en atributos (para sincronizar signals)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === "attributes") {
                        const name = mutation.attributeName;
                        if (!specialAttr(name)) return;
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

        /** Asocia un signal a una función de actualización */
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
         * Render principal
         * - Ejecuta setup()
         * - Inyecta la plantilla si la ShadowRoot está vacía
         * - Configura eventos, signals y refs
         */
        _render() {
            withCurrentComponent(this, () => {
                this.lifecycle.runHooks("beforeUpdate", this);

                const setupResult = setup.call(this, this._props);
                const { template, signals, refs } =
                    typeof setupResult === "function"
                        ? setupResult()
                        : setupResult || {};

                if (!template) {
                    warn(`No 'template' object found for component: ${name}.`);
                    return;
                }

                // Inyectar DOM solo si está vacío (clave SSR)
                if (!this.shadowRoot.hasChildNodes()) {
                    this.shadowRoot.appendChild(
                        getCachedTemplate(name, template)
                    );
                }

                this._bindEventsInRange();
                this._setupSignals(signals);
                this._setupRefs(refs);

                this.lifecycle.runHooks("update", this);
            });
        }

        /** Recorre el ShadowRoot buscando data-event-* y enlaza handlers */
        _bindEventsInRange(startNode, endNode) {
            const { shadowRoot } = this;
            const elements = [];

            if (!startNode && !endNode) {
                // Tomar todo
                if (shadowRoot.nodeType === Node.ELEMENT_NODE)
                    elements.push(shadowRoot);
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
                            .forEach((c) => elements.push(c));
                    }
                    currentNode = currentNode.nextSibling;
                }
            }

            // Para cada elemento, busca data-event-*
            elements.forEach((el) => {
                Array.from(el.attributes).forEach((attr) => {
                    if (attr.name.startsWith("data-event-")) {
                        const eventType = attr.name.replace("data-event-", "");
                        const handlerId = attr.value;
                        const eventHandler = STATE.globalEvents.handlersByType
                            .get(eventType)
                            ?.get(parseInt(handlerId, 10));

                        if (typeof eventHandler === "function") {
                            // Creamos el AbortController
                            const abortController = new AbortController();
                            // Añadimos el listener con la señal
                            el.addEventListener(
                                eventType,
                                (...args) =>
                                    withCurrentComponent(this, () =>
                                        eventHandler.call(this, ...args)
                                    ),
                                { signal: abortController.signal }
                            );

                            // Cleanup al destruir el componente (disconnectedCallback)
                            this._cleanup.add(() => abortController.abort());

                            // Remover el atributo para no re-bindexar otra vez
                            el.removeAttribute(attr.name);
                        }
                    }
                });
            });
        }

        /** Configura signals: atributos, arrays, expresiones, etc. */
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
                        reconcileArrays(
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

        /** Configura refs: data-ref-N => pasa el elemento al ref() */
        _setupRefs(refs) {
            if (!refs) return;
            refs.forEach((ref, index) => {
                const element = this.shadowRoot.querySelector(
                    `[data-ref-${index}]`
                );
                if (element) {
                    element.removeAttribute(`data-ref-${index}`);
                    ref(element);
                }
            });
        }
    }

    customElements.define(name, EsorComponent);
    return EsorComponent;
}
