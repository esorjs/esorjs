import STATE from '../globals.js';

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
    
    // See if there is an observedAttributes statement that matches the current one.
    effect();
    return effect;
}
