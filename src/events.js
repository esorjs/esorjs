import STATE from "./globals";
import { error } from "./logger";

 const eventCache = new Map();

function getOrCreateMap(container, type) {
    if (!container.has(type)) container.set(type, new Map());
    return container.get(type);
}

export function registerEvent(type, handler) {
    if (!type || typeof handler !== "function") {
        error("Invalid event registration parameters");
        return -1;
    }

    const typeCache = getOrCreateMap(eventCache, type);
    const handlers = getOrCreateMap(STATE.globalEvents.handlersByType, type);
    const id = STATE.globalEvents.nextId++;

     if (STATE.currentComponent) {
        STATE.currentComponent._eventIds.push({ type, id });
    }

    handlers.set(id, handler);
    typeCache.set(id, handler);
    return id;
}

export function clearEventHandler(type, id) {
    const handlers = STATE.globalEvents.handlersByType.get(type);
    if (handlers) {
        handlers.delete(id);
        if (handlers.size === 0) STATE.globalEvents.handlersByType.delete(type);

        const typeCache = eventCache.get(type);
        if (typeCache) {
            typeCache.delete(id);
            if (typeCache.size === 0) eventCache.delete(type);
        }
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
