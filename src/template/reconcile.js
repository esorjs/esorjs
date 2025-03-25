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

        /**
         * Removes nodes from the parent.
         * @param {Array<Node>} nodes - Nodes to be removed.
         */
        const removeNodes = (nodes) => {
            for (const node of nodes) {
                if (!node || node.parentNode !== parent) continue;
                if (node._cleanup) node._cleanup();
                parent.removeChild(node);
            }
        };

        const prevGroups = markerNode.__nodeGroups || [];
        const prevMap = new Map(prevGroups.map((g) => [g.key, g]));
        const newGroups = newGroupsData.map((nodes, idx) => {
            const group = Array.isArray(nodes)
                ? nodes.filter(Boolean)
                : [nodes];
            const keyNode = group.find((n) => n?.getAttribute?.("key") != null);
            const key = keyNode ? keyNode.getAttribute("key") : `__key_${idx}`;
            const state = group.map((n) => n?.outerHTML || "").join("|");
            return { key, nodes: group, state };
        });

        const newMap = new Map(newGroups.map((g) => [g.key, g]));

        for (const g of prevGroups) !newMap.has(g.key) && removeNodes(g.nodes); // Remove groups that no longer exist in the new list.

        let lastNode = markerNode;
        for (const newGroup of newGroups) {
            const prevGroup = prevMap.get(newGroup.key);
            if (prevGroup) {
                // [UPDATE]
                if (prevGroup.state !== newGroup.state) {
                    removeNodes(prevGroup.nodes);
                    parent.insertBefore(
                        markedFragment(newGroup.nodes),
                        lastNode.nextSibling
                    );
                } else {
                    // [KEEP/MOVE]
                    const firstNode = prevGroup.nodes[0];
                    if (firstNode !== lastNode.nextSibling) {
                        const fragment = document.createDocumentFragment();
                        for (const node of prevGroup.nodes)
                            fragment.appendChild(node);
                        parent.insertBefore(fragment, lastNode.nextSibling);
                    }

                    newGroup.nodes = prevGroup.nodes; // Reuse nodes to avoid recreation
                }
            } else {
                // [ADD]
                parent.insertBefore(
                    markedFragment(newGroup.nodes),
                    lastNode.nextSibling
                );
            }

            lastNode = newGroup.nodes[newGroup.nodes.length - 1] || lastNode;
        }

        markerNode.__nodeGroups = newGroups; // Update internal reference
    }, "list.reconcile");
}
