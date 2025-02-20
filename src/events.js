import STATE from "./globals";
import { error } from "./logger";

const eventHandlers = new Map();
let nextEventId = 1;

export function registerEvent(type, handler) {
    if (!type || typeof handler !== "function") {
        error("Invalid event registration parameters");
        return -1;
    }
    if (!eventHandlers.has(type)) {
        eventHandlers.set(type, new Map());
    }
    const id = nextEventId++;
    eventHandlers.get(type).set(id, handler);
    return id;
}

export function getEventHandler(type, id) {
    return eventHandlers.get(type)?.get(id);
}

export function clearEventHandler(type, id) {
    const handlers = eventHandlers.get(type);
    if (handlers) {
        handlers.delete(id);
        if (handlers.size === 0) eventHandlers.delete(type);
    }
}

export function useEmit(name, detail) {
    const comp = STATE.currentComponent;
    if (!comp) {
        error("useEmit must be used within a component");
        return null;
    }
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
        timestamp: Date.now(),
    };
    comp.dispatchEvent(event);
    return event;
}
