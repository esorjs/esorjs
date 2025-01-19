import { useSignal } from "./signals";
import { useEffect } from "./effects";

export function useMemo(fn) {
    const [signal, setSignal] = useSignal();
    useEffect(() => setSignal(fn()));
    return signal;
}
