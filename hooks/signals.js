import STATE from "../globals.js";
import { valuesChanged } from "../utils/dom.js";
import { flushEffects, useEffect } from "./effects.js";

const METHODS_ARRAY = [
    // Read-only methods
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

    // Mutating methods
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "reverse",
    "sort",
];

let batchDepth = 0;
const pendingUpdates = new Set();

export function useSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const read = () => {
        if (STATE.currentEffect) subscribers.add(STATE.currentEffect);
        const result = value;

        // We only add the special map if it is an array.
        if (Array.isArray(result)) return addSignalMap(result, read);

        return result;
    };

    const write = (newValue) => {
        if (!valuesChanged(value, newValue)) return;
        value = newValue;
        subscribers.forEach((effect) => STATE.pendingEffects.add(effect));
        flushEffects();
    };

    read.valueOf = () => read();
    read.toString = () => String(read());
    read.signal = true;

    return [read, write];
}

function addSignalMap(arr, read) {
    METHODS_ARRAY.forEach((method) => {
        const origMap = arr[method];
        arr[method] = function (...args) {
            const mappedArray = origMap.apply(this, args);
            mappedArray.__signalArray = true;
            mappedArray.__signal = read;
            mappedArray.__mapFn = args[0]; // Save the mapping function
            return mappedArray;
        };
    });

    return arr;
}

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

export function useComputed(fn) {
    const [val, setVal] = useSignal(fn());

    const effect = () => {
        const newVal = fn();
        if (valuesChanged(val(), newVal)) {
            Promise.resolve().then(() => setVal(newVal));
        }
    };

    useEffect(effect);
    return val;
}

