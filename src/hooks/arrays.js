export function wrapArray(arr, read) {
    if (arr?.__signalArray === true) return arr;

    return new Proxy(arr, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value !== "function") return value;

            return function (...args) {
                const result = value.apply(target, args);
                if (!Array.isArray(result)) return result;

                result.__signalArray = true;
                result.__signal = read;
                result.__mapFn = args[0]; // Siempre asigna, undefined si no hay función
                return wrapArray(result, read);
            };
        },
    });
}
