export { component } from "./component.js";
export { html } from "./templates/engine.js";
export { useSignal, useBatch } from "./hooks/signals.js";
export { useRef } from "./hooks/ref.js";
export { useComputed } from "./hooks/signals.js";
export { useMemo } from "./hooks/memo.js";
export { useEmit } from "./events.js";
export { useEffect } from "./hooks/effects.js";
// export { router } from "./router.js";

// Lifecycle hooks
export {
    beforeMount,
    onMount,
    beforeUpdate,
    onUpdate,
    onDestroy,
    onEffect,
} from "./lifecycle.js";
