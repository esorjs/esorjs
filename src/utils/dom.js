/**
 * Creates a DocumentFragment from an array of nodes, with optional marking and parent appending.
 *
 * @param {Array<Node>} nodes - Nodes to include in the fragment.
 * @param {Object} [options=null] - Optional configuration object.
 * @param {boolean} [options.mark=false] - If true, marks each node as system-generated.
 * @param {Node} [options.parent=null] - Optional parent node to append the fragment to.
 * @returns {DocumentFragment} The created DocumentFragment containing the nodes.
 */

export function createFragment(nodes, { mark = false, parent = null } = {}) {
    const frag = document.createDocumentFragment();
    if (!nodes?.length) return frag;

    for (const node of nodes) {
        if (!node) continue;
        if (mark && node) node.__nodeGroups = true;

        Array.isArray(node)
            ? frag.appendChild(createFragment(node, { mark }))
            : frag.appendChild(node);
    }

    if (parent && frag.childNodes.length) parent.appendChild(frag);

    return frag;
}
