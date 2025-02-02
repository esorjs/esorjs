import STATE from "../globals";
import { error } from "../logger";

const eventCache = new Map();

export function registerEvent(type, handler) {
    if (!type || typeof handler !== "function") {
        error("Invalid event registration parameters");
        return -1;
    }
    
    let typeCache = eventCache.get(type);
    if (!typeCache) {
        typeCache = new Map();
        eventCache.set(type, typeCache);
    }

    let handlers = STATE.globalEvents.handlersByType.get(type);
    if (!handlers) {
        handlers = new Map();
        STATE.globalEvents.handlersByType.set(type, handlers);
    }

    const id = STATE.globalEvents.nextId++;

    // Registrar en el componente actual si existe
    const comp = STATE.currentComponent;
    if (comp) comp._eventIds.push({ type, id });

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
