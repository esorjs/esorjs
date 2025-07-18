export { component } from "./component.js";
export { html } from "./template/render.js";

// Reactivity
export { signal, computed, effect, batch } from "./hooks/reactivity.js";

// Utilities
export { ref } from "./hooks/ref.js";
export { emit } from "./hooks/emit.js";

// LifeCycle
export {
    onMount,
    onUpdate,
    onDestroy,
    beforeMount,
    beforeUpdate,
    onEffect,
    getCurrentContext,
} from "./lifecycle.js";
