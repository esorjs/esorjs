import {
    ATTRIBUTES_NAMES_BIND,
    ATTRIBUTES_NAMES_EVENTS,
    ATTRIBUTES_NAMES_REFS,
} from "../templates/engine";

export function valuesChanged(val1, val2) {
    return !Object.is(val1, val2);
}

export const getDocumentFragment = (e) =>
    (e instanceof DocumentFragment && e) ||
    e?.content?.cloneNode() ||
    document.createDocumentFragment();

export function removeChildNodesBetween(startNode, endNode) {
    let node = startNode.nextSibling;
    while (node && node !== endNode) {
        const next = node.nextSibling;
        node.parentNode.removeChild(node);
        node = next;
    }
}

let placeholderCache = new WeakMap();

export function findCommentPlaceholders(root, attr) {
    if (placeholderCache.has(root)) {
        const cached = placeholderCache.get(root)[attr];
        if (cached) return cached;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    let start = null,
        end = null;
    while (walker.nextNode() && !end) {
        const current = walker.currentNode;
        if (!start && current.nodeValue === attr) start = current;
        else if (start && current.nodeValue === `//${attr}`) end = current;
    }

    const result = [start, end];
    placeholderCache.set(root, {
        ...placeholderCache.get(root),
        [attr]: result,
    });
    return result;
}

export function setupDeclarativeShadowRoot(host) {
    const supportsDeclarative =
        HTMLElement.prototype.hasOwnProperty("attachInternals");
    const internals = supportsDeclarative ? host.attachInternals() : null;

    if (internals?.shadowRoot) host.shadowRoot = internals.shadowRoot;
    else host.attachShadow({ mode: "open" });
}

export function findAttributesWithEsorDirectives(
    root,
    prefixes = [
        ATTRIBUTES_NAMES_REFS,
        ATTRIBUTES_NAMES_EVENTS,
        ATTRIBUTES_NAMES_BIND,
    ]
) {
    const found = {};
    const iterator = document.createNodeIterator(
        root,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode(node) {
                if (node.hasAttributes()) {
                    for (const { name } of node.attributes) {
                        if (prefixes.some((prefix) => name.startsWith(prefix)))
                            return NodeFilter.FILTER_ACCEPT;
                    }
                }
                return NodeFilter.FILTER_SKIP;
            },
        }
    );

    let node;
    while ((node = iterator.nextNode())) {
        for (const attribute of node.attributes) {
            const matchingPrefix = prefixes.find((prefix) =>
                attribute.name.startsWith(prefix)
            );
            if (matchingPrefix) {
                // Se crea el array solo en caso de encontrar el prefijo
                if (!found[matchingPrefix]) {
                    found[matchingPrefix] = [];
                }
                found[matchingPrefix].push(attribute);
            }
        }
    }

    return Object.keys(found).length ? found : null;
}
