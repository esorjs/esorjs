import { handleError } from "./utils/error.js";

let ctx = null;

// List of available hooks
const LIFECYCLE_HOOKS = [
    "beforeMount",
    "mount",
    "beforeUpdate",
    "update",
    "destroy",
];

/**
 * Create a life cycle system for the component.
 * @param {object} host - The host of the component.
 */
export const createLifecycle = (host) => {
    ctx = host;

    host._lifecycles = Object.fromEntries(
        LIFECYCLE_HOOKS.map((hook) => [hook, []])
    );

    host.runHook = (key) => {
        const hooks = host._lifecycles?.[key];
        if (!hooks?.length) return;

        for (let i = 0; i < hooks.length; i++)
            queueMicrotask(() => hooks[i].call(host));
    };
};

/**
 * Adds a hook to the lifecycle system.
 * @param {string} key - The lifecycle key.
 * @param {Function} fn - The function to add.
 */
const addHook = (key, fn) => {
    if (!ctx || !ctx._lifecycles) {
        handleError("lifecycle", `Hook called outside ctx setup for "${key}"`);
        return;
    }
    ctx._lifecycles[key].push(fn);
};

// Generate hook functions dynamically
const exportedHooks = {};
LIFECYCLE_HOOKS.forEach((hook) => {
    // Convert names like “beforeMount” to “beforeMount” and “mount” to “onMount”.
    const fnName = hook.startsWith("before")
        ? hook
        : `on${hook.charAt(0).toUpperCase() + hook.slice(1)}`;
    exportedHooks[fnName] = (fn) => addHook(hook, fn);
});

export const { beforeMount, onMount, beforeUpdate, onUpdate, onDestroy } =
    exportedHooks;

// onEffect is a special case that handles cleaning
export const onEffect = (fn) => {
    const cleanup = fn();
    if (typeof cleanup === "function") addHook("destroy", cleanup);
    return () => {};
};
