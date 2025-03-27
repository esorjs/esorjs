import { handleError, tryCatch } from "./utils/error";

let ctx = null;

export const createLifecycle = (instance) => (ctx = instance);

/**
 * Adds a hook to the lifecycle system.
 *
 * @param {string} key - The lifecycle key identifying the set of hooks to add the function to.
 * @param {Function} fn - The function to add to the lifecycle hook.
 * @returns {void}
 * @throws Error - If called outside component setup.
 */
const addHook = (key, fn) => {
    if (!ctx) {
        handleError("lifecycle", "Hook called outside component setup");
        return;
    }
    if (!ctx._lifecycles[key]) ctx._lifecycles[key] = [];
    ctx._lifecycles[key].push(fn);
};

/**
 * Executes all hooks associated with the given lifecycle key within a provided context.
 *
 * @param {string} key - The lifecycle key identifying the set of hooks to run.
 * @returns {void}
 * @throws Error - If called outside component setup.
 */
export const runHook = (key) => {
    if (!ctx?._lifecycles?.[key]) return;
    for (const fn of ctx._lifecycles[key])
        queueMicrotask(() => tryCatch(() => fn.call(ctx), "lifecycle.runHook"));
};

/**
 * Registers an effect with automatic cleanup when destroying.
 *
 * The effect function may return a cleanup function, which will be registered as a
 * hook for the `destroy` lifecycle event.
 *
 * @param {Function} fn - The effect function to register.
 * @returns {Function} A function to remove the effect.
 */
export const onEffect = (fn) => {
    const cleanup = fn();
    return typeof cleanup === "function"
        ? addHook("destroy", cleanup)
        : () => {};
};

// Public Hooks API
export const beforeMount = (fn) => addHook("beforeMount", fn);
export const onMount = (fn) => addHook("mount", fn);
export const beforeUpdate = (fn) => addHook("beforeUpdate", fn);
export const onUpdate = (fn) => addHook("update", fn);
export const onDestroy = (fn) => addHook("destroy", fn);
