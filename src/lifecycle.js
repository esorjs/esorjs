export class Lifecycle {
    static current;
    #lc = new Map();

    constructor() {
        Lifecycle.current = this;
    }

    #hooks(t) {
        if (!this.#lc.has(t)) this.#lc.set(t, new Set());
        return this.#lc.get(t);
    }

    add(t, fn) {
        this.#hooks(t).add(fn);
        return () => this.#lc.get(t)?.delete(fn);
    }

    run(t, ctx) {
        queueMicrotask(() => {
            const hooks = this.#lc.get(t);
            if (hooks?.size) {
                for (const fn of hooks) {
                    try {
                        fn.call(ctx);
                    } catch (e) {
                        // Verificar si ctx tiene el método _catchError
                        (typeof ctx._catchError === "function"
                            ? ctx._catchError
                            : console.error)("Error in lifecycle hook:", e);
                    }
                }
            }
        });
    }

    clear(t) {
        if (t) this.#lc.delete(t);
        else this.#lc.clear();
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
