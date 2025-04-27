import { createFragment } from "../utils/dom.js";

/**
 * Reconciles DOM nodes by comparing new node groups with previous ones and updating the DOM accordingly.
 *
 * This function efficiently updates the DOM structure to reflect changes in data by removing, reusing, or
 * inserting nodes as needed. It uses a marker node to determine where updates should occur and maintains
 * the order and integrity of node groups.
 *
 * @param {Array<Node|Array<Node>>} newGroupsData - An array of new node groups, where each group can be a single node or an array of nodes.
 * @param {Node} markerNode - A marker node that acts as a reference point for DOM updates.
 *
 * If the new data is empty, all existing nodes are removed. Otherwise, nodes are updated based on a key
 * derived from the node's attributes or index. Nodes that are no longer present are removed, and new nodes
 * are inserted. The function also handles moving nodes to maintain the correct order.
 */
export function reconcile(newGroupsData, markerNode) {
    if (!markerNode?.parentNode) return;
    const parent = markerNode.parentNode;

    const prevGroups = markerNode._marker || [];
    if (!newGroupsData?.length) {
        for (const g of prevGroups)
            g.nodes.forEach((n) => n?.parentNode?.removeChild(n));
        markerNode._marker = [];
        return;
    }

    const prevMap = new Map(prevGroups.map((g) => [g.key, g]));
    const newGroups = newGroupsData.map((nodes, i) => {
        nodes = Array.isArray(nodes) ? nodes.filter(Boolean) : [nodes];
        const key =
            nodes.find((n) => n?.getAttribute?.("key"))?.getAttribute("key") ||
            `__index_${i}`;
        return { key, nodes };
    });
    const newMap = new Map(newGroups.map((g) => [g.key, g]));

    for (const g of prevGroups)
        if (!newMap.has(g.key))
            g.nodes.forEach((n) => n?.parentNode?.removeChild(n));

    let lastNode = markerNode;
    for (const newGroup of newGroups) {
        const prevGroup = prevMap.get(newGroup.key);

        if (prevGroup) {
            patchNodes(prevGroup.nodes, newGroup.nodes, parent);
            if (prevGroup.nodes[0] !== lastNode.nextSibling) {
                parent.insertBefore(
                    createFragment(prevGroup.nodes),
                    lastNode.nextSibling
                );
            }
            newGroup.nodes = prevGroup.nodes;
        } else {
            parent.insertBefore(
                createFragment(newGroup.nodes, { mark: true }),
                lastNode.nextSibling
            );
        }
        lastNode = newGroup.nodes[newGroup.nodes.length - 1] || lastNode;
    }
    markerNode._marker = newGroups;
}

/**
 * Patches the DOM nodes by comparing a list of previous nodes with a list of next nodes,
 * updating the parent DOM element accordingly. This function handles node addition, removal,
 * replacement, and updates for both element and text nodes.
 *
 * - If a node exists in the next list but not in the previous, it gets appended to the parent.
 * - If a node exists in the previous list but not in the next, it gets removed from the parent.
 * - If both nodes exist, but differ in type or tag, the previous node is replaced with the next.
 * - If both nodes are text nodes, their values are compared and updated if necessary.
 * - For element nodes, attributes are patched and child nodes are recursively patched.
 *
 * @param {Array<Node>} prevNodes - The array of previous nodes.
 * @param {Array<Node>} nextNodes - The array of nodes to update to.
 * @param {Node} parent - The parent node to which updates are applied.
 */
function patchNodes(prevNodes, nextNodes, parent) {
    for (let i = 0; i < Math.max(prevNodes.length, nextNodes.length); i++) {
        const p = prevNodes[i],
            n = nextNodes[i];
        if (!p && n) parent.appendChild(n);
        else if (p && !n) {
            p._cleanup?.();
            parent.removeChild(p);
        } else if (p && n) {
            if (p.nodeType !== n.nodeType || p.tagName !== n.tagName) {
                parent.replaceChild(n, p);
            } else if (p.nodeType === 3) {
                if (p.nodeValue !== n.nodeValue) p.nodeValue = n.nodeValue;
            } else if (p.nodeType === 1) {
                patchAttributes(p, n);
                patchNodes([...p.childNodes], [...n.childNodes], p);
            }
        }
    }
}

/**
 * Patches the attributes of a DOM element by comparing the existing attributes with the
 * ones of another element. Updates the element's attributes by setting or removing them as
 * necessary. This function is used by the `patchNodes` function to update the attributes
 * of elements.
 *
 * @param {Element} p - The element to patch.
 * @param {Element} next - The element from which to copy the attributes.
 */
function patchAttributes(p, next) {
    const seen = new Set();
    for (const { name, value } of next.attributes) {
        if (p.getAttribute(name) !== value) p.setAttribute(name, value);
        seen.add(name);
    }
    for (const { name } of p.attributes)
        if (!seen.has(name)) p.removeAttribute(name);
}
