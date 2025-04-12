import { handleError } from "./utils/error";

let ctx = null;

/**
 * Create a life cycle system for the component.
 *
 * @param {object} host - The host of the component.
 * @returns {void}
 * @throws Error - If called outside the component configuration.
 */
export const createLifecycle = (host) => {
    ctx = host;
    host._lifecycles = {
        beforeMount: [],
        mount: [],
        beforeUpdate: [],
        update: [],
        destroy: [],
    };

    host.runHook = (key) => {
        const h = host._lifecycles?.[key];
        if (!h || !h.length) return;
        for (let i = 0; i < h.length; i++)
            queueMicrotask(() => h[i].call(host));
    };
};

/**
 * Adds a hook to the lifecycle system.
 *
 * @param {string} key - The lifecycle key identifying the set of hooks to add the function to.
 * @param {Function} fn - The function to add to the lifecycle hook.
 * @returns {void}
 * @throws Error - If called outside component setup.
 */
const addHook = (key, fn) => {
    if (!ctx || !ctx._lifecycles) {
        handleError("lifecycle", `Hook called outside ctx setup for "${key}"`);
        return;
    }
    ctx._lifecycles[key].push(fn);
};

// Public API of Hooks, without the need to pass the instance explicitly.
export const beforeMount = (fn) => addHook("beforeMount", fn);
export const onMount = (fn) => addHook("mount", fn);
export const beforeUpdate = (fn) => addHook("beforeUpdate", fn);
export const onUpdate = (fn) => addHook("update", fn);
export const onDestroy = (fn) => addHook("destroy", fn);
export const onEffect = (fn) => {
    const cleanup = fn();
    if (typeof cleanup === "function") addHook("destroy", cleanup);
    return () => {};
};
