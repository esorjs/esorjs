import { error } from "./logger";

export class Lifecycle {
    #lifecycle = new Map();
    static current = null;

    constructor() {
        Lifecycle.current = this;
    }

    #getHooksSet(type) {
        if (!this.#lifecycle.has(type)) {
            this.#lifecycle.set(type, new Set());
        }
        return this.#lifecycle.get(type);
    }

    add(type, callback) {
        this.#getHooksSet(type).add(callback);
        return () => this.#lifecycle.get(type)?.delete(callback);
    }

    runHooks(type, context) {
        this.#lifecycle.get(type)?.forEach((hook) => hook.call(context));
    }

    clearHooks(type) {
        type ? this.#lifecycle.delete(type) : this.#lifecycle.clear();
    }
}

function getLifecycle() {
    if (!Lifecycle.current) error("Lifecycle has not been established yet.");
    return Lifecycle.current;
}

export const beforeMount = (cb) => getLifecycle().add("beforeMount", cb);
export const onMount = (cb) => getLifecycle().add("mount", cb);
export const beforeUpdate = (cb) => getLifecycle().add("beforeUpdate", cb);
export const onUpdate = (cb) => getLifecycle().add("update", cb);
export const onDestroy = (cb) => getLifecycle().add("destroy", cb);

/**
 * onEffect: registra un callback que se ejecuta en el ciclo de vida;
 * si retorna una función, se asume como cleanup.
 */
export const onEffect = (cb) => {
    const cleanup = cb();
    if (cleanup instanceof Function) {
        getLifecycle().add("destroy", cleanup);
        return () => cleanup();
    }
    return () => {};
};
