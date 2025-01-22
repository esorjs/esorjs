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

export const findCommentPlaceholders = (root, attr) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    let [s, e] = [null, null];
    while (w.nextNode() && !e) {
        const n = w.currentNode;
        if (!s && n.nodeValue === attr) s = n;
        else if (s && n.nodeValue === `//${attr}`) e = n;
    }
    return [s, e];
};

export function setupDeclarativeShadowRoot(host) {
    const supportsDeclarative =
        HTMLElement.prototype.hasOwnProperty("attachInternals");
    const internals = supportsDeclarative ? host.attachInternals() : null;

    if (internals?.shadowRoot) host.shadowRoot = internals.shadowRoot;
    else host.attachShadow({ mode: "open" });
}
