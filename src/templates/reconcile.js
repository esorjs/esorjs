import { bindEventsInRange } from "../helpers";

export function reconcileArrays(startNode, endNode, oldItems, newItems, host) {
    oldItems = [...(oldItems || [])];
    newItems = [...(newItems || [])];
    const parent = endNode.parentNode;
    const currentNodes = collectDOMNodesBetween(startNode, endNode);
    const newNodeList = newItems.map((item, i) =>
        createItem(item, getItemKey(item, i))
    );
    ddiff(parent, currentNodes, newNodeList, endNode);
    bindEventsInRange(host, startNode, endNode);
    startNode.__oldItems = [...newItems];
}

function ddiff(parent, current, newList, refNode) {
    let as = 0,
        ae = current.length,
        bs = 0,
        be = newList.length;
    const ref = (ae && current[ae - 1].nextSibling) || refNode;
    while (as < ae && bs < be && current[as] === newList[bs]) {
        as++;
        bs++;
    }
    while (ae > as && be > bs && current[ae - 1] === newList[be - 1]) {
        ae--;
        be--;
    }
    let map = null;
    while (as < ae || bs < be) {
        if (ae === as) {
            const t =
                be < newList.length
                    ? bs
                        ? newList[bs - 1].nextSibling
                        : newList[be - bs]
                    : ref;
            while (bs < be) parent.insertBefore(newList[bs++], t);
        } else if (be === bs) {
            while (as < ae) parent.removeChild(current[as++]);
        } else if (
            current[as] === newList[be - 1] &&
            newList[bs] === current[ae - 1]
        ) {
            const t = current[--ae].nextSibling;
            parent.insertBefore(newList[bs++], current[as++].nextSibling);
            parent.insertBefore(newList[--be], t);
            current[ae] = newList[be];
        } else {
            map ||= new Map(newList.slice(bs, be).map((x, i) => [x, bs + i]));
            const i = map.get(current[as]);
            if (i == null) parent.removeChild(current[as++]);
            else if (bs < i && i < be) {
                let sq = 1,
                    x = as;
                while (++x < ae && x < be && map.get(current[x]) === i + sq)
                    sq++;
                if (sq > i - bs) {
                    const t = current[as];
                    while (bs < i) parent.insertBefore(newList[bs++], t);
                } else parent.replaceChild(newList[bs++], current[as++]);
            } else as++;
        }
    }
}

function collectDOMNodesBetween(s, e, c = []) {
    for (let n = s?.nextSibling; n && n !== e; n = n.nextSibling) c.push(n);
    return c;
}
function getItemKey(i, x) {
    return i?.key ?? i?.id ?? `index-${x}`;
}
function createItem(i, k) {
    if (i?.template) {
        const n =
            i.template.cloneNode(true).childNodes[0] ||
            document.createTextNode("");
        if (n.nodeType === 1 && k) n.setAttribute("data-key", k);
        return n;
    }
    return document.createTextNode(i ?? "");
}
