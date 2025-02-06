import STATE from "../globals";
import { valuesChanged } from "../utils/dom";
import { wrapArray } from "./arrays";
import { flushEffects, useEffect } from "./effects";

let batchDepth = 0;
const pendingUpdates = new Set();

export function useSignal(initialValue) {
    const subscriptions = new Set();
    let value = initialValue;

    function readFn() {
        if (STATE.currentEffect) subscriptions.add(STATE.currentEffect);
        return Array.isArray(value) ? wrapArray(value, readFn) : value;
    }

    // Cache interna para funciones computadas (por cada propiedad accedida)
    const computedCache = new Map();

    const proxy = new Proxy(readFn, {
        apply(target, thisArg, args) {
            // Permite usar la señal como función
            return Reflect.apply(target, thisArg, args);
        },
        get(target, prop) {
            // Casos especiales para conversión a primitivo y representación en cadena
            if (prop === Symbol.toPrimitive) return () => readFn();
            if (prop === "valueOf") return () => proxy();
            if (prop === "toString") return () => String(proxy());

            // Lee el valor actual y registra la dependencia
            const currentVal = readFn();

            // Si el valor es primitivo o nulo, devolver la propiedad del objeto envolvente
            if (
                currentVal == null ||
                (typeof currentVal !== "object" &&
                    typeof currentVal !== "function")
            ) {
                return Reflect.get(Object(currentVal), prop);
            }

            // Si la propiedad es una función (por ejemplo, métodos del objeto), devolverla enlazada
            const raw = Reflect.get(currentVal, prop);
            if (typeof raw === "function") return raw.bind(currentVal);

            // Para propiedades “no-función” (valores anidados) devolvemos una función computada.
            // NOTA: No asignamos la propiedad "signal" a esta función para que el engine de templates la trate como función.
            if (!computedCache.has(prop)) {
                const computedFn = () => readFn()[prop];
                // Definimos el método de conversión primitiva para que, si se usa en operaciones aritméticas, se obtenga el valor.
                Object.defineProperty(computedFn, Symbol.toPrimitive, {
                    value: () => readFn()[prop],
                });
                computedCache.set(prop, computedFn);
            }
            return computedCache.get(prop);
        },
    });

    Object.assign(proxy, {
        // La señal “raíz” se marca con signal para que el resto del framework la reconozca
        signal: true,
        cleanup: () => {
            subscriptions.clear();
            value = initialValue;
        },
    });

    return [
        proxy,
        (newValue) => {
            if (!valuesChanged(value, newValue)) return;
            value = newValue;
            if (batchDepth > 0) {
                subscriptions.forEach((sub) => pendingUpdates.add(sub));
                return;
            }
            queueMicrotask(() => {
                subscriptions.forEach((effect) => {
                    if (typeof effect === "function")
                        STATE.pendingEffects.add(effect);
                });
                flushEffects();
            });
        },
    ];
}

export function useComputed(fn) {
    const [value, setValue] = useSignal(fn());
    useEffect(() => {
        const newValue = fn();
        if (valuesChanged(value(), newValue))
            queueMicrotask(() => setValue(newValue));
    });
    return value;
}

export function useBatch(fn) {
    batchDepth++;
    try {
        return fn();
    } finally {
        batchDepth--;
        if (batchDepth === 0 && pendingUpdates.size) {
            for (const effect of pendingUpdates) {
                STATE.pendingEffects.add(effect);
            }
            pendingUpdates.clear();
            flushEffects();
        }
    }
}
