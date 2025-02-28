import { batch } from "../hooks/signals";
import { collectNodes } from "./helpers";

export function reconcileArrays(
    startNode,
    endNode,
    oldItems = [],
    newItems = []
) {
    const oldArr = [...oldItems],
        newArr = [...newItems];
    const parent = endNode.parentNode;
    const currentNodes = collectNodes(startNode, endNode);

    // Función auxiliar para determinar si las listas son iguales
    const arraysEqual = (a, b) =>
        a.length === b.length && a.every((item, i) => item === b[i]);

    if (arraysEqual(oldArr, newArr)) return;

    const newNodes = createOrReuseNodes(newArr, currentNodes, oldArr);

    batch(() => {
        ddiff(parent, currentNodes, newNodes, endNode);
        startNode.__oldItems = [...newArr];
    });
}

const isValidDOMNode = (node) => node && node.nodeType === Node.ELEMENT_NODE;

const getNodeKey = (node) =>
    isValidDOMNode(node) ? node.getAttribute("data-key") : null;

function createOrReuseNodes(items, currentNodes, oldItems) {
    const nodeMap = new Map(),
        oldMap = new Map(),
        keys = [];
    for (const n of currentNodes) {
        const key = getNodeKey(n);
        if (key) nodeMap.set(key, n);
    }

    for (let i = 0; i < oldItems.length; i++) {
        const key = getItemKey(oldItems[i], i);
        oldMap.set(key, oldItems[i]);
    }

    for (let i = 0; i < items.length; i++) {
        const key = getItemKey(items[i], i);
        keys[i] = key;
    }

    return items.map((item, i) => {
        const key = keys[i];
        return createNode(item, key);
    });
}

function getItemKey(item, index) {
    if (item && typeof item === "object") {
        // Prioridad: si existe "key", se utiliza (incluso si es null, según convenga)
        if ("key" in item) return `key-${item.key}`;
        // Si existe "id" y es un valor "truthy", se utiliza
        if (item.id) return `item-${item.id}`;
        // Si se provee un template, se extrae el key del primer elemento (si lo tiene)
        if (item.template) {
            const el = item.template.firstElementChild;
            return el && el.hasAttribute("key")
                ? el.getAttribute("key")
                : `template-${index}`;
        }
        // Si es un objeto sin key, id o template, se intenta serializar
        try {
            return `item-${index}-${JSON.stringify(item)}`;
        } catch {
            return `item-${index}`;
        }
    }
    // Fallback para valores primitivos o null/undefined
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
