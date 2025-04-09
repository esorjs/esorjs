import { signal } from "./hooks/reactivity";

/**
 * Initializes properties from attributes of a host element and observes future attribute changes.
 *
 * Iterates over the attributes of the host element and sets the corresponding property in the host's `props` object to a reactive signal.
 * The value of the signal is obtained by parsing the attribute value with the `parseAttributeValue` function.
 * Then, sets up a MutationObserver to observe future attribute changes on the host element and updates the corresponding properties.
 * The observer is added to the host's cleanup actions to ensure it is disconnected when no longer needed.
 *
 * @param {HTMLElement} host - The element whose attributes are to be used to initialize its properties.
 */
export function initPropsAndObserve(host) {
    for (const attr of host.attributes) {
        const { name, value } = attr;
        if (name.startsWith("on") || name.startsWith("ref")) continue;
        host.props[name] = signal(parseAttributeValue(value));
    }

    // Observe future changes in attributes
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const name = mutation.attributeName;
            if (!name || name.startsWith("on") || name.startsWith("ref"))
                continue;

            const sig = host.props[name];
            if (sig) sig(parseAttributeValue(host.getAttribute(name)));
        }
    });

    observer.observe(host, { attributes: true });
    host._cleanup.push(() => observer.disconnect());
}

/**
 * Parsea un valor de atributo a un tipo JS apropiado.
 *
 * Convierte un valor de atributo a un tipo JS apropiado. Si el valor es nulo o indefinido,
 * devuelve una cadena vac . Si el valor es "true" o "false", devuelve el valor booleano
 * correspondiente. Si el valor se puede parsear como un n mero (utilizando una expresi n
 * regular), devuelve el n mero. Si el valor se puede parsear como un objeto o arreglo JSON
 * (utilizando una expresi n regular y JSON.parse), devuelve el objeto o arreglo. En caso
 * contrario, devuelve el valor original.
 *
 * @param {any} value - El valor del atributo a parsear.
 * @returns {any} El valor parseado.
 */
function parseAttributeValue(value) {
    if (value === null || value === undefined) return "";
    if (value === "true") return true;
    if (value === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    if (/^[{[]/.test(value)) {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
}
