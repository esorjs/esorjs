let currentEffect = null;
let batchDepth = 0;
let pendingEffects = null;
let autoBatchScheduled = false;

/**
 * Executes all pending effects and resets the auto-batch flag.
 * Continues flushing until no more effects are pending (to handle cascading updates).
 * @private
 */
function flushEffects() {
    autoBatchScheduled = false;
    while (pendingEffects) {
        const effects = pendingEffects;
        pendingEffects = null;
        for (const fn of effects) fn();
    }
}

/**
 * Creates a reactive signal that notifies its subscribers when its value changes.
 *
 * Signals are reactive values that can be used to track state changes in your application.
 * When the signal's value is changed, all subscribed functions will be called with the new value.
 * Subscribers can be added either by calling the signal with no arguments (which will add the
 * current effect to the subscribers) or by calling the signal with a new value.
 *
 * @param {*} initialValue - The initial value of the signal.
 * @returns {Function} A function that can be used to get or set the signal's value.
 */
const signal = (initialValue) => {
    let value = initialValue;
    const subscribers = new Set();

    return (...args) => {
        if (!args.length) {
            currentEffect && subscribers.add(currentEffect);
            return value;
        }

        const newValue = args[0];
        if (value !== newValue) {
            value = newValue;
            if (batchDepth) {
                // Manual batch is active (higher priority)
                pendingEffects ||= new Set();
                for (const fn of subscribers) pendingEffects.add(fn);
            } else {
                // Auto-batching with microtask
                pendingEffects ||= new Set();
                for (const fn of subscribers) pendingEffects.add(fn);

                if (!autoBatchScheduled) {
                    autoBatchScheduled = true;
                    queueMicrotask(flushEffects);
                }
            }
        }

        return value;
    };
};

/**
 * Creates an effect that runs a function and remembers it for future calls.
 *
 * Effects are functions that run a computation and remember themselves for
 * future calls. When an effect is called, it sets itself as the current effect
 * and then calls the computation. After the computation is done, it sets the
 * current effect back to null.
 *
 * @param {Function} fn - The computation to run.
 * @returns {Function} The effect function.
 */
const effect = (fn) => {
    const execute = () => {
        currentEffect = execute;
        fn();
        currentEffect = null;
    };
    execute();
    return execute;
};

/**
 * Creates a computed signal that automatically updates based on its dependencies.
 *
 * A computed signal is a derived value that updates whenever the signals it depends
 * on change. When the provided function is executed, it tracks the dependencies,
 * and any changes to those dependencies will cause the computed function to re-run,
 * updating the computed signal's value.
 *
 * @param {Function} fn - The function that returns the computed value, which may depend
 * on other reactive signals.
 * @returns {Function} A signal function that returns the current computed value.
 */

const computed = (fn) => {
    const result = signal(undefined);
    effect(() => result(fn()));
    return result;
};

/**
 * Runs a function without scheduling subscriber updates until all batches are complete.
 *
 * Batching is useful when you need to update multiple reactive signals
 * without notifying their subscribers until all updates are complete.
 * This can be useful for performance optimization.
 *
 * @param {Function} fn - The function to run in batch mode.
 * @returns {*} The result of the function.
 */
const batch = (fn) => {
    batchDepth++;
    const result = fn();
    if (!--batchDepth && pendingEffects) {
        flushEffects();
    }
    return result;
};

/**
 * Executes a function and immediately flushes all pending effects synchronously.
 *
 * This is useful when you need to ensure that all effects run immediately,
 * bypassing the auto-batching mechanism. This can be important for cases
 * where you need to read DOM measurements or perform operations that depend
 * on the effects having already run.
 *
 * @param {Function} fn - The function to execute.
 * @returns {*} The result of the function.
 */
const flushSync = (fn) => {
    batchDepth++;
    const result = fn();
    batchDepth--;
    if (pendingEffects) {
        flushEffects();
    }
    return result;
};

export { signal, effect, computed, batch, flushSync };
