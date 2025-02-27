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
    if (!Array.isArray(initialValue)) return alienSignal(initialValue);

    const sig = alienSignal(initialValue);
    let reactiveArray = wrapArray(initialValue, () => sig());

    function arraySignal(...args) {
        if (args.length > 0) {
            const newVal = args[0];
            if (Object.is(newVal, sig())) return reactiveArray;

            sig(newVal);
            reactiveArray = wrapArray(newVal, () => sig());
        }
        return reactiveArray;
    }

    return Object.assign(arraySignal, { __signalArray: true });
}

function batch(fn) {
    if (STATE.batchQueue) return fn();

    STATE.isBatching = true;
    STATE.batchQueue = new Set();
    startBatch();

    try {
        fn();
    } finally {
        flushBatch();
        endBatch();
        STATE.isBatching = false;
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
