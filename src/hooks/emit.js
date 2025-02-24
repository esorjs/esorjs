import STATE from "../globals";
import { error } from "../logger";

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
