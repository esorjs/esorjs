import STATE from "../globals";
import { valuesChanged } from "../utils/dom";
import { wrapArray } from "./arrays";
import { flushEffects, useEffect } from "./effects";

let batchDepth = 0;
const pendingUpdates = new Set();

export function useSignal(initialValue) {
    const subscriptions = new Set();
    let value = initialValue;

    function readFn() {
        if (STATE.currentEffect) subscriptions.add(STATE.currentEffect);
        return Array.isArray(value) ? wrapArray(value, readFn) : value;
    }

    function write(newValue) {
        if (!valuesChanged(value, newValue)) return;
        value = newValue;
        if (batchDepth > 0) {
            subscriptions.forEach((sub) => pendingUpdates.add(sub));
            return;
        }
        queueMicrotask(() => {
            subscriptions.forEach((effect) => {
                if (typeof effect === "function")
                    STATE.pendingEffects.add(effect);
            });
            flushEffects();
        });
    }

    const proxy = new Proxy(readFn, {
        apply(target, thisArg, args) {
            return Reflect.apply(target, thisArg, args);
        },
        get(target, prop) {
            if (prop === Symbol.toPrimitive) return () => readFn();
            if (prop === "valueOf") return () => proxy();
            if (prop === "toString") return () => String(proxy());

            const currentVal = readFn();

            if (currentVal == null) return undefined;

            if (
                typeof currentVal === "object" ||
                typeof currentVal === "function"
            ) {
                const result = Reflect.get(currentVal, prop);
                return typeof result === "function"
                    ? result.bind(currentVal)
                    : result;
            }
            return Reflect.get(Object(currentVal), prop);
        },
    });

    Object.assign(proxy, {
        signal: true,
        cleanup: () => {
            subscriptions.clear();
            value = initialValue;
        },
    });

    return [proxy, write];
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
