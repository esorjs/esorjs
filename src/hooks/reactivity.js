let activeEffect = null;
let batchDepth = 0;
const effectsQueue = new Set();

/**
 * Creates a reactive se al that notifies subscribers when its value changes.
 * @param {any} initialValue - Initial value.
 * @returns {Function} - Getter/setter function to access and modify the value.
 */
const signal = (initial) => {
    let val = initial;
    const subs = [];
    const getterSetter = (value) => {
        if (value === undefined) {
            if (activeEffect && !subs.includes(activeEffect)) {
                subs.push(activeEffect);
                if (activeEffect.subs) activeEffect.subs.add(getterSetter);
            }
            return val;
        }
        const newValue = typeof value === "function" ? value(val) : value;
        if (!Object.is(newValue, val)) {
            val = newValue;
            if (batchDepth > 0)
                // Within a batch, add effects to the queue without executing them
                for (let i = 0; i < subs.length; i++) effectsQueue.add(subs[i]);
            else {
                // Out of a batch, execute bills of exchange immediately
                const s = subs.slice();
                for (let i = 0; i < s.length; i++) s[i]();
            }
        }
        return val;
    };
    getterSetter.subs = subs;
    return getterSetter;
};

/**
 * Creates a reactive effect that runs automatically when its dependencies change.
 * The effect function `fn` is executed immediately and re-executed whenever any
 * of the reactive signals it depends on are updated.
 *
 * @param {Function} fn - The function to execute when the effect is triggered.
 * @returns {Function} - A cleanup function to unsubscribe the effect from its dependencies.
 */

const effect = (fn) => {
    const subs = new Set();
    let isRunning = false;
    const reactive = () => {
        if (isRunning) return;
        isRunning = true;
        const prev = activeEffect;
        activeEffect = reactive;
        try {
            fn();
        } finally {
            activeEffect = prev;
            isRunning = false;
        }
    };
    reactive.subs = subs;
    reactive();
    return () => {
        subs.forEach((signal) => {
            const index = signal.subs.indexOf(reactive);
            if (index !== -1) signal.subs.splice(index, 1);
        });
        subs.clear();
    };
};

/**
 * Creates a computed reactive value that is derived from other signals.
 * The computed value is the result of calling the `fn` function whenever any of
 * the reactive signals it depends on are updated.
 *
 * @param {Function} fn - The function to execute when the computed value is accessed.
 * @returns {Function} - A getter function with a `.dispose` method to clean up the computed value.
 */
const computed = (fn) => {
    const computedSignal = signal(fn());
    effect(() => computedSignal(fn()));
    return () => computedSignal();
};

/**
 * Batches multiple signal updates into a single update cycle.
 * This defers the execution of effects until all batched updates are complete,
 * optimizing rendering performance.
 *
 * @param {Function} fn - The function containing updates to batch.
 * @returns {any} - The result of the function `fn`.
 */
const batch = (fn) => {
    batchDepth++;
    try {
        return fn();
    } finally {
        batchDepth--;
        if (batchDepth === 0) {
            const effectsToRun = Array.from(effectsQueue);
            effectsQueue.clear();
            effectsToRun.forEach((eff) => eff());
        }
    }
};

export { signal, effect, computed, batch };
