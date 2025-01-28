import STATE, { withCurrentComponent } from "./globals";
import { handleSignalBinding } from "./templates/templates";
import { findCommentPlaceholders } from "./utils/dom";
import { reconcileArrays } from "./templates/reconcile";
import { useEffect } from "./hooks/effects";

export function bindSignalToElement(instance, signal, updateFn) {
    const effect = useEffect(() => {
        if (instance._isUpdating) return;
        instance._isUpdating = true;
        try {
            updateFn(signal());
        } finally {
            instance._isUpdating = false;
        }
    });
    instance._cleanup.add(effect);
}

export function bindEventsInRange(instance, startNode, endNode) {
    const { shadowRoot } = instance;
    const elements = getElementsInRange(shadowRoot, startNode, endNode);
    bindEvents(instance, elements);
}

export function getElementsInRange(shadowRoot, startNode, endNode) {
    const elements = [];
    const walker = document.createTreeWalker(
        shadowRoot,
        NodeFilter.SHOW_ELEMENT,
        null
    );

    if (!startNode && !endNode) {
        while (walker.nextNode()) elements.push(walker.currentNode);
    } else {
        const startPoint = startNode?.nextSibling || shadowRoot.firstChild;
        if (!startPoint) return elements;

        walker.currentNode = startPoint;
        do {
            if (walker.currentNode === endNode) break;
            elements.push(walker.currentNode);
        } while (walker.nextNode());
    }

    return elements;
}

export function bindEvents(instance, elements) {
    for (const el of elements) {
        for (const attr of Array.from(el.attributes)) {
            if (!attr.name.startsWith("data-event-")) continue;
            const event = attr.name.replace("data-event-", "");
            const handlerId = parseInt(attr.value, 10);

            // Verificar si el handler aún existe antes de vincular
            const eventHandler = STATE.globalEvents.handlersByType
                .get(event)
                ?.get(handlerId);

            if (typeof eventHandler === "function") {
                el.addEventListener(event, (...args) =>
                    withCurrentComponent(instance, () =>
                        eventHandler.call(instance, ...args)
                    )
                );
                el.removeAttribute(attr.name);
            }
        }
    }
}

export function setupSignals(instance, signals) {
    if (!signals) return;
    signals.forEach(({ type, signal, bindAttr, attributeName }) => {
        if (type === "attribute") {
            const el = instance.shadowRoot.querySelector(`[${bindAttr}]`);
            if (!el) return;
            el.removeAttribute(bindAttr);
            bindSignalToElement(instance, signal, (val) => {
                const strVal = String(val);
                if (el.getAttribute(attributeName) !== strVal)
                    el.setAttribute(attributeName, strVal);
            });
        } else if (type === "array") {
            const [startNode, endNode] = findCommentPlaceholders(
                instance.shadowRoot,
                bindAttr
            );
            if (!startNode || !endNode) return;
            bindSignalToElement(instance, signal, (newVal) => {
                const oldVal = startNode.__oldItems || [];
                reconcileArrays(
                    startNode,
                    endNode,
                    oldVal,
                    Array.isArray(newVal) ? newVal : [],
                    instance
                );
            });
        } else if (type === "text" || type === "expression") {
            handleSignalBinding({ host: instance, type, signal, bindAttr });
        }
    });
}

export function setupRefs(instance, refs) {
    if (!refs) return;
    for (const [i, refFn] of refs.entries()) {
        const el = instance.shadowRoot.querySelector(`[data-ref-${i}]`);
        if (!el) continue;
        el.removeAttribute(`data-ref-${i}`);
        refFn(el);
    }
}
