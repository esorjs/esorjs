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
 * @param {any} v - The value of the attribute to parse.
 * @returns {any} The parsed value.
 */
function parseAttributeValue(v) {
    if (v == null) return "";
    if (v === "true") return true;
    if (v === "false") return false;
    if (NUM_REGEX.test(v)) return Number(v);
    if (typeof v === "string" && (v[0] === "{" || v[0] === "["))
        try {
            return JSON.parse(v);
        } catch {}

    return v;
}

/**
 * Initializes properties from attributes of a host element.
 *
 * Iterates over the attributes of the host element and sets the corresponding property in the host's `props` object to a reactive signal.
 * The value of the signal is obtained by parsing the attribute value with the `parseAttributeValue` function.
 *
 * @param {HTMLElement} host - The element whose attributes are to be used to initialize its properties.
 */
export function initializeProps(host) {
    for (const attr of host.attributes) {
        const { name, value } = attr;
        if (name.startsWith("on") || name.startsWith("ref")) continue;
        host.props[name] = signal(parseAttributeValue(value));
    }
}
