import STATE, { withCurrentComponent } from "./globals";
import { handleSignalBinding } from "./templates/templates";
import { findCommentPlaceholders } from "./utils/dom";
import { reconcileArrays } from "./templates/reconcile";
import { useEffect } from "./hooks/effects";
import { ATTRIBUTES_NAMES_EVENTS } from "./templates/engine";

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
            if (!attr.name.startsWith(`${ATTRIBUTES_NAMES_EVENTS}`)) continue;
            const event = attr.name.replace(ATTRIBUTES_NAMES_EVENTS, "");
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
    if (!signals || signals.size === 0) return;

    for (const { type, signal, bindAttr, attributeName } of signals.values()) {
        switch (type) {
            case "attribute":
                handleAttributeSignal(
                    instance,
                    signal,
                    bindAttr,
                    attributeName
                );
                break;
            case "array":
                handleArraySignal(instance, signal, bindAttr);
                break;
            case "text":
            case "expression":
                handleSignalBinding({ host: instance, type, signal, bindAttr });
                break;
        }
    }
}

function handleAttributeSignal(instance, signal, bindAttr, attributeName) {
    const element = instance.shadowRoot.querySelector(`[${bindAttr}]`);
    if (!element) return;
    element.removeAttribute(bindAttr);
    bindSignalToElement(instance, signal, (value) => {
        const stringValue = String(value);
        if (element.getAttribute(attributeName) !== stringValue)
            element.setAttribute(attributeName, stringValue);
    });
}

function handleArraySignal(instance, signal, bindAttr) {
    const [startNode, endNode] = findCommentPlaceholders(
        instance.shadowRoot,
        bindAttr
    );
    if (!startNode || !endNode) return;
    bindSignalToElement(instance, signal, (newValue) => {
        const oldItems = startNode.__oldItems || [];
        const newItems = Array.isArray(newValue) ? newValue : [];
        reconcileArrays(startNode, endNode, oldItems, newItems, instance);
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
