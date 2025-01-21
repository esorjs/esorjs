import { useSignal } from "./signals";
import { useEffect } from "./effects";

/**
 * useMemo: recalcula el valor solo cuando sus dependencias cambian.
 */
export function useMemo(fn) {
    const [signal, setSignal] = useSignal();
    useEffect(() => setSignal(fn()));
    return signal;
}
