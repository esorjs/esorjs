import { error } from "./logger.js";

export class LifecycleSystem {
    lifecycle = new Map();
    static current = null;

    constructor() {
        LifecycleSystem.current = this;
    }

    add(type, callback) {
        (
            this.lifecycle.get(type) ||
            this.lifecycle.set(type, new Set()).get(type)
        ).add(callback);
        return () => this.lifecycle.get(type)?.delete(callback);
    }

    runHooks(type, context) {
        this.lifecycle.get(type)?.forEach((hook) => hook.call(context));
    }

    clearHooks(type) {
        type ? this.lifecycle.delete(type) : this.lifecycle.clear();
    }
}

const getLifecycle = () => {
    if (!LifecycleSystem.current)
        error("LifecycleSystem has not been established yet.");
    return LifecycleSystem.current;
};

export const beforeMount = (cb) => getLifecycle().add("beforeMount", cb);
export const onMount = (cb) => getLifecycle().add("mount", cb);
export const beforeUpdate = (cb) => getLifecycle().add("beforeUpdate", cb);
export const onUpdate = (cb) => getLifecycle().add("update", cb);
export const onDestroy = (cb) => getLifecycle().add("destroy", cb);

export const onEffect = (cb) => {
    const cleanup = cb();
    return cleanup instanceof Function
        ? (getLifecycle().add("destroy", cleanup), () => cleanup())
        : () => {};
};
