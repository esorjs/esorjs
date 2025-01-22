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
            this._cleanup = new Set();
            this._isUpdating = false;
            this._props = {};
            this.lifecycle = new Lifecycle();
            STATE.currentComponent = this;

            initPropsAndObserve(this);
            this.lifecycle.run("beforeMount", this);
            this._render(); // Render inicial
        }

        connectedCallback() {
            this.lifecycle.run("mount", this);
        }

        disconnectedCallback() {
            this.lifecycle.run("destroy", this);
            this._cleanup.forEach((fn) => fn());
            this._cleanup.clear();
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

                bindEventsInRange(this);
                setupSignals(this, signals);
                setupRefs(this, refs);
                this.lifecycle.run("update", this);
            });
        }
    }

    customElements.define(name, EsorComponent);
    return EsorComponent;
}
