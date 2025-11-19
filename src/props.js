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

    // Optimización: verificar primer caracter antes de regex
    const first = v[0];
    if (first === "-" || (first >= "0" && first <= "9")) {
        const num = +v;
        if (num === num) return num; // NaN check
    }

    if (first === "{" || first === "[") {
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
    if (h._functionProps) {
        Object.assign(h.props, h._functionProps);
    }
    const attrs = h.attributes;
    for (let i = 0; i < attrs.length; i++) {
        const { name: n, value: v } = attrs[i];
        const first = n[0];
        const second = n[1];

        // Skip event handlers y refs (optimización de string checks)
        if (
            (first === "o" && second === "n") ||
            (first === "r" && second === "e" && n[2] === "f")
        )
            continue;
        if (v === "function" && h._functionProps?.[n]) continue;

        h.props[n] = parseAttributeValue(v);
    }
};
