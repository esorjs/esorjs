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
