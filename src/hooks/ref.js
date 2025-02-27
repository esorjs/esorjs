export function ref(initialValue = null) {
    let current = initialValue;
    const refFn = (v) => (v !== undefined ? (current = v) : current);
    Object.defineProperty(refFn, "current", {
        get: () => current,
        set: (v) => (current = v),
        enumerable: true,
    });
    return refFn;
}
