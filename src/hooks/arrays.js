export function wrapArray(arr, read) {
    if (arr?.__signalArray) return arr;

    const proxy = new Proxy(arr, {
        get(target, prop, receiver) {
            if (prop === "__signalArray") return true;
            if (prop === "__signal") return read;

            const value = Reflect.get(target, prop, receiver);
            if (typeof value !== "function") return value;
            return (...args) => {
                const result = value.apply(target, args);
                if (Array.isArray(result)) {
                    if (args.length > 0) result.__mapFn = args[0];
                    return wrapArray(result, read);
                }
                return result;
            };
        },
        set(target, prop, value, receiver) {
            if (prop === "__signalArray" || prop === "__signal") return true;
            if (Object.is(target[prop], value)) return true;
            const success = Reflect.set(target, prop, value, receiver);
            if (success) read();
            return success;
        },
    });
    return Object.assign(proxy, { __signalArray: true, __signal: read });
}
