import { markedFragment } from "../utils/dom";

/**
 * Reconciles the DOM nodes by comparing new node groups with previous ones and updating the DOM accordingly.
 * This function efficiently updates the DOM by removing, adding, or reordering nodes based on a diff between
 * the current and new data. It ensures that the DOM reflects the changes in the data structure.
 *
 * @param {Array<Node|Array<Node>>} newGroupsData - An array of new node groups, where each group can be a single node or an array of nodes.
 * @param {Node} markerNode - A marker node used to determine the insertion point for new nodes in the DOM.
 *
 * Removes nodes that are no longer present in the new data, reuses nodes that haven't changed, and inserts new nodes
 * as needed. Handles cleanup by calling a _cleanup function on nodes if it exists before removing them.
 * Updates the internal __nodeGroups property of the marker node to reference the new groups.
 * Throws an error if the new data is invalid or if DOM operations fail.
 */

export function reconcile(newGroupsData, markerNode) {
    if (!newGroupsData || !markerNode || !markerNode.parentNode) return;

    const parent = markerNode.parentNode;

    const removeNodes = (nodes) => {
        for (const n of nodes) {
            if (!n || n.parentNode !== parent) continue;
            if (n._cleanup && typeof n._cleanup === "function") n._cleanup();
            parent.removeChild(n);
        }
    };

    const nodesChanged = (p, c) =>
        p.length !== c.length || p.some((n, i) => !n.isEqualNode(c[i]));

    const prevGroups = markerNode.__nodeGroups || [];
    const prevMap = new Map(prevGroups.map((g) => [g.key, g]));

    const newGroups = newGroupsData.map((nodes, idx) => {
        const group = Array.isArray(nodes) ? nodes.filter(Boolean) : [nodes];

        const keyNode = group.find((n) => n?.getAttribute?.("key") != null);
        const key = keyNode?.getAttribute("key") || `__key_${idx}`;
        return { key, nodes: group };
    });

    const newMap = new Map(newGroups.map((g) => [g.key, g]));

    for (const g of prevGroups) !newMap.has(g.key) && removeNodes(g.nodes); // Remove groups that no longer exist in the new list.

    let lastNode = markerNode;
    for (const newGroup of newGroups) {
        const prevGroup = prevMap.get(newGroup.key);

        if (prevGroup) {
            if (nodesChanged(prevGroup.nodes, newGroup.nodes)) {
                //[UPDATE]
                removeNodes(prevGroup.nodes);
                parent.insertBefore(
                    markedFragment(newGroup.nodes),
                    lastNode.nextSibling
                );
            } else {
                //  [KEEP/MOVE]
                const refNode = lastNode.nextSibling;
                if (prevGroup.nodes[0] !== refNode) {
                    const frag = document.createDocumentFragment();
                    for (const n of prevGroup.nodes) frag.appendChild(n);
                    parent.insertBefore(frag, refNode);
                }
                newGroup.nodes = prevGroup.nodes; // Reuse nodes
            }
        } else {
            // [ADD]
            parent.insertBefore(
                markedFragment(newGroup.nodes),
                lastNode.nextSibling
            );
        }

        lastNode = newGroup.nodes[newGroup.nodes.length - 1] || lastNode; // Update lastNode
    }

    markerNode.__nodeGroups = newGroups; // Update internal reference
}
