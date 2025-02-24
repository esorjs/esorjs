import { bindEventsInRange } from "../dom-bindings";
import { batch } from "../hooks/signals";
import { ATTRIBUTES_NAMES_EVENTS } from "./engine";

export function reconcileArrays(
    startNode,
    endNode,
    oldItems = [],
    newItems = [],
    host
) {
    const oldArr = [...oldItems],
        newArr = [...newItems];
    const parent = endNode.parentNode;
    const currentNodes = collectNodes(startNode, endNode);
    const newNodes = createOrReuseNodes(newArr, currentNodes, oldArr);

    // Si las listas son idénticas, no hay nada que actualizar.
    if (
        oldArr.length === newArr.length &&
        oldArr.every((item, i) => item === newArr[i])
    )
        return;

    batch(() => {
        ddiff(parent, currentNodes, newNodes, endNode);
        bindEventsInRange(host, startNode, endNode);
        startNode.__oldItems = [...newArr];
    });
}

const collectNodes = (start, end) => {
    const nodes = [];
    for (
        let curr = start.nextSibling;
        curr && curr !== end;
        curr = curr.nextSibling
    ) {
        nodes.push(curr);
    }
    return nodes;
};

const isValidDOMNode = (node) => node && node.nodeType === Node.ELEMENT_NODE;

const getNodeKey = (node) =>
    isValidDOMNode(node) ? node.getAttribute("data-key") : null;

function updateNodeContent(oldNode, newNode, oldItem, newItem) {
    if (!oldNode || !newNode || !oldItem?.template || !newItem?.template)
        return false;
    if (oldNode.firstChild?.nodeType === 3) oldNode.normalize();
    if (newNode.firstChild?.nodeType === 3) newNode.normalize();

    const oldTextNodes = getTextNodes(oldNode);
    const newTextNodes = getTextNodes(newNode);
    if (oldTextNodes.length !== newTextNodes.length) return false;

    let updated = false;
    for (let i = 0, len = oldTextNodes.length; i < len; i++) {
        if (oldTextNodes[i].textContent !== newTextNodes[i].textContent) {
            oldTextNodes[i].textContent = newTextNodes[i].textContent;
            updated = true;
        }
    }
    return updated;
}

const getTextNodes = (node) => {
    const nodes = [];
    const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    let curr;
    while ((curr = walker.nextNode())) nodes.push(curr);
    return nodes;
};

function createOrReuseNodes(items, currentNodes, oldItems) {
    const nodeMap = new Map(),
        oldMap = new Map(),
        keys = [];
    currentNodes.forEach((n) => {
        const key = getNodeKey(n);
        if (key) nodeMap.set(key, n);
    });
    oldItems.forEach((item, i) => oldMap.set(getItemKey(item, i), item));
    items.forEach((item, i) => (keys[i] = getItemKey(item, i)));

    return items.map((item, i) => {
        const key = keys[i],
            existing = nodeMap.get(key),
            oldItem = oldMap.get(key);
        if (existing?.nodeType === 1) {
            if (!oldItem || hasChanged(oldItem, item)) {
                const newNode = createNode(item, key);
                // Si solo se requieren cambios en el contenido, actualizamos y copiamos los atributos de eventos.
                if (updateNodeContent(existing, newNode, oldItem, item)) {
                    copyEventAttributes(existing, newNode);
                    return existing;
                }
                return newNode;
            }
            return existing;
        }
        return createNode(item, key);
    });
}

function hasChanged(oldItem, newItem) {
    if (!oldItem || !newItem) return true;
    if (oldItem?.template && newItem?.template) {
        const oldVals = extractDynamicValues(oldItem),
            newVals = extractDynamicValues(newItem);
        return !areValuesEqual(oldVals, newVals);
    }
    return !areValuesEqual(oldItem, newItem);
}

function extractDynamicValues(item) {
    const { template } = item;
    if (!template) return null;
    const values = [],
        frag = template.cloneNode(true);
    const walker = document.createTreeWalker(
        frag,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
            acceptNode(node) {
                if (node.nodeType === 3)
                    return node.textContent.trim().length > 0
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP;
                return NodeFilter.FILTER_ACCEPT;
            },
        }
    );
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeType === 3) values.push(node.textContent);
        else {
            for (let i = 0, len = node.attributes.length; i < len; i++) {
                const attrVal = node.attributes[i].value;
                if (attrVal.includes("${")) values.push(attrVal);
            }
        }
    }
    return values;
}

function areValuesEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b))
        return (
            a.length === b.length && a.every((v, i) => areValuesEqual(v, b[i]))
        );
    if (typeof a === "object") {
        const keysA = Object.keys(a),
            keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((key) => areValuesEqual(a[key], b[key]));
    }
    return String(a) === String(b);
}

function copyEventAttributes(oldNode, newNode) {
    if (!isValidDOMNode(oldNode) || !isValidDOMNode(newNode)) return;
    for (let i = oldNode.attributes.length - 1; i >= 0; i--) {
        const attr = oldNode.attributes[i];
        if (attr.name.startsWith(ATTRIBUTES_NAMES_EVENTS))
            newNode.setAttribute(attr.name, attr.value);
    }
}

function getItemKey(item, index) {
    if (item?.key !== undefined) return `key-${item.key}`;
    if (item?.id) return `item-${item.id}`;
    if (item?.template) {
        const el = item.template.firstElementChild;
        if (el && el.hasAttribute("key")) return el.getAttribute("key");
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
    if (isValidDOMNode(node)) node.setAttribute("data-key", key);
    return node;
}

export const moveBefore = (parent, newNode, referenceNode) =>
    parent.insertBefore(newNode, referenceNode);

function ddiff(parent, current, newList, refNode) {
    let aStart = 0,
        aEnd = current.length,
        bStart = 0,
        bEnd = newList.length,
        after = aEnd > 0 ? current[aEnd - 1].nextSibling : refNode,
        map = null;

    if (!aEnd) {
        for (let i = 0; i < bEnd; i++) parent.insertBefore(newList[i], after);
        return;
    }
    if (!bEnd) {
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
            if (index == null) parent.removeChild(current[aStart++]);
            else if (bStart < index && index < bEnd) {
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
                } else
                    parent.replaceChild(newList[bStart++], current[aStart++]);
            } else aStart++;
        }
    }
}
