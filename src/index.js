import { component } from "./component";
import { html } from "./templates/engine";
import { signal, batch, computed, effect } from "./hooks/signals";
import { ref } from "./hooks/ref";
import { memo } from "./hooks/memo";
import { useEmit } from "./hooks/emit";
 import { store } from "./hooks/store";
import {
    beforeMount,
    onMount,
    beforeUpdate,
    onUpdate,
    onDestroy,
    onEffect,
} from "./lifecycle";

export {
    component,
    html,
    signal,
    batch,
    ref,
    computed,
    memo,
    useEmit,
    effect,
    store,
    beforeMount,
    onMount,
    beforeUpdate,
    onUpdate,
    onDestroy,
    onEffect,
};
