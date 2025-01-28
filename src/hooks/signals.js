import STATE from "../globals";
import { valuesChanged } from "../utils/dom";
import { addSignalMap } from "./arrays";
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
                if (typeof effect === "function")
                    STATE.pendingEffects.add(effect);
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
        if (valuesChanged(value(), newValue))
            queueMicrotask(() => setValue(newValue));
    });
    return value;
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
            for (const effect of pendingUpdates) {
                STATE.pendingEffects.add(effect);
            }
            pendingUpdates.clear();
            flushEffects();
        }
    }
}
