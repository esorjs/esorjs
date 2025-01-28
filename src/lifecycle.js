export class Lifecycle {
    static current;
    #lc = new Map();

    constructor() {
        Lifecycle.current = this;
    }

    #hooks(t) {
        return this.#lc.has(t) || this.#lc.set(t, new Set()), this.#lc.get(t);
    }

    add(t, fn) {
        this.#hooks(t).add(fn);
        return () => this.#lc.get(t)?.delete(fn);
    }
    run(t, ctx) {
        this.#lc.get(t)?.forEach((fn) => {
            try {
                fn.call(ctx);
            } catch (e) {
                ctx._catchError(e);
            }
        });
    }
    clear(t) {
        t ? this.#lc.delete(t) : this.#lc.clear();
    }
}

const getLC = () =>
    Lifecycle.current ||
    (() => {
        throw "Lifecycle not initialized";
    })();

export const [beforeMount, onMount, beforeUpdate, onUpdate, onDestroy] = [
    "beforeMount",
    "mount",
    "beforeUpdate",
    "update",
    "destroy",
].map((t) => (fn) => getLC().add(t, fn));

export const onEffect = (fn) => {
    const clean = fn();
    return (
        (clean instanceof Function && getLC().add("destroy", clean)) ||
        (() => {})
    );
};
