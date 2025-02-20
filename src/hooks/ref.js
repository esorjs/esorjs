export function ref(initialValue = null) {
    let ref = initialValue;

    return new Proxy(() => {}, {
        apply: (__, _, args) => (args.length ? (ref = args[0]) : ref),
        get: (_, prop) => ref && (ref[prop] === undefined ? ref : ref[prop]),
        set: (_, prop, value) => !!ref && ((ref[prop] = value), true),
    });
}
