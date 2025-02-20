import { signal, effect } from "./signals";
import { error } from "../logger";

const STORAGE_PREFIX = "esor-store:";

export const store = (initialState, options = {}) => {
    const storedState = options.persist
        ? loadFromStorage(options.persist)
        : null;

    const state = signal(storedState || initialState);
    const subscribers = new Set();

    if (options.persist) {
        // Escuchamos cambios en localStorage para sincronizar
        effect(() => {
            const handleStorage = (e) => {
                if (e.key === STORAGE_PREFIX + options.persist) {
                    try {
                        state.set(JSON.parse(e.newValue));
                    } catch (err) {
                        error(`Failed to sync state: ${err.message}`);
                    }
                }
            };
            window.addEventListener("storage", handleStorage);
            return () => window.removeEventListener("storage", handleStorage);
        });
    }

    const store = {
        setState(update) {
            const newState =
                typeof update === "function" ? update(state()) : update;
            state.set(newState);
            if (options.persist) saveToStorage(options.persist, newState);
            subscribers.forEach((cb) => cb(newState));
        },
        subscribe(callback) {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
        },
        // Leer estado: store.getState() -> state()
        getState: state,
    };

    return [state, store];
};

function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(STORAGE_PREFIX + key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        error(`Failed to load state: ${e.message}`);
        return null;
    }
}

function saveToStorage(key, value) {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
        error(`Failed to save state: ${e.message}`);
    }
}
