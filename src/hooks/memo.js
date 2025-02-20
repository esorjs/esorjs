import { signal, effect } from "./signals";

/**
 * memo: Recalcula y memorizza el valor solo cuando cambian las dependencias.
 *
 * @param {Function} fn - Función que calcula el valor memoizado.
 * @param {Array<any>} deps - Arreglo de dependencias que controlan cuándo se recalcula el valor.
 * @returns {Function} signal - Una función reactiva que retorna el valor memoizado.
 */
export function memo(fn, deps = []) {
    // Inicializamos el valor memoizado llamando a la función fn() en el primer render.
    const _signal = signal(fn());

    // Solo se recalcula el valor si alguna de las dependencias cambia.
    effect(() => (_signal(fn()), deps));

    return _signal;
}
