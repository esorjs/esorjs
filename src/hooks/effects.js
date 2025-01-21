import STATE from "../globals";

/**
 * Efectos pendientes se ejecutan en microtask,
 * evitando actualizaciones sin control.
 */
export function flushEffects() {
    if (STATE.isEffectsFlushing) return;
    STATE.isEffectsFlushing = true;
    Promise.resolve().then(() => {
        const effectsToRun = new Set(STATE.pendingEffects);
        STATE.pendingEffects.clear();
        effectsToRun.forEach((effect) => effect());
        STATE.isEffectsFlushing = false;
    });
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
