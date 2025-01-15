import {
    removeChildNodesBetween,
    findCommentPlaceholders,
} from "../utils/dom.js";
import { evalExpr, isTemplateObject } from "./engine.js";

export function bindPlaceholderSignal(host, { signal, bindAttr, renderer }) {
    const [startNode, endNode] = findCommentPlaceholders(
        host.shadowRoot,
        bindAttr
    );
    if (!startNode || !endNode) return;

    host._bindSignalToElement(signal, (newVal) => {
        removeChildNodesBetween(startNode, endNode);
        renderer(startNode, endNode, newVal);
        // Re-bin events in the new DOM
        host._bindEventsInRange(startNode, endNode);
    });
}

export function handleSignalBinding({ host, type, signal, bindAttr }) {
    bindPlaceholderSignal(host, {
        signal,
        bindAttr,
        renderer: (startNode, endNode, newVal) => {
            const evaluated =
                type === "expression" ? evalExpr(() => newVal) : newVal;
            if (evaluated == null) return;

            const parentNode = endNode.parentNode;

            if (evaluated.type === "template-array") {
                const fragment = document.createDocumentFragment();
                evaluated.templates.forEach((item) => {
                    fragment.appendChild(
                        isTemplateObject(item)
                            ? item.template.cloneNode(true)
                            : document.createTextNode(String(item))
                    );
                });
                parentNode.insertBefore(fragment, endNode);
            } else {
                const node = isTemplateObject(evaluated)
                    ? evaluated.template.cloneNode(true)
                    : document.createTextNode(String(evaluated));
                parentNode.insertBefore(node, endNode);
            }
        },
    });
}

export function isSpecialAttr(name) {
    // Returns true if it is NOT a special attribute.
    return (
        name &&
        !name.startsWith("data-") &&
        !name.startsWith("@") &&
        name !== "ref" &&
        /^[a-zA-Z][\w\-_:]*$/.test(name)
    );
}
