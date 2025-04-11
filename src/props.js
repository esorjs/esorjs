import { signal } from "./hooks/reactivity.js";

const NUM_REGEX = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/;

/**
 * Parse an attribute value to an appropriate JS type.
 *
 * Converts an attribute value to an appropriate JS type. If the value is null or undefined,
 * Returns an empty string. If the value is “true” or “false”, returns the corresponding boolean value.
 * corresponding boolean value. If the value can be parsed as a number (using a regular expression), * returns the corresponding boolean * value.
 If the value can be parsed as a number (using a regular * expression), it returns the number. If the value can be parsed as a JSON object or array (using a regular * expression), returns the number.
 * (using a regular expression and JSON.parse), returns the object or array. Otherwise, it returns the original value.
 * otherwise, it returns the original value.
 *
 * @param {any} value - The value of the attribute to parse.
 * @returns {any} The parsed value.
 */
function parseAttributeValue(value) {
    if (value == null) return "";
    if (value === "true") return true;
    if (value === "false") return false;
    if (NUM_REGEX.test(value)) return Number(value);
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

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
