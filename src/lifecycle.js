import { handleError } from "./utils/error.js";
import { generateNodesFromTemplate } from "./template/html.js";

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
const LIFECYCLE_HOOKS = [
    "beforeMount",
    "mount",
    "beforeUpdate",
    "update",
    "destroy",
];

/**
 * Adds a hook to a specific component instance's lifecycle system.
 * @param {object} instance - The component instance.
 * @param {string} key - The lifecycle key.
 * @param {Function} fn - The function to add.
 */
const addHookToInstance = (instance, key, fn) => {
    if (!instance || !instance._lifecycles) {
        handleError("lifecycle", `Hook called on an uninitialized instance for "${key}"`);
        return;
    }
    instance._lifecycles[key].push(fn);
};

/**
 * Create a life cycle system for the component.
 * This function decorates the host instance with lifecycle methods.
 * @param {object} host - The host of the component.
 */
export const createLifecycle = (host) => {
    host._lifecycles = Object.fromEntries(
        LIFECYCLE_HOOKS.map((hook) => [hook, []])
    );

    host.runHook = (key) => {
        const hooks = host._lifecycles?.[key];
        if (!hooks?.length) return;

        for (let i = 0; i < hooks.length; i++)
            queueMicrotask(() => hooks[i].call(host));
    };

    // Attach lifecycle registration methods to the host instance
    LIFECYCLE_HOOKS.forEach((hookKey) => {
        const methodName = hookKey.startsWith("before")
            ? hookKey
            : `on${hookKey.charAt(0).toUpperCase() + hookKey.slice(1)}`;
        host[methodName] = (fn) => addHookToInstance(host, hookKey, fn);
    });

    // Special case for onEffect
    host.onEffect = (fn) => {
        // fn is expected to be: () => effectV1(() => { /* user code */ })
        // where effectV1 is the actual effect function that returns a cleanup.
        const cleanup = fn(); // This executes the outer function, which should call the core `effect`
        if (typeof cleanup === "function") {
            addHookToInstance(host, "destroy", cleanup);
        }
        // The original onEffect returned () => {}. If this is used by developers to get a cleanup,
        // this change would be breaking. However, onEffect is designed to auto-register cleanup.
        return () => {}; // Maintain original return signature for now.
    };

    // Provide a way for the template engine to get the current host,
    // and a mechanism to process html string literals within the host's context.
    host.getCurrentContext = () => host; // Used by template functions if they were still using global context
    host.html = (tpl, ...args) => generateNodesFromTemplate(host, tpl, ...args);
};

// Global export of getCurrentContext is removed as it relied on global `ctx`.
// Template engine functions like render, setContent now receive componentInstance directly.
// User-facing html tagged template literal is now host.html.
