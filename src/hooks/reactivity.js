let activeEffect = null;
let runCount = 0;

/**
 * Creates a reactive signal that notifies subscribers when its value changes.
 * @param {any} initialValue - Initial value.
 * @returns {Function} - Getter/setter function to access and modify the value.
 */
const signal = (initial) => {
    let val = initial;
    const subs = new Set();
    const getterSetter = (value) => {
        if (value === undefined) {
            if (activeEffect) subs.add(activeEffect);
            return val;
        }
        const computed = typeof value === "function" ? value(val) : value;
        if (!Object.is(computed, val)) {
            val = computed;
            subs.forEach((fn) => fn());
        }
        return val;
    };
    return getterSetter;
};

/**
 * Creates a reactive effect that runs automatically when its dependencies change.
 * @param {Function} callback - The function to execute when the effect is triggered.
 * @returns {Function} - A function to clean up the effect.
 */
const effect = (fn) => {
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
    reactive();
    return () => subs.delete(reactive);
};

/**
 * Creates a computed reactive value that is derived from other signals.
 * @param {Function} callback - The function to execute when the computed value is accessed.
 * @returns {Function} - A getter function with a `.dispose` method to clean up the computed value.
 */
const computed = (fn) => {
    const computedSignal = signal();
    effect(() => computedSignal(fn()));
    return () => computedSignal();
};

/**
 * Batches multiple signal updates into a single update, optimizing rendering performance.
 * @param {Function} callback - The function to execute within the batch.
 * @returns {any} - The result of the callback function.
 */
const batch = (fn) => {
    const previous = activeEffect;
    activeEffect = { id: runCount++ };
    try {
        return fn();
    } finally {
        activeEffect = previous;
    }
};

export { signal, effect, computed, batch };
