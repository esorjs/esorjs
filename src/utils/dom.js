/**
 * Marks a node to identify it as system-generated
 * @param {Node} node - The node to be marked
 * @returns {Node} The same node, allowing for chaining
 */

export function markNode(node) {
    if (node) node.__nodeGroups = true;
    return node;
}

/**
 * Creates a DocumentFragment from an array of nodes, marking each node
 * to identify it as system-generated.
 * @param {Array<Node>} nodes - Nodes to include in the fragment.
 * @returns {DocumentFragment} The created DocumentFragment containing the marked nodes.
 */
export function markedFragment(nodes) {
    return createFragment(nodes, markNode);
}

/**
 * Creates a DocumentFragment from an array of nodes, optionally processing each node with a function.
 * @param {Array<Node>} nodes - Nodes to include in the fragment.
 * @param {Function} [fn=null] - Optional function to process each node. The function takes the node and the fragment as parameters and returns a processed node.
 * @param {Node} [parent=null] - Optional parent node to append the fragment to.
 * @returns {DocumentFragment} The created DocumentFragment containing the nodes.
 */
export function createFragment(nodes, fn = null, parent = null) {
    const frag = document.createDocumentFragment();
    if (!nodes?.length) return frag;
    for (let node of nodes) {
        if (!node) continue;
        node = typeof fn === "function" ? fn(node, frag) : node;
        Array.isArray(node)
            ? frag.appendChild(createFragment(node, fn))
            : frag.appendChild(node);
    }
    if (parent && frag.childNodes.length) parent.appendChild(frag);
    return frag;
}
