/**
 * Creates a DocumentFragment from an array of nodes, with optional marking and parent appending.
 * @param {Array<Node>} nodes - Nodes to include in the fragment.
 * @param {Object} [options=null] - Optional configuration object.
 * @param {boolean} [options.mark=false] - If true, marks each node as system-generated.
 * @param {Node} [options.parent=null] - Optional parent node to append the fragment to.
 * @returns {DocumentFragment} The created DocumentFragment containing the nodes.
 */

export function createFragment(nodes, options = null) {
    const frag = document.createDocumentFragment();
    if (!nodes?.length) return frag;

    let shouldMark = false;
    let parent = null;

    if (options && typeof options === "object") {
        // If options is an object, extract properties
        shouldMark = !!options.mark;
        parent = options.parent || null;
    }

    for (let node of nodes) {
        if (!node) continue;

        // Mark if needed
        if (shouldMark && node) node.__nodeGroups = true;

        // Handle array or single node
        Array.isArray(node)
            ? frag.appendChild(createFragment(node, options))
            : frag.appendChild(node);
    }

    // Append to parent if specified
    if (parent && frag.childNodes.length) parent.appendChild(frag);

    return frag;
}
