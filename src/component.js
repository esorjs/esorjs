import { Lifecycle } from "./lifecycle";
import STATE, { withCurrentComponent } from "./globals";
import { setupDeclarativeShadowRoot } from "./utils/dom";
import { initPropsAndObserve } from "./templates/props";
import { bindEventsInRange, setupSignals, setupRefs } from "./dom-bindings";
import { cachedTemplate } from "./templates/templates";
import { clearEventHandler } from "./events";

export function component(name, setup) {
    class EsorComponent extends HTMLElement {
        constructor() {
            super();
            // Configuramos el Shadow DOM (declarativo o con attachShadow)
            setupDeclarativeShadowRoot(this);
            // Inicializamos todas las propiedades internas en una sola asignación
            Object.assign(this, {
                _cleanup: new Set(),
                _isUpdating: false,
                _props: {},
                _eventIds: [],
                lifecycle: new Lifecycle(),
            });
            // Asignamos el componente actual al estado global y configuramos la observación de propiedades
            STATE.currentComponent = this;
            initPropsAndObserve(this);
            this.lifecycle.run("beforeMount", this);
            this._render();
        }

        connectedCallback() {
            this.lifecycle.run("mount", this);
        }

        disconnectedCallback() {
            this.lifecycle.run("destroy", this);
            this._cleanup.forEach((fn) => fn());
            this._cleanup.clear();
            this._eventIds.forEach(({ type, id }) =>
                clearEventHandler(type, id)
            );
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
