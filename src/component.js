import { Lifecycle } from "./lifecycle";
import STATE, { withCurrentComponent } from "./globals";
import {
    findAttributesWithEsorDirectives,
    setupDeclarativeShadowRoot,
} from "./utils/dom";
import { initPropsAndObserve } from "./templates/props";
import {
    setupEventDelegation,
    setupSignals,
    setupRefs,
} from "./templates/dom-bindings";
import { clearAllEventHandlers } from "./events";

export function component(name, setup) {
    class EsorComponent extends HTMLElement {
        constructor() {
            super();
            setupDeclarativeShadowRoot(this);
            this._initComponent();
            this._render();
        }

        _initComponent() {
            Object.assign(this, {
                _cleanup: new Set(),
                _isUpdating: false,
                _props: {},
                _eventIds: [],
                _eventHandlers: new Map(),
                lifecycle: new Lifecycle(),
            });
            STATE.currentComponent = this;
            initPropsAndObserve(this);
            this.lifecycle.run("beforeMount", this);
        }

        connectedCallback() {
            this.lifecycle.run("mount", this);
        }

        disconnectedCallback() {
            this.lifecycle.run("destroy", this);
            this._cleanupComponent();
            clearAllEventHandlers(this);
        }

        _cleanupComponent() {
            this._cleanup.forEach((fn) => fn());
            this._cleanup.clear();
            this._props = null;
            this._eventIds = null;

            if (this._eventHandlers) {
                this._eventHandlers.forEach((listener, type) => {
                    this.shadowRoot.removeEventListener(type, listener);
                });
                this._eventHandlers.clear();
            }

            STATE.currentComponent = null;
        }

        _render() {
            withCurrentComponent(this, () => {
                this.lifecycle.run("beforeUpdate", this);
                const result =
                    typeof setup === "function"
                        ? setup.call(this, this._props)
                        : setup;
                const { template, signals, refs } =
                    typeof result === "function" ? result() : result || {};

                if (!this.shadowRoot.hasChildNodes() && template) {
                    this.shadowRoot.appendChild(template.cloneNode(true));
                }

                const data = findAttributesWithEsorDirectives(this.shadowRoot);
                if (data) {
                    if (data.data_esor_ref) setupRefs(data.data_esor_ref, refs);
                    if (data.data_esor_event)
                        setupEventDelegation(this, data.data_esor_event);
                }
                setupSignals(this, signals);
                this.lifecycle.run("update", this);
            });
        }
    }
    customElements.define(name, EsorComponent);
    return EsorComponent;
}
