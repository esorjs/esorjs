// Global mutable state
const STATE = {
    currentEffect: null,
    currentComponent: null,
    pendingEffects: new Set(),
    isEffectsFlushing: false,
    globalEvents: {
        handlersByType: new Map(),
        nextId: 0,
    },
};

export default STATE;