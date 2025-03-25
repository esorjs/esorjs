import { emit } from "./hooks/emit";

/**
 * Initializes the event broadcasting system in a component
 * @param {HTMLElement} host - Host element for events
 */
export function initDispatch(host) {
    if (!host) return;
    host.emit = (event, detail) => emit(event, detail, host);
}
