import { markedFragment } from "../utils/dom";
import { tryCatch } from "../utils/error";

/**
 * Reconciles the DOM nodes in a list by diffing the new data with the previous data.
 * This function is optimized for performance and should be used when the list data
 * is changed.
 * @param {Array<Node|Array<Node>>} newGroupsData - New list of nodes or arrays of nodes.
 * @param {Node} markerNode - Marker node to position the new nodes.
 * @throws {Error} If the new data is not an array or if any of the nodes are not DOM nodes.
 */
export function reconcile(newGroupsData, markerNode) {
    if (!newGroupsData || !markerNode || !markerNode.parentNode) return;

    tryCatch(() => {
        const parent = markerNode.parentNode;

        const removeNodes = (nodes) => {
            for (const n of nodes) {
                if (!n || n.parentNode !== parent) continue;
                if (n._cleanup && typeof n._cleanup === "function")
                    n._cleanup();
                parent.removeChild(n);
            }
        };

        const nodesChanged = (p, c) =>
            p.length !== c.length || p.some((n, i) => !n.isEqualNode(c[i]));

        const prevGroups = markerNode.__nodeGroups || [];
        const prevMap = new Map(prevGroups.map((g) => [g.key, g]));

        const newGroups = newGroupsData.map((nodes, idx) => {
            const group = Array.isArray(nodes)
                ? nodes.filter(Boolean)
                : [nodes];

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
    }, "list.reconcile");
}
