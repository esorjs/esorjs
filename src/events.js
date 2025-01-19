import STATE from "./globals";
import { error } from "./logger";

export function registerEvent(type, handler) {
    const state = STATE.globalEvents.handlersByType.get(type) || new Map();
    const id = STATE.globalEvents.nextId++;
    state.set(id, handler);
    STATE.globalEvents.handlersByType.set(type, state);
    return id;
}

export function clearEventHandler(type, id) {
    const handlers = STATE.globalEvents.handlersByType.get(type);
    if (handlers) handlers.delete(id);
    if (handlers.size === 0) STATE.globalEvents.handlersByType.delete(type);
}

export function useEmit(name, detail) {
    const comp = STATE.currentComponent;
    if (!comp) error("useEmit must be used within a component");

    const event = new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
        cancelable: true,
    });

    event.__esor = { name, detail, receivedBy: [] };
    comp.dispatchEvent(event);
    return event;
}
