import { useSignal } from "./signals";
import { useEffect } from "./effects";

/**
 * useMemo: Recalcula y memorizza el valor solo cuando cambian las dependencias.
 *
 * @param {Function} fn - Función que calcula el valor memoizado.
 * @param {Array<any>} deps - Arreglo de dependencias que controlan cuándo se recalcula el valor.
 * @returns {Function} signal - Una función reactiva que retorna el valor memoizado.
 */
export function useMemo(fn, deps = []) {
    // Inicializamos el valor memoizado llamando a la función fn() en el primer render.
    const [signal, setSignal] = useSignal(fn());

    // Solo se recalcula el valor si alguna de las dependencias cambia.
    useEffect(() => {
        setSignal(fn());
    }, deps);

    return signal;
}
