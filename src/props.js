import { signal } from "./hooks/reactivity";
import { sanitizeHtml } from "./utils/parser";
import { tryCatch } from "./utils/error";
 
// Special values as constant object
const SPECIAL_VALUES = {
    true: true,
    false: false,
    null: null,
    undefined: undefined,
    nan: NaN,
    infinity: Infinity,
    "-infinity": -Infinity,
};

/**
 * Parses a raw input value and attempts to convert it to a more appropriate JavaScript type.
 *
 * If the input is not a string, it is returned as is.
 * The function trims the input string and converts it to lowercase to check for special values
 * such as true, false, null, etc. If the trimmed string matches a special value, the corresponding
 * JavaScript type is returned. If the string can be converted to a number, the numeric value is
 * returned. If the string is in a JSON format (object or array), it attempts to parse it as JSON.
 * If all conversions fail, the original trimmed string is returned.
 *
 * @param {any} raw - The raw input value to be parsed.
 * @returns {any} The parsed value converted to an appropriate JavaScript type, or the original
 * value if no conversion is possible.
 */

function parseValue(raw) {
    if (typeof raw !== "string") return raw;
    const str = raw.trim();
    const lower = str.toLowerCase();

    return (
        SPECIAL_VALUES[lower] ??
        (/^[\d.]+$/.test(str)
            ? parseFloat(str)
            : str[0] === "{" || str[0] === "["
            ? parseJson(str)
            : str)
    );
}

function parseJson(str) {
    try {
        return JSON.parse(str);
    } catch {}
}

const shouldSkipAttribute = (name) =>
    name.startsWith("ref") || name.startsWith("on");

/**
 * Initializes properties from attributes of a host element.
 *
 * Iterates over the attributes of the element and sets the corresponding property in the host's `props` object to a reactive signal.
 * The value of the signal is obtained by parsing the attribute value with the `parseValue` function.
 *
 * @param {HTMLElement} host - The element whose attributes are to be used to initialize its properties.
 */
const initAttributes = (host) => {
    const attrs = host.attributes;
    for (let i = 0; i < attrs.length; i++) {
        const { name, value } = attrs[i];
        // Skip special attributes
        if (shouldSkipAttribute(name)) continue;
        host.props[name] = signal(parseValue(sanitizeHtml(value)));
    }
};

/**
 * Observes changes to the attributes of a host element and updates corresponding reactive signals.
 *
 * This function sets up a MutationObserver that listens for attribute changes on the specified host element.
 * When an attribute changes, it checks if there is a corresponding reactive signal in the host's `props` object.
 * If a signal exists, it updates the signal with the new value of the attribute, parsed using the `parseValue` function.
 * The observer is added to the host's cleanup actions to ensure it is disconnected when no longer needed.
 *
 * @param {HTMLElement} host - The element whose attributes are to be observed for changes.
 */

const observeAttributes = (host) => {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const attrName = mutation.attributeName;
            if (!attrName) continue;
            if (shouldSkipAttribute(attrName)) continue;
            const sig = host.props[attrName];
            if (sig) sig(parseValue(host.getAttribute(attrName) || ""));
        }
    });

    observer.observe(host, { attributes: true });
    host._cleanup.push(() => observer.disconnect());
};

/**
 * Initializes properties from attributes and observes future attribute changes.
 *
 * Initializes properties from attributes of the host element by calling `initAttributes`.
 * Then, sets up a MutationObserver to observe future attribute changes on the host element and updates the corresponding properties.
 *
 * @param {HTMLElement} host - The element whose properties are to be initialized and attributes observed.
 */
export const initPropsAndObserve = (host) => {
    tryCatch(() => {
        initAttributes(host);
        observeAttributes(host);
    }, "props.initPropsAndObserve");
};
