import { useSignal } from "./signals.js";
import { useEffect } from "./effects.js";
import { valuesChanged } from "../utils/dom.js";
import { error } from "../logger.js";

/**
 * Hook useMemo enhanced for memoized calculations.
 * Only recalculates when dependencies actually change.
 *
 * @param {Function} computeFn - Compute function that returns the memoized value.
 * @param {Array} deps - List of signals as dependencies.
 * @returns {Function} - Signal returning the memoized value
 */
export function useMemo(computeFn, deps) {
    if (typeof computeFn !== "function")
        error("The first argument of useMemo must be a function.");
    if (!Array.isArray(deps))
        error("The second argument of useMemo must be an array.");
    if (!deps.every((dep) => typeof dep === "function"))
        error("All dependencies must be signals or functions.");

    // We create the signal with the initial value
    const [value, setValue] = useSignal(computeFn());

    const depValues = new Map(deps.map((dep, index) => [index, dep()]));
    useEffect(() => {
        let hasChanged = false;

        // We checked if any dependency changed
        deps.forEach((dep, index) => {
            const newValue = dep();
            const prevValue = depValues.get(index);

            if (!valuesChanged(newValue, prevValue)) {
                hasChanged = true;
                depValues.set(index, newValue);
            }
        });

        // We only recalculate if there are changes
        if (hasChanged) setValue(computeFn());
    });

    return value;
}
