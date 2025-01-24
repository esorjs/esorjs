// Métodos para arrays reactivas:
const ARRAY_METHODS = [
    "map",
    "filter",
    "find",
    "findIndex",
    "slice",
    "concat",
    "reduce",
    "every",
    "some",
    "includes",
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "reverse",
    "sort",
];

export function addSignalMap(arr, read) {
    for (const method of ARRAY_METHODS) {
        const fn = arr[method];
        arr[method] = (...args) => {
            const result = fn.apply(arr, args);
            if (result instanceof Array) {
                result.__signalArray = true;
                result.__signal = read;
                result.__mapFn = args[0];
            }
            return result;
        };
    }
    return arr;
}
