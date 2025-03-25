import { handleError, tryCatch } from "./utils/error";

const lifecycleHooks = {
    beforeMount: [],
    mount: [],
    beforeUpdate: [],
    update: [],
    destroy: [],
};

/**
 * Adds a hook to the lifecycle system.
 *
 * @param {string} key - The lifecycle key identifying the set of hooks to add the function to.
 * @param {Function} fn - The function to add to the lifecycle hook.
 * @returns {Function} A function to remove the hook.
 */
export const addHook = (key, fn) => {
    if (typeof fn !== "function") {
        handleError("lifecycle", "Hook must be a function");
        return () => {};
    }
    const hooks = lifecycleHooks[key];
    if (!hooks) return () => {};
    hooks.push(fn);
    return () => {
        const index = hooks.indexOf(fn);
        if (index !== -1) hooks.splice(index, 1);
    };
};

/**
 * Executes all hooks associated with the given lifecycle key within a provided context.
 *
 * @param {string} key - The lifecycle key identifying the set of hooks to run.
 * @param {Object} ctx - The context object to bind as `this` within each hook function.
 *                        If no context is provided, the function will return without executing hooks.
 */
export const runHook = (key, ctx) => {
    if (!ctx || !lifecycleHooks[key]) return;
    for (const fn of lifecycleHooks[key])
        tryCatch(() => fn.call(ctx), "lifecycle.runHook");
};

/**
 * Clears all hooks associated with the given lifecycle key.
 *
 * @param {string} key - The lifecycle key identifying the set of hooks to clear.
 */
export const clearHook = (key) => {
    if (lifecycleHooks[key]) lifecycleHooks[key] = [];
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
