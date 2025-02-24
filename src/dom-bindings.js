import STATE, { withCurrentComponent } from "./globals";
import { reconcileArrays } from "./templates/reconcile";
import { findCommentPlaceholders } from "./utils/dom";
import { effect } from "./hooks/signals";
import { getEventHandler } from "./events";
import { handleSignalBinding } from "./templates/helpers";
import { ATTRIBUTES_NAMES_EVENTS } from "./templates/engine";

export function setupEventDelegation(instance, eventAttrs) {
    const shadow = instance?.shadowRoot;
    if (!shadow) return;

    const eventTypes = new Set();
    for (const attr of eventAttrs) {
        const evtType = attr.name.replace(`${ATTRIBUTES_NAMES_EVENTS}-`, "");
        if (evtType) eventTypes.add(evtType);
    }

    for (const evtType of eventTypes) {
        const listener = (event) => {
            const target = event.target;
            if (target.hasAttribute(`${ATTRIBUTES_NAMES_EVENTS}-${evtType}`)) {
                const handlerId = Number(
                    target.getAttribute(`${ATTRIBUTES_NAMES_EVENTS}-${evtType}`)
                );
                const handler = getEventHandler(instance, handlerId);
                if (typeof handler === "function") {
                    withCurrentComponent(instance, () => {
                        handler.call(instance, event);
                    });
                }
            }
        };

        shadow.addEventListener(evtType, listener, {
            passive: false,
            capture: true,
        });
        instance._eventHandlers = instance._eventHandlers || new Map();
        instance._eventHandlers.set(evtType, listener);
    }
}

export function setupRefs(refAttrs, refMap) {
    if (!refAttrs || !refMap) return;

    for (const attr of refAttrs) {
        const el = attr.ownerElement;
        if (!el) continue;

        const idx = Number(attr.value);
        el.removeAttribute(attr.name);

        const refFn = refMap.get(idx);
        if (typeof refFn === "function") refFn(el);
    }
}

export function bindSignalToElement(instance, sig, updateFn) {
    const eff = effect(() => {
        if (instance._isUpdating) return;
        instance._isUpdating = true;
        try {
            updateFn(sig());
        } finally {
            instance._isUpdating = false;
        }
    });
    instance._cleanup.add(eff);
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

function handleAttributeSignal(instance, sig, bindAttr, attributeName) {
    const el = instance.shadowRoot.querySelector(`[${bindAttr}]`);
    if (!el) return;
    el.removeAttribute(bindAttr);

    bindSignalToElement(instance, sig, (value) => {
        const stringValue = String(value);
        if (el.getAttribute(attributeName) !== stringValue) {
            el.setAttribute(attributeName, stringValue);
        }
    });
}

function handleArraySignal(instance, sig, bindAttr) {
    const [startNode, endNode] = findCommentPlaceholders(
        instance.shadowRoot,
        bindAttr
    );
    if (!startNode || !endNode) return;

    bindSignalToElement(instance, sig, (newValue) => {
        const oldItems = startNode.__oldItems || [];
        const newItems = Array.isArray(newValue) ? newValue : [];
        reconcileArrays(startNode, endNode, oldItems, newItems, instance);
    });
}

export function bindEventsInRange(instance, startNode, endNode) {
    const { shadowRoot } = instance;
    const elements = getElementsInRange(shadowRoot, startNode, endNode);
    bindEvents(instance, elements);
}

export function bindEvents(instance, elements) {
    for (const el of elements) {
        for (const attr of Array.from(el.attributes)) {
            if (!attr.name.startsWith(`${ATTRIBUTES_NAMES_EVENTS}`)) continue;
            const event = attr.name.replace(ATTRIBUTES_NAMES_EVENTS, "");
            const handlerId = parseInt(attr.value, 10);

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

export function getElementsInRange(shadowRoot, startNode, endNode) {
    const elements = [];
    const walker = document.createTreeWalker(
        shadowRoot,
        NodeFilter.SHOW_ELEMENT,
        null
    );

    if (!startNode && !endNode) {
        while (walker.nextNode()) elements.push(walker.currentNode);

        return elements;
    }

    const startPoint = startNode?.nextSibling || shadowRoot.firstChild;
    if (!startPoint) return elements;

    walker.currentNode = startPoint;
    do {
        if (walker.currentNode === endNode) break;
        elements.push(walker.currentNode);
    } while (walker.nextNode());

    return elements;
}
