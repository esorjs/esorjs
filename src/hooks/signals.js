import STATE from "../globals.js";
import { valuesChanged } from "../utils/dom.js";
import { flushEffects } from "./effects.js";

let batchDepth = 0;
const pendingUpdates = new Set();

export function useSignal(initialValue) {
    const subscriptions = new Set();
    let value = initialValue;

    const read = () => {
        if (STATE.currentEffect) subscriptions.add(STATE.currentEffect);
        const result = value;
        if (Array.isArray(result)) return addSignalMap(result, read);

        return result;
    };

    const write = (newValue) => {
        if (!valuesChanged(value, newValue)) return;
        value = newValue;

        if (batchDepth > 0) {
            subscriptions.forEach((sub) => pendingUpdates.add(sub));
            return;
        }

        queueMicrotask(() => {
            subscriptions.forEach((effect) => STATE.pendingEffects.add(effect));
            flushEffects();
        });
    };

    read.valueOf = () => read();
    read.toString = () => String(read());
    read.signal = true;

    return [read, write];
}

export function useEffect(fn) {
    const effect = () => {
        const prevEffect = STATE.currentEffect;
        STATE.currentEffect = effect;
        try {
            return fn();
        } finally {
            STATE.currentEffect = prevEffect;
        }
    };

    effect();
    return effect;
}

export function useComputed(fn) {
    const [value, setValue] = useSignal(fn());

    useEffect(() => {
        const newValue = fn();
        if (valuesChanged(value(), newValue))
            queueMicrotask(() => setValue(newValue));
    });

    return value;
}

// Handling of reactive arrays
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

// Batch system
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
