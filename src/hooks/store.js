import { useSignal } from "./signals.js";
import { useEffect } from "./effects.js";
import { error } from "../logger.js";

const STORAGE_PREFIX = "esor-store:";

/**
 * Creates a simplified reactive store
 * @template T
 * @param {T} initialState - Initial state object
 * @param {Object} options - Store configuration
 * @param {string} [options.persist] - Storage key for persistence
 * @returns {[() => T, Object]} Returns [state getter, store methods]
 */
export const useStore = (initialState, options = {}) => {
    // Initialize state from storage if needed
    const storedState = options.persist
        ? loadFromStorage(options.persist)
        : null;

    const [state, setState] = useSignal(storedState || initialState);
    const subscribers = new Set();

    // Setup persistence if enabled
    if (options.persist) {
        useEffect(() => {
            const handleStorage = (e) => {
                if (e.key === STORAGE_PREFIX + options.persist) {
                    try {
                        setState(JSON.parse(e.newValue));
                    } catch (err) {
                        error(`Failed to sync state: ${err.message}`);
                    }
                }
            };
            window.addEventListener("storage", handleStorage);
            return () => window.removeEventListener("storage", handleStorage);
        });
    }

    // Simplified store API
    const store = {
        setState(update) {
            const newState =
                typeof update === "function" ? update(state()) : update;

            setState(newState);

            if (options.persist) saveToStorage(options.persist, newState);

            subscribers.forEach((cb) => cb(newState));
        },

        subscribe(callback) {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
        },

        getState: state,
    };

    return [state, store];
};

// Storage helpers
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
