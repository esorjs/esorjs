import STATE from "../globals";
import { valuesChanged } from "../utils/dom";
import { flushEffects, useEffect } from "./effects";

let batchDepth = 0;
const pendingUpdates = new Set();

/**
 * useSignal: crea un valor reactivo que notifica a suscriptores (effects)
 */
export function useSignal(initialValue) {
    const subscriptions = new Set();
    let value = initialValue;

    const read = () => {
        if (STATE.currentEffect) subscriptions.add(STATE.currentEffect);
        if (Array.isArray(value)) return addSignalMap(value, read);
        return value;
    };

    const write = (newValue) => {
        if (!valuesChanged(value, newValue)) return;
        value = newValue;

        if (batchDepth > 0) {
            subscriptions.forEach((sub) => pendingUpdates.add(sub));
            return;
        }
        // Actualizamos en microtask
        queueMicrotask(() => {
            for (const effect of subscriptions) {
                if (typeof effect === "function") {
                    STATE.pendingEffects.add(effect);
                }
            }
            flushEffects();
        });
    };

    read.valueOf = () => read();
    read.toString = () => String(read());
    read.signal = true;
    read.cleanup = () => {
        subscriptions.clear();
        value = initialValue;
    };

    return [read, write];
}

/**
 * useComputed: computa un valor derivado y se actualiza cuando cambian
 * los signals usados dentro de la función `fn`.
 */
export function useComputed(fn) {
    const [value, setValue] = useSignal(fn());
    useEffect(() => {
        const newValue = fn();
        if (valuesChanged(value(), newValue)) {
            queueMicrotask(() => setValue(newValue));
        }
    });
    return value;
}

// Métodos para arrays reactivas:
const ARRAY_METHODS = [
    "map",
    "filter",
    "find",
    "findIndex",
    "slice",
    "concat",
    "reduce",
    "every",
    "some",
    "includes",
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "reverse",
    "sort",
];

function addSignalMap(arr, read) {
    ARRAY_METHODS.forEach((method) => {
        const orig = arr[method];
        arr[method] = function (...args) {
            const mappedArray = orig.apply(this, args);
            mappedArray.__signalArray = true;
            mappedArray.__signal = read;
            mappedArray.__mapFn = args[0];
            return mappedArray;
        };
    });
    return arr;
}

/**
 * useBatch: agrupa varias escrituras de signals en un bloque atómico,
 * generando actualizaciones una sola vez al final.
 */
export function useBatch(fn) {
    batchDepth++;
    try {
        return fn();
    } finally {
        batchDepth--;
        if (batchDepth === 0 && pendingUpdates.size) {
            const updates = Array.from(pendingUpdates);
            pendingUpdates.clear();
            updates.forEach((effect) => STATE.pendingEffects.add(effect));
            flushEffects();
        }
    }
}
