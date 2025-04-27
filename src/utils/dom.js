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
        if (mark) node._marker = true;

        frag.appendChild(
            Array.isArray(node) ? createFragment(node, { mark }) : node
        );
    }

    if (parent && frag.childNodes.length) parent.appendChild(frag);
    return frag;
}

/**
 * Joins the keys of an object whose values are truthy in a space-separated string.
 *
 * @param {Object} obj - Object key pairs object: value.
 * @returns {string} - Space-separated string of keys.
 */
export function joinTruthy(obj) {
    return Object.keys(obj)
        .reduce((str, key) => (obj[key] ? str + key + " " : str), "")
        .trim();
}
