import {
    signal as alienSignal,
    effect,
    computed,
    startBatch,
    endBatch,
} from "alien-signals";
import { wrapArray } from "./arrays";
import STATE from "../globals";

function signal(initialValue) {
    if (Array.isArray(initialValue)) {
        const sig = alienSignal(initialValue);
        let reactiveArray = wrapArray(initialValue, () => sig());
        reactiveArray.__signalArray = true;

        // Function acting as getter (without arguments) or setter (with argument)
        const func = (...args) => {
            if (args.length > 0) {
                const newVal = args[0];
                sig(newVal);
                reactiveArray = wrapArray(newVal, () => sig());
                reactiveArray.__signalArray = true;
                return reactiveArray;
            }
            return reactiveArray;
        };

        return func;
    }
    return alienSignal(initialValue);
}

function batch(fn) {
    if (STATE.batchQueue) return fn();

    STATE.batchQueue = new Set();
    startBatch();
    try {
        fn();
        flushBatch();
    } finally {
        endBatch();
        STATE.batchQueue = null;
    }
}

function flushBatch() {
    const effects = STATE.batchQueue;
    STATE.batchQueue = null;
    for (const effect of effects) effect();
    STATE.batchQueue.forEach((effect) => effect());
    STATE.batchQueue.clear();
}

export { signal, computed, effect, batch };
