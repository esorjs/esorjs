import { LifecycleSystem } from "./lifecycle.js";
import STATE from "./globals.js";
import { useSignal } from "./hooks/signals.js";
import { useEffect } from "./hooks/effects.js";
import { cleanAttributeValue } from "./utils/parser.js";
import { findCommentPlaceholders } from "./utils/dom.js";
import { handleSignalBinding, isSpecialAttr } from "./templates/templates.js";
import { renderArrayDiff } from "./utils/ArrayDiff.js";
import { coerceAttrValue } from "./utils/types.js";

export function component(name, setup) {
    class EsorComponent extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: "open" });
            this._cleanup = new Set();
            this._isUpdating = false;
            this._signalBindings = new Map();
            this._props = {};
            this.lifecycle = new LifecycleSystem();
            STATE.currentComponent = this;
        }

        connectedCallback() {
            this._cleanup.add(() => this.lifecycle.clearHooks());
            if (!this.shadowRoot.hasChildNodes()) {
                this._initializeProps();
                this.lifecycle.runHooks("beforeMount", this);
                this._render();
                this.lifecycle.runHooks("mount", this);
            }
        }

        disconnectedCallback() {
            this.lifecycle.runHooks("destroy", this);
            this._cleanup.forEach((fn) => fn());
            this._cleanup.clear();
            this._signalBindings.clear();
        }

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
            const prevComp = STATE.currentComponent;
            STATE.currentComponent = this;

            this.lifecycle.runHooks("beforeUpdate", this);

            const setupResult = setup.call(this, this._props);
            const templateData =
                typeof setupResult === "function" ? setupResult() : setupResult;

            STATE.currentComponent = prevComp;

            const { template, signals, refs } = templateData || {};

            if (template) {
                this.shadowRoot.appendChild(template.cloneNode(true));
            }

            this._bindEventsInRange();
            this._setupSignals(signals);
            this._setupRefs(refs);
            this._setupPropEffects();

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
                    ref(element);
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
