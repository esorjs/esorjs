import { component } from "./component";
import { html } from "./templates/engine";
import { useSignal, useBatch } from "./hooks/signals";
import { useRef } from "./hooks/ref";
import { useComputed } from "./hooks/signals";
import { useMemo } from "./hooks/memo";
import { useEmit } from "./events";
import { useEffect } from "./hooks/effects";
import { useStore } from "./hooks/store";
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
