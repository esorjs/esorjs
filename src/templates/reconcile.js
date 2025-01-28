import { bindEventsInRange } from "../helpers";

export function reconcileArrays(startNode, endNode, oldItems, newItems, host) {
    oldItems = [...(oldItems || [])];
    newItems = [...(newItems || [])];

    const parent = endNode.parentNode;
    const currentNodes = collectNodes(startNode, endNode);
    const newNodes = createOrReuseNodes(newItems, currentNodes, oldItems);

    ddiff(parent, currentNodes, newNodes, endNode);
    bindEventsInRange(host, startNode, endNode);
    startNode.__oldItems = [...newItems];
}

function collectNodes(start, end) {
    const nodes = [];
    let current = start.nextSibling;
    while (current && current !== end) {
        nodes.push(current);
        current = current.nextSibling;
    }
    return nodes;
}

function isValidDOMNode(node) {
    return node && node.nodeType === Node.ELEMENT_NODE;
}

function getNodeKey(node) {
    if (!isValidDOMNode(node)) return null;
    return node.getAttribute("data-key");
}

function updateNodeContent(oldNode, newNode, oldItem, newItem) {
    if (!oldNode || !newNode || !oldItem || !newItem) return false;

    if (oldItem.template && newItem.template) {
        const oldTextNodes = getTextNodes(oldNode);
        const newTextNodes = getTextNodes(newNode);

        let updated = false;
        oldTextNodes.forEach((textNode, index) => {
            const newTextNode = newTextNodes[index];
            if (
                newTextNode &&
                textNode.textContent !== newTextNode.textContent
            ) {
                textNode.textContent = newTextNode.textContent;
                updated = true;
            }
        });

        return updated;
    }

    return false;
}

function getTextNodes(node) {
    const textNodes = [];
    const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
        textNodes.push(currentNode);
    }

    return textNodes;
}

function createOrReuseNodes(items, currentNodes, oldItems) {
    const nodeMap = new Map();
    const oldItemsMap = new Map();

    currentNodes.forEach((node) => {
        const key = getNodeKey(node);
        if (key) nodeMap.set(key, node);
    });

    oldItems.forEach((item, index) => {
        const key = getItemKey(item, index);
        oldItemsMap.set(key, item);
    });

    return items.map((item, index) => {
        const key = getItemKey(item, index);
        const existingNode = nodeMap.get(key);
        const oldItem = oldItemsMap.get(key);

        if (existingNode && isValidDOMNode(existingNode)) {
            if (hasChanged(oldItem, item)) {
                const newNode = createNode(item, key);

                if (!updateNodeContent(existingNode, newNode, oldItem, item)) {
                    copyEventAttributes(existingNode, newNode);
                    return newNode;
                }

                return existingNode;
            }
            return existingNode;
        }

        return createNode(item, key);
    });
}

function hasChanged(oldItem, newItem) {
    if (!oldItem || !newItem) return true;

    if (oldItem?.template && newItem?.template) {
        const oldValues = extractDynamicValues(oldItem);
        const newValues = extractDynamicValues(newItem);
        return !areValuesEqual(oldValues, newValues);
    }

    return !areValuesEqual(oldItem, newItem);
}

function extractDynamicValues(item) {
    if (!item?.template) return null;

    const values = [];
    const fragment = item.template.cloneNode(true);
    const walker = document.createTreeWalker(
        fragment,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        null,
        false
    );

    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            values.push(node.textContent);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.attributes).forEach((attr) => {
                if (attr.value.includes("${")) {
                    values.push(attr.value);
                }
            });
        }
    }

    return values;
}

function areValuesEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        return (
            a.length === b.length &&
            a.every((val, idx) => areValuesEqual(val, b[idx]))
        );
    }

    if (typeof a === "object") {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        return keysA.every((key) => areValuesEqual(a[key], b[key]));
    }

    return String(a) === String(b);
}

function copyEventAttributes(oldNode, newNode) {
    if (!isValidDOMNode(oldNode) || !isValidDOMNode(newNode)) return;

    Array.from(oldNode.attributes).forEach((attr) => {
        if (attr.name.startsWith("data-event-")) {
            newNode.setAttribute(attr.name, attr.value);
        }
    });
}

function getItemKey(item, index) {
    if (item?.template) {
        const el = item.template.firstElementChild;
        if (item.id) return `item-${item.id}`;
        if (el && isValidDOMNode(el)) {
            const keyAttr = el.getAttribute("key");
            if (keyAttr) return keyAttr;
        }
        return `template-${index}`;
    }

    if (item && typeof item === "object") {
        if (item.id) return `item-${item.id}`;
        try {
            return `item-${index}-${JSON.stringify(item)}`;
        } catch {
            return `item-${index}`;
        }
    }

    return `item-${index}-${String(item)}`;
}

function createNode(item, key) {
    let node;

    if (item?.template) {
        const content = item.template.cloneNode(true);
        node = content.firstElementChild || document.createElement("div");
    } else {
        node = document.createElement("div");
        node.textContent = String(item);
    }

    if (isValidDOMNode(node)) {
        node.setAttribute("data-key", key);
    }

    return node;
}

function ddiff(parent, current, newList, refNode) {
    let aStart = 0,
        aEnd = current.length,
        bStart = 0,
        bEnd = newList.length,
        after = (aEnd > 0 && current[aEnd - 1].nextSibling) || refNode,
        map = null;

    if (aEnd === 0) {
        for (let i = 0; i < bEnd; i++) parent.insertBefore(newList[i], after);
        return;
    }
    if (bEnd === 0) {
        while (aStart < aEnd) parent.removeChild(current[aStart++]);
        return;
    }

    while (aStart < aEnd || bStart < bEnd) {
        if (current[aStart] === newList[bStart]) {
            aStart++;
            bStart++;
            continue;
        }

        while (current[aEnd - 1] === newList[bEnd - 1]) {
            aEnd--;
            bEnd--;
        }

        if (aStart === aEnd) {
            const node =
                bEnd < newList.length
                    ? bStart
                        ? newList[bStart - 1].nextSibling
                        : newList[bEnd - bStart]
                    : after;
            while (bStart < bEnd) parent.insertBefore(newList[bStart++], node);
        } else if (bStart === bEnd) {
            while (aStart < aEnd) {
                if (!map || !map.has(current[aStart]))
                    parent.removeChild(current[aStart]);
                aStart++;
            }
        } else if (
            current[aStart] === newList[bEnd - 1] &&
            newList[bStart] === current[aEnd - 1]
        ) {
            const node = current[--aEnd].nextSibling;
            parent.insertBefore(
                newList[bStart++],
                current[aStart++].nextSibling
            );
            parent.insertBefore(newList[--bEnd], node);
            current[aEnd] = newList[bEnd];
        } else {
            if (!map) {
                map = new Map();
                for (let i = bStart; i < bEnd; i++) map.set(newList[i], i);
            }
            const index = map.get(current[aStart]);
            if (index == null) {
                parent.removeChild(current[aStart++]);
            } else if (bStart < index && index < bEnd) {
                let sequence = 1;
                while (
                    aStart + sequence < aEnd &&
                    index + sequence < bEnd &&
                    current[aStart + sequence] === newList[index + sequence]
                )
                    sequence++;
                if (sequence > index - bStart) {
                    const node = current[aStart];
                    while (bStart < index)
                        parent.insertBefore(newList[bStart++], node);
                } else {
                    parent.replaceChild(newList[bStart++], current[aStart++]);
                }
            } else aStart++;
        }
    }
}
