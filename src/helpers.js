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
    const elements = [];
    if (!startNode && !endNode) {
        if (shadowRoot.nodeType === Node.ELEMENT_NODE)
            elements.push(shadowRoot);
        elements.push(...shadowRoot.querySelectorAll("*"));
    } else {
        let cur = startNode?.nextSibling;
        while (cur && cur !== endNode) {
            if (cur.nodeType === Node.ELEMENT_NODE) {
                elements.push(cur, ...cur.querySelectorAll("*"));
            }
            cur = cur.nextSibling;
        }
    }

    for (const el of elements) {
        for (const attr of el.attributes) {
            if (!attr.name.startsWith("data-event-")) continue;
            const eventType = attr.name.replace("data-event-", "");
            const handlerId = parseInt(attr.value, 10);
            const eventHandler = STATE.globalEvents.handlersByType
                .get(eventType)
                ?.get(handlerId);
            if (typeof eventHandler === "function") {
                const ac = new AbortController();
                el.addEventListener(
                    eventType,
                    (...args) =>
                        withCurrentComponent(instance, () =>
                            eventHandler.call(instance, ...args)
                        ),
                    { signal: ac.signal }
                );
                instance._cleanup.add(() => ac.abort());
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
    refs.forEach((refFn, i) => {
        const el = instance.shadowRoot.querySelector(`[data-ref-${i}]`);
        if (!el) return;
        el.removeAttribute(`data-ref-${i}`);
        refFn(el);
    });
}
