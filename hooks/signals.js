import STATE from "../globals.js";
import { valuesChanged } from "../utils/dom.js";
import { flushEffects, useEffect } from "./effects.js";

export function useSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const read = () => {
        if (STATE.currentEffect) {
            subscribers.add(STATE.currentEffect);
        }
        const result = value;

        // We only add the special map if it is an array.
        if (Array.isArray(result)) {
            const origMap = result.map;
            result.map = function (...args) {
                const mappedArray = origMap.apply(this, args);
                mappedArray.__signalArray = true;
                mappedArray.__signal = read;
                mappedArray.__mapFn = args[0]; // Save the mapping function
                return mappedArray;
            };
        }

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
