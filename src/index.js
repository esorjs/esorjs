import { component } from "./component.js";
import { html } from "./templates/engine.js";
import { useSignal, useBatch } from "./hooks/signals.js";
import { useRef } from "./hooks/ref.js";
import { useComputed } from "./hooks/signals.js";
import { useMemo } from "./hooks/memo.js";
import { useEmit } from "./events.js";
import { useEffect } from "./hooks/effects.js";
import { useStore } from "./hooks/store.js";
import {
    beforeMount,
    onMount,
    beforeUpdate,
    onUpdate,
    onDestroy,
    onEffect,
} from "./lifecycle.js";

export {
    component,
    html,
    useSignal,
    useBatch,
    useRef,
    useComputed,
    useMemo,
    useEmit,
    useEffect,
    useStore,
    beforeMount,
    onMount,
    beforeUpdate,
    onUpdate,
    onDestroy,
    onEffect
};
