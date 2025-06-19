const NUM_REGEX = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/;

/**
 * Parses a given attribute value string into an appropriate JavaScript type.
 *
 * - If the value is `null` or `undefined`, returns an empty string.
 * - If the value is the string "true", returns the boolean `true`.
 * - If the value is the string "false", returns the boolean `false`.
 * - If the value matches the numeric regular expression, returns a `Number`.
 * - If the value is a string that looks like JSON (starts with '{' or '['),
 *   attempts to parse it as JSON and returns the result. If parsing fails,
 *   returns the original string.
 * - Otherwise, returns the original string value.
 *
 * @param {string} v - The attribute value to parse.
 * @returns {any} - The parsed value in an appropriate JavaScript type.
 */
export const parseAttributeValue = (v) => {
    if (v == null) return "";
    if (v === "true") return true;
    if (v === "false") return false;
    if (NUM_REGEX.test(v)) return Number(v);
    if (typeof v === "string" && (v[0] === "{" || v[0] === "[")) {
        try {
            return JSON.parse(v);
        } catch {}
    }
    return v;
};

/**
 * Initializes properties from attributes of a host element.
 *
 * @param {HTMLElement} h - Element host
 */
export const initializeProps = (h) => {
    h._functionProps && Object.assign(h.props, h._functionProps);
    for (const { name: n, value: v } of h.attributes) {
        if (n.startsWith("on") || n.startsWith("ref")) continue;
        if (v === "function" && h._functionProps?.[n]) continue;
        h.props[n] = parseAttributeValue(v);
    }
};
