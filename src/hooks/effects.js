import STATE from "../globals";
import { error } from "../logger";

/**
 * Efectos pendientes se ejecutan en microtask,
 * evitando actualizaciones sin control.
 */
export function flushEffects() {
    if (STATE.isEffectsFlushing) return;
    STATE.isEffectsFlushing = true;

    const effectsToRun = Array.from(STATE.pendingEffects);
    STATE.pendingEffects.clear();

    for (const effect of effectsToRun) {
        if (typeof effect === "function") effect();
        else error("Non-function in flushEffects:", effect);
    }

    STATE.isEffectsFlushing = false;
}

/**
 * useEffect: registra una función "effect" que se re-ejecuta al cambiar
 * signals leídos durante su ejecución.
 */
export function useEffect(fn) {
    const effect = () => {
        const prevEffect = STATE.currentEffect;
        STATE.currentEffect = effect;
        try {
            return fn();
        } finally {
            STATE.currentEffect = prevEffect;
        }
    };
    effect(); // Ejecuta inmediatamente la primera vez
    return effect;
}
