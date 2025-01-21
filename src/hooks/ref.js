/**
 * useRef: devuelve un objeto mutable cuyo valor .current se asigna
 * al elemento DOM real.
 */
export function useRef() {
    let ref = null;
    return new Proxy(() => {}, {
        apply: (_, __, [arg]) => (ref = arg),
        get: (_, prop) => ref?.[prop]?.bind?.(ref) || ref?.[prop],
        set: (_, prop, value) => (ref ? ((ref[prop] = value), true) : false),
    });
}
