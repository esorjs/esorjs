const arraysCache = new WeakMap();

/**
 * Función genérica para envolver arrays en un Proxy que
 * intercepte cualquier acceso y los haga reactivos.
 */
export function wrapArray(arr, read) {
    if (arr && arr.__signalArray === true) return arr;
    if (arraysCache.has(arr)) return arraysCache.get(arr);

    const proxy = new Proxy(arr, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === "function") {
                return function (...args) {
                    const result = value.apply(target, args);
                    if (Array.isArray(result)) {
                        result.__signalArray = true;
                        result.__signal = read;
                        if (args.length > 0 && typeof args[0] === "function")
                            result.__mapFn = args[0];

                        return wrapArray(result, read);
                    }
                    return result;
                };
            }
            return value;
        },
    });

    arraysCache.set(arr, proxy);
    return proxy;
}
