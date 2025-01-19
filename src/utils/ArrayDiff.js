import { isTemplateObject } from "../templates/engine";

export const ARRAY_OP = {
    KEEP: "KEEP", // The element did not change
    ADD: "ADD", // New element
    REMOVE: "REMOVE", // Element removed
    UPDATE: "UPDATE", // Modified element
    MOVE: "MOVE", // Element moved
};

export function getItemKey(item, index) {
    if (item && typeof item === "object") {
        if ("key" in item) return item.key;
        if ("id" in item) return item.id;
    }
    return `index-${index}`;
}

export function createKeyMap(items) {
    return items.reduce((map, item, index) => {
        map.set(getItemKey(item, index), index);
        return map;
    }, new Map());
}

export function calculateArrayDiff(oldItems, newItems) {
    const operations = [];
    const oldKeyMap = createKeyMap(oldItems);
     const processedKeys = new Set();

    // Detect added and updated elements
    newItems.forEach((newItem, newIndex) => {
        const key = getItemKey(newItem, newIndex);
        const oldIndex = oldKeyMap.get(key);

        if (oldIndex === undefined) {
            operations.push({
                type: ARRAY_OP.ADD,
                item: newItem,
                index: newIndex,
            });
        } else {
            processedKeys.add(key);
            if (oldIndex !== newIndex) {
                operations.push({
                    type: ARRAY_OP.MOVE,
                    fromIndex: oldIndex,
                    toIndex: newIndex,
                    item: newItem,
                });
            } else if (!Object.is(oldItems[oldIndex], newItem)) {
                operations.push({
                    type: ARRAY_OP.UPDATE,
                    index: newIndex,
                    item: newItem,
                });
            } else {
                operations.push({
                    type: ARRAY_OP.KEEP,
                    index: newIndex,
                    item: newItem,
                });
            }
        }
    });

    // Detect deleted items
    oldItems.forEach((oldItem, oldIndex) => {
        const key = getItemKey(oldItem, oldIndex);
        if (!processedKeys.has(key)) {
            operations.push({
                type: ARRAY_OP.REMOVE,
                index: oldIndex,
            });
        }
    });

    return operations;
}

export function createElementFromItem(item) {
    if (isTemplateObject(item)) {
        const fragment = item.template.cloneNode(true);
        if (fragment.childNodes.length === 1) {
            return fragment.firstChild;
        }
        const wrapper = document.createElement("div");
        wrapper.appendChild(fragment);
        return wrapper;
    }
    return document.createTextNode(String(item ?? ""));
}

export function applyArrayDiff(operations, startNode, endNode, host) {
    const container = endNode.parentNode;
    const nodeMap = new Map();
    const existingNodes = [];

    let currentNode = startNode.nextSibling;
    let index = 0;

    while (currentNode && currentNode !== endNode) {
        existingNodes.push(currentNode);
        nodeMap.set(index, currentNode);
        index++;
        currentNode = currentNode.nextSibling;
    }

    // Order operations (removals first)
    operations.sort((a, b) => {
        if (a.type === "REMOVE" && b.type !== "REMOVE") return -1;
        if (b.type === "REMOVE" && a.type !== "REMOVE") return 1;
        return a.index - b.index;
    });

    const fragment = document.createDocumentFragment();
    const newNodes = new Map();

    operations.forEach((op) => {
        switch (op.type) {
            case "ADD": {
                const newNode = createElementFromItem(op.item);
                newNodes.set(op.index, newNode);
                fragment.appendChild(newNode);
                break;
            }
            case "KEEP": {
                const node = nodeMap.get(op.index);
                if (node) {
                    newNodes.set(op.index, node);
                    fragment.appendChild(node);
                }
                break;
            }
            case "UPDATE": {
                const newNode = createElementFromItem(op.item);
                newNodes.set(op.index, newNode);
                fragment.appendChild(newNode);
                break;
            }
            case "MOVE": {
                const node = nodeMap.get(op.fromIndex);
                if (node) {
                    newNodes.set(op.toIndex, node);
                    fragment.appendChild(node);
                }
                break;
            }
        }
    });

    // Clean existing nodes
    existingNodes.forEach((node) => {
        if (node.parentNode === container) {
            container.removeChild(node);
        }
    });

    // Insert fragment with new nodes
    container.insertBefore(fragment, endNode);
    host._bindEventsInRange(startNode, endNode);
}

/**
 * Main rendering function with diff
 */
export function renderArrayDiff(startNode, endNode, oldItems, newItems, host) {
    if (!Array.isArray(oldItems)) oldItems = [];
    if (!Array.isArray(newItems)) newItems = [];

    const diff = calculateArrayDiff(oldItems, newItems);
    applyArrayDiff(diff, startNode, endNode, host);
    startNode.__oldItems = [...newItems];
}