export { component } from "./component.js";
// The 'html' tagged template literal is now available as `this.html` on component instances,
// set up by `createLifecycle`. It's no longer globally exported for direct import by users.
// Users should use `this.html` within their component's `setup` method.

// Reactivity
export { signal, computed, effect, batch } from "./hooks/reactivity.js";

// Utilities
export { ref } from "./hooks/ref.js";
export { emit } from "./hooks/emit.js";

// LifeCycle hooks (e.g., onMount, onEffect) are now methods on the component instance itself,
// and are set up by createLifecycle. They are no longer globally exported.
// Example: Inside a component's setup method, use `this.onMount(...)`.
