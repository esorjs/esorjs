import { Lifecycle } from "./lifecycle";
import STATE, { withCurrentComponent } from "./globals";
import { setupDeclarativeShadowRoot } from "./utils/dom";
import { initPropsAndObserve } from "./templates/props";
import { bindEventsInRange, setupSignals, setupRefs } from "./helpers";
import { cachedTemplate } from "./templates/templates";

export function component(name, setup) {
    class EsorComponent extends HTMLElement {
        constructor() {
            super();
            setupDeclarativeShadowRoot(this);
            this._initInstanceState();
            this.lifecycle = new Lifecycle();
            STATE.currentComponent = this;
            initPropsAndObserve(this);
            this.lifecycle.run("beforeMount", this);
            this._render(); // Render inicial
        }

        _initInstanceState() {
            Object.assign(this, {
                _cleanup: new Set(),
                _isUpdating: false,
                _props: {},
                _eventIds: []
            });
        }

        connectedCallback() {
            this.lifecycle.run("mount", this);
        }

        disconnectedCallback() {
            this.lifecycle.run("destroy", this);
            // Ejecutar y limpiar funciones de limpieza y eventos registrados
            [...this._cleanup].forEach(fn => fn());
            this._cleanup.clear();
            [...this._eventIds].forEach(({ type, id }) => clearEventHandler(type, id));
            this._eventIds = [];
        }

        _render() {
            withCurrentComponent(this, () => {
                this.lifecycle.run("beforeUpdate", this);
                const setupResult = setup.call(this, this._props);
                const { template, signals, refs } =
                    typeof setupResult === "function"
                        ? setupResult()
                        : setupResult || {};

                if (!this.shadowRoot.hasChildNodes()) {
                    this.shadowRoot.appendChild(cachedTemplate(name, template));
                }
                setupSignals(this, signals);
                bindEventsInRange(this);
                setupRefs(this, refs);
                this.lifecycle.run("update", this);
            });
        }
    }

    customElements.define(name, EsorComponent);
    return EsorComponent;
}
