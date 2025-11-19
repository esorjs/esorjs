let ctx = null;
const LIFECYCLE_HOOKS = [
    "beforeMount",
    "mount",
    "beforeUpdate",
    "update",
    "destroy",
];

/**
 * Initializes the lifecycle system for a component.
 * @param {object} h - The host component to which the lifecycle is attached.
 * Sets up the lifecycle hooks for the component and defines a method to run
 * these hooks.
 */
export const createLifecycle = (h) => {
    ctx = h;
    h._lifecycles = Object.fromEntries(LIFECYCLE_HOOKS.map((k) => [k, []]));
    h.runHook = (k) => {
        const hooks = h._lifecycles?.[k];
        if (!hooks?.length) return;

        // Batch ejecutar hooks en un solo microtask
        queueMicrotask(() => {
            for (let i = 0; i < hooks.length; i++) {
                hooks[i].call(h);
            }
        });
    };
};

/**
 * Adds a lifecycle hook function to the current component's lifecycle system.
 *
 * @param {string} k - The name of the lifecycle hook.
 * @param {Function} fn - The function to add as a hook.
 * @throws {Error} If called outside of a component's setup phase.
 */
const addHook = (k, fn) => {
    if (!ctx?._lifecycles)
        throw new Error(`[Esor] Hook called outside ctx setup for "${k}"`);

    ctx._lifecycles[k].push(fn);
};

const exportedHooks = {};
LIFECYCLE_HOOKS.forEach((h) => {
    const fnName = h.startsWith("before")
        ? h
        : `on${h[0].toUpperCase()}${h.slice(1)}`;
    exportedHooks[fnName] = (fn) => addHook(h, fn);
});

/**
 * Registers an effect function that may return a cleanup function.
 * The cleanup function, if provided, will be registered to run during the "destroy" lifecycle phase.
 *
 * @param {Function} fn - The effect function to execute. It may optionally return a cleanup function.
 * @returns {Function} A no-op function.
 */
export const onEffect = (fn) => {
    const cleanup = fn();
    if (typeof cleanup === "function") {
        addHook("destroy", cleanup);
    }
    return () => {};
};

/**
 * Retrieves the current lifecycle context (component host).
 * This function exposes the internal module-scoped `ctx` variable, which holds
 * the current component instance during its setup phase.
 * @returns {object|null} The current component context, or null if called outside of a component's setup phase.
 * @warning Use with caution. Accessing context outside of a component's synchronous
 * setup phase or in asynchronous contexts can lead to unexpected behavior or retrieving
 * a stale or incorrect context.
 */
export const getCurrentContext = () => {
    if (!ctx) {
        console.warn("getCurrentContext called outside of component lifecycle");
    }
    return ctx;
};

export const { beforeMount, onMount, beforeUpdate, onUpdate, onDestroy } =
    exportedHooks;
