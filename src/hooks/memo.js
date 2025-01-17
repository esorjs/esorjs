import { useSignal } from "./signals.js";
import { useEffect } from "./effects.js";

export function useMemo(fn) {
    const [signal, setSignal] = useSignal();
    useEffect(() => setSignal(fn()));
    return signal;
}
