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
        // If it is a getter
        if (value === undefined) {
            if (activeEffect && !subs.includes(activeEffect)) {
                subs.push(activeEffect);
                activeEffect.subs?.add(getterSetter);
            }
            return val;
        }

        // If it is a setter
        const newValue = typeof value === "function" ? value(val) : value;
        if (!Object.is(newValue, val)) {
            val = newValue;
            batchDepth > 0
                ? subs.forEach((effect) => effectsQueue.add(effect))
                : subs.slice().forEach((effect) => effect());
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
            if (index > -1) signal.subs.splice(index, 1);
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
    const result = signal(fn());
    effect(() => result(fn()));
    return () => result();
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
        if (--batchDepth === 0) {
            const effects = Array.from(effectsQueue);
            effectsQueue.clear();
            for (let i = 0; i < effects.length; i++) effects[i]();
        }
    }
};

export { signal, effect, computed, batch };
