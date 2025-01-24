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
    const nodes =
        !startNode && !endNode
            ? shadowRoot.querySelectorAll("*")
            : startNode?.nextElementSibling?.parentElement?.querySelectorAll(
                  "*"
              ) || [];

    const elements = Array.from(nodes);

    for (const el of elements) {
        const eventHandlers = {};
        for (const attr of el.attributes) {
            if (!attr.name.startsWith("data-event-")) continue;

            const eventType = attr.name.slice(11);
            const handlersByType = STATE.globalEvents.handlersByType;

            if (!handlersByType.has(eventType)) continue;

            const handlerId = parseInt(attr.value, 10);
            const eventHandler = handlersByType.get(eventType)?.get(handlerId);

            if (typeof eventHandler === "function") {
                eventHandlers[eventType] = {
                    handler: eventHandler,
                    ac: new AbortController(),
                };
            }
        }

        for (const [evtType, { handler, ac }] of Object.entries(
            eventHandlers
        )) {
            el.addEventListener(
                evtType,
                (...args) =>
                    withCurrentComponent(instance, () =>
                        handler.call(instance, ...args)
                    ),
                { signal: ac.signal }
            );
        }

        instance._cleanup.add(() => {
            for (const { ac } of Object.values(eventHandlers)) ac.abort();
        });
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
    const root = instance.shadowRoot;
    refs.forEach((refFn, i) => {
        const el = root.querySelector(`[data-ref-${i}]`);
        if (el) {
            el.removeAttribute(`data-ref-${i}`);
            refFn(el);
        }
    });
}
