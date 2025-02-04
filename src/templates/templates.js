import { bindSignalToElement } from "../helpers";
import {
    removeChildNodesBetween,
    findCommentPlaceholders,
    getDocumentFragment,
} from "../utils/dom";
import { evalExpr, isTemplateObject } from "./engine";
import { reconcileArrays } from "./reconcile";

const cache = new Map();

export function cachedTemplate(key, fragmentOrTemplate) {
    const content = getDocumentFragment(fragmentOrTemplate);
    if (!cache.has(key)) cache.set(key, content.cloneNode(true));
    return cache.get(key).cloneNode(true);
}

export function bindPlaceholderSignal(host, { signal, bindAttr, renderer }) {
    const [startNode, endNode] = findCommentPlaceholders(
        host.shadowRoot,
        bindAttr
    );
    if (!startNode || !endNode) return;
    bindSignalToElement(host, signal, (newVal) =>
        renderer(startNode, endNode, newVal)
    );
}

export function handleSignalBinding({ host, type, signal, bindAttr }) {
    bindPlaceholderSignal(host, {
        signal,
        bindAttr,
        renderer: (start, end, val) => {
            const evaluated = type === "expression" ? evalExpr(() => val) : val;
            if (evaluated != null) renderEvaluated(host, start, end, evaluated);
        },
    });
}

function renderEvaluated(host, start, end, val) {
    if (Array.isArray(val) && val.some(isTemplateObject)) {
        reconcileArrays(start, end, start.__oldItems || [], val, host);
        return;
    }

    let current = start.nextSibling;
    if (current && current.nodeType === Node.TEXT_NODE) {
        current.textContent = String(val);
    } else {
        removeChildNodesBetween(start, end);
        const textNode = document.createTextNode(String(val));
        end.parentNode.insertBefore(textNode, end);
    }
}

export const specialAttr = (n) =>
    n && !/^(data-|@|ref|key$)/.test(n) && /^[a-z][\w\-_:]*$/i.test(n);
