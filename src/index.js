import { signal, computed, effect, batch } from "./hooks/reactivity";
import { emit } from "./hooks/emit";
import { ref } from "./hooks/ref";
import { html } from "./template/html";
import { component } from "./component";
import {
    onMount,
    onUpdate,
    onDestroy,
    beforeMount,
    beforeUpdate,
    onEffect,
} from "./lifecycle";

export {
    // Core
    component,
    html,

    // Reactivity
    signal,
    computed,
    effect,
    batch,

    // Utilities
    ref,
    emit,

    // LifeCycle
    onMount,
    onUpdate,
    onDestroy,
    beforeMount,
    beforeUpdate,
    onEffect,
};
