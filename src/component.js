import { renderTemplate } from "./template/render.js";
import { createLifecycle } from "./lifecycle.js";
import { initializeProps } from "./props.js";
import { s } from "./utils/dom.js";

const REGEX_TAG_NAME = /^[a-z][a-z0-9]*-[a-z0-9-]*$/;

/**
 * A base class for creating custom elements that provides an API for working
 * with properties, events, and the component lifecycle.
 *
 * @param {function} [setup] An optional function that is called when the
 *     component is initialized. It is passed the component's properties as an
 *     argument and should return a value that can be rendered into the
 *     component's shadow DOM.
 * @param {object} [options] An optional object with options for the component.
 *     Currently only the `mode` option is supported, which can be either
 *     `"open"` or `"closed"` and determines whether the component's shadow DOM
 *     is open or closed.
 *
 * @returns {class} A class that extends `HTMLElement` and provides the
 *     following additional properties and methods:
 *
 *     - `#shadow`: The component's shadow DOM.
 *     - `props`: An object containing the component's properties.
 *     - `_cleanup`: An array of functions that are called when the component is
 *         destroyed.
 *     - `_isMounted`: A boolean indicating whether the component is currently
 *         mounted.
 *     - `constructor()`: Initializes the component and calls the `setup`
 *         function if it is provided.
 *     - `connectedCallback()`: Called when the component is inserted into the
 *         DOM. It calls the `mount` lifecycle hook if the component is already
 *         mounted.
 *     - `disconnectedCallback()`: Called when the component is removed from the
 *         DOM. It calls the `destroy` lifecycle hook and then calls the
 *         functions in the `_cleanup` array.
 */
const BaseComponent = (setup, options = {}) =>
    class extends HTMLElement {
        #shadow = this.attachShadow({ mode: options.shadowMode || "open" });
        props = Object.create(null);
        _cleanup = [];

        constructor() {
            super();
            this.#initializeComponent();
            this.runHook("beforeMount");
        }

        #initializeComponent() {
            createLifecycle(this);
            initializeProps(this);
            options.globalStyles &&
                s().forEach((s) => this.#shadow.appendChild(s.cloneNode(true)));
            const template = setup?.call(this, this.props);
            renderTemplate(this.#shadow, template);
        }

        connectedCallback() {
            this.runHook("mount");
        }
        disconnectedCallback() {
            this._cleanup.forEach((c) => c());
            this._cleanup = [];
            this.runHook("destroy");
        }
    };

/**
 * Registers a custom element with the specified tag name and setup function.
 *
 * @param {string} tagName The tag name for the custom element. Must be a valid
 *     custom element name according to the custom elements specification.
 * @param {function} [setup] An optional function to initialize the component.
 *     It receives the component's properties and should return a template to be
 *     rendered into the component's shadow DOM.
 * @param {object} [options] Optional configuration for the component.
 *     Supports the `mode` option, which can be `"open"` or `"closed"`,
 *     determining the accessibility of the component's shadow DOM.
 *
 * @returns {undefined}
 */
export const component = (tagName, setup, options = {}) => {
    typeof customElements !== "undefined" &&
        REGEX_TAG_NAME.test(tagName) &&
        !customElements.get(tagName) &&
        customElements.define(tagName, BaseComponent(setup, options));
};
