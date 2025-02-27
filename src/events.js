const eventHandlers = new WeakMap();
let nextEventId = 1;

export function registerEvent(component, type, handler) {
    if (!eventHandlers.has(component)) eventHandlers.set(component, new Map());
    const handlersMap = eventHandlers.get(component);
    const id = nextEventId++;
    handlersMap.set(id, { type, handler });
    return id;
}

export function getEventHandler(component, id) {
    return eventHandlers.get(component)?.get(id)?.handler;
}

export function clearEventHandler(component, id) {
    const handlers = eventHandlers.get(component);
    if (handlers) {
        handlers.delete(id);
        if (handlers.size === 0) eventHandlers.delete(component);
    }
}

export function clearAllEventHandlers(component) {
    eventHandlers.delete(component);
}
