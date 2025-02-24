import { Lifecycle } from "./lifecycle";
import STATE, { withCurrentComponent } from "./globals";
import {
    findAttributesWithEsorDirectives,
    setupDeclarativeShadowRoot,
} from "./utils/dom";
import { initPropsAndObserve } from "./templates/props";
import { setupEventDelegation, setupSignals, setupRefs } from "./dom-bindings";
import { clearAllEventHandlers } from "./events";
import { cachedTemplate } from "./templates/helpers";

export function component(name, setup) {
    class EsorComponent extends HTMLElement {
        constructor() {
            super();
            setupDeclarativeShadowRoot(this); // Configuramos el Shadow DOM
            this._initEsorComponent(this);
            this._render();
        }

        _initEsorComponent(instance) {
            Object.assign(instance, {
                _cleanup: new Set(),
                _isUpdating: false,
                _props: {},
                _eventIds: [],
                lifecycle: new Lifecycle(),
            });
            STATE.currentComponent = instance;
            initPropsAndObserve(instance);
            instance.lifecycle.run("beforeMount", instance);
        }

        connectedCallback() {
            this.lifecycle.run("mount", this);
        }

        disconnectedCallback() {
            this.lifecycle.run("destroy", this);
            this._cleanup.forEach((fn) => fn());
            this._cleanup.clear();
            clearAllEventHandlers(this); // Limpiar todos los handlers
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
