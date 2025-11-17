import { effect } from "../hooks/reactivity.js";
import { reconcileArray } from "./reconcile.js";

const MARKER = "\uFEFF";
const cache = new WeakMap();

/**
 * Creates a template object with placeholders replaced by provided values.
 *
 * @param {TemplateStringsArray} strings - Template strings with placeholders.
 * @param {...any} allValues - Values to be inserted into the template.
 * @returns {object} Template object with template, values, _isTemplate, and _key properties.
 */
const html = (strings, ...allValues) => {
    let cached = cache.get(strings);
    if (!cached) {
        const template = document.createElement("template");
        template.innerHTML = strings.join(MARKER);
        const keyAttrIndex = strings.findIndex((s) =>
            s.trim().endsWith("key=")
        );
        cached = { template, keyAttrIndex };
        cache.set(strings, cached);
    }
    const { template, keyAttrIndex } = cached;
    let key,
        otherValues = [...allValues];
    if (keyAttrIndex !== -1) {
        key = allValues[keyAttrIndex];
        otherValues.splice(keyAttrIndex, 1);
    }
    return { template, values: otherValues, _isTemplate: true, _key: key };
};

/**
 * Renders a value into a parent DOM node.
 *
 * This function will recursively traverse the value, applying the following rules:
 * - If the value is an array of template objects, reconcile the array with the parent.
 * - If the value is a template object, render the template into the parent.
 * - If the value is an array of non-template objects, render each item in the array
 *   into the parent.
 * - If the value is a DOM node, append it to the parent.
 * - If the value is a string or number, create a text node and append it to the parent.
 * - If the value is null, undefined, or false, do nothing.
 *
 * @param {Node} parent - The parent DOM node that will receive the rendered value.
 * @param {any} value - The value to be rendered.
 * @param {boolean} [shouldClear=true] - Whether to clear the parent before rendering.
 */
const renderValue = (parent, value, shouldClear = true) => {
    if (Array.isArray(value)) {
        if (value.length && value[0]?._key !== undefined) {
            reconcileArray(parent, value);
            return;
        }
        if (shouldClear && !(parent instanceof DocumentFragment)) {
            parent.textContent = "";
        }
        for (let i = 0; i < value.length; i++) {
            const tempContainer = document.createDocumentFragment();
            renderValue(tempContainer, value[i], false);
            parent.appendChild(tempContainer);
        }
        return;
    }

    if (shouldClear && !(parent instanceof DocumentFragment)) {
        parent.textContent = "";
    }

    if (value == null || value === false) return;

    if (value._isTemplate) {
        renderTemplate(parent, value);
    } else if (value instanceof Node) {
        parent.appendChild(value);
    } else {
        parent.appendChild(document.createTextNode(String(value)));
    }
};

/**
 * Renders a template object and its values into a parent DOM node.
 *
 * This function will recursively traverse the template, replacing placeholders
 * with provided values. It will also call any functions that were passed as values
 * and inject the result into the DOM.
 *
 * @param {Node} parent - The parent DOM node that will receive the rendered template.
 * @param {object} templateObject - An object with `template` and `values` properties.
 *     The `template` property should be a template element, and the `values` property
 *     should be an array of values to be inserted into the template.
 */
const renderTemplate = (parent, { template, values }) => {
    const content = template.content.cloneNode(true);
    let valueIndex = 0;

    const processNode = (node) => {
        if (
            node.nodeType === Node.TEXT_NODE &&
            node.nodeValue.includes(MARKER)
        ) {
            const parts = node.nodeValue.split(MARKER);
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < parts.length; i++) {
                if (i > 0) {
                    const value = values[valueIndex++];
                    if (typeof value === "function") {
                        const placeholder = document.createElement("span");
                        fragment.appendChild(placeholder);
                        effect(() => renderValue(placeholder, value()));
                    } else {
                        renderValue(fragment, value, false);
                    }
                }
                if (parts[i])
                    fragment.appendChild(document.createTextNode(parts[i]));
            }
            node.parentNode.replaceChild(fragment, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const attrs = [];
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                if (attr.name !== "key" && attr.value === MARKER)
                    attrs.push(attr);
            }
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                const value = values[valueIndex++];
                const name = attr.name;
                node.removeAttribute(name);

                if (name === "ref") {
                    typeof value === "function"
                        ? value(node)
                        : value && (value.current = node);
                } else if (name === "style" && value && typeof value === "object") {
                    typeof value === "function"
                        ? effect(() => Object.assign(node.style, value()))
                        : Object.assign(node.style, value);
                } else if (name[0] === "o" && name[1] === "n") {
                    const eventName = name.slice(2).toLowerCase();
                    if (typeof value === "function") {
                        node._cleanup?.();
                        node.addEventListener(eventName, value);
                        node._cleanup = () =>
                            node.removeEventListener(eventName, value);
                    }
                } else if (typeof value === "function") {
                    if (node.tagName?.includes("-")) {
                        node._functionProps ||= {};
                        node._functionProps[name] = value;
                    } else {
                        effect(() => {
                            const val = value();
                            name === "value" || name === "checked" || name === "selected"
                                ? (node[name] = val)
                                : val == null || val === false
                                ? node.removeAttribute(name)
                                : node.setAttribute(name, val === true ? "" : val);
                        });
                    }
                } else {
                    name === "value" || name === "checked" || name === "selected"
                        ? (node[name] = value)
                        : value == null || value === false
                        ? void 0
                        : node.setAttribute(name, value === true ? "" : value);
                }
            }
            node.hasAttribute("key") && node.removeAttribute("key");
            for (let i = 0; i < node.childNodes.length; i++)
                processNode(node.childNodes[i]);
        }
    };

    for (let i = 0; i < content.childNodes.length; i++) {
        processNode(content.childNodes[i]);
    }

    parent.appendChild(content);
};

export { renderTemplate, html };
