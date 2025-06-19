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

const renderValue = (parent, value) => {
    if (
        Array.isArray(value) &&
        value.length > 0 &&
        value[0]?._key !== undefined
    ) {
        reconcileArray(parent, value);
        return;
    }

    while (parent.firstChild) parent.removeChild(parent.firstChild);

    if (value == null || value === false) return;
    if (value._isTemplate) renderTemplate(parent, value);
    else if (Array.isArray(value)) {
        value.forEach((item) => {
            const tempContainer = document.createDocumentFragment();
            renderValue(tempContainer, item);
            parent.appendChild(tempContainer);
        });
    } else if (value instanceof Node) parent.appendChild(value);
    else parent.appendChild(document.createTextNode(String(value)));
};

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
                    } else renderValue(fragment, value);
                }
                parts[i] &&
                    fragment.appendChild(document.createTextNode(parts[i]));
            }
            node.parentNode.replaceChild(fragment, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const attrs = [...node.attributes].filter(
                (attr) => attr.name !== "key" && attr.value === MARKER
            );

            attrs.forEach((attr) => {
                const value = values[valueIndex++];
                node.removeAttribute(attr.name);

                if (attr.name === "ref") {
                    typeof value === "function"
                        ? value(node)
                        : (value.current = node);
                } else if (
                    attr.name === "style" &&
                    typeof value === "object" &&
                    value !== null
                ) {
                    typeof value === "function"
                        ? effect(() => Object.assign(node.style, value()))
                        : Object.assign(node.style, value);
                } else if (
                    typeof value === "function" &&
                    node.tagName?.includes("-")
                ) {
                    node._functionProps ||= {};
                    node._functionProps[attr.name] = value;
                } else if (attr.name.startsWith("on")) {
                    const eventName = attr.name.slice(2).toLowerCase();
                    if (typeof value === "function") {
                        node.addEventListener(eventName, value);
                        node._cleanup = () =>
                            node.removeEventListener(eventName, value);
                    }
                } else {
                    const setAttribute = (val) => {
                        if (
                            ["value", "checked", "selected"].includes(attr.name)
                        )
                            node[attr.name] = val;
                        else if (val == null || val === false)
                            node.removeAttribute(attr.name);
                        else
                            node.setAttribute(
                                attr.name,
                                val === true ? "" : val
                            );
                    };

                    typeof value === "function"
                        ? effect(() => setAttribute(value()))
                        : setAttribute(value);
                }
            });

            node.hasAttribute("key") && node.removeAttribute("key");

            [...node.childNodes].forEach(processNode);
        }
    };

    [...content.childNodes].forEach(processNode);
    parent.appendChild(content);
};

export { renderTemplate, html };
