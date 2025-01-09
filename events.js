import STATE from "./globals.js";

export function registerEvent(type, handler) {
    let handlers = STATE.globalEvents.handlersByType.get(type);
    if (!handlers) {
        handlers = new Map();
        STATE.globalEvents.handlersByType.set(type, handlers);
    }
    const id = STATE.globalEvents.nextId++;
    handlers.set(id, handler);
    return id;
}

export function clearEventHandler(type, id) {
    const handlers = STATE.globalEvents.handlersByType.get(type);
    handlers?.delete(id);
    if (!handlers?.size) STATE.globalEvents.handlersByType.delete(type);
}

export function useEmit(name, detail) {
    const comp = STATE.currentComponent;
    if (!comp) throw new Error("useEmit must be used within a component");

    const event = new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
        cancelable: true,
    });

    event.__esor = {
        name,
        detail,
        receivedBy: [],
    };

    return comp.dispatchEvent(event);
}
