import { signal } from "./hooks/reactivity.js";
import { sanitizeHtml } from "./utils/parser.js";
import { tryCatch } from "./utils/error.js";

const SPECIAL_PARSERS = [
    [/(true|false)/, (m) => m[0] === "true"],
    [/^[\d.]+$/, parseFloat],
    [/^[{[]/, JSON.parse],
];

/**
 * Tries to parse a given string into a more appropriate JavaScript type.
 *
 * The function trims the input string and checks if it matches any of the
 * special values defined in {@link SPECIAL_PARSERS}. If a match is found, the
 * corresponding parser function is called with the match object as an argument.
 *
 * If no match is found, the original trimmed string is returned.
 *
 * @param {any} raw - The raw input value to be parsed.
 * @returns {any} The parsed value, or the original value if no conversion is possible.
 */
function parseValue(raw) {
    if (typeof raw !== "string") return raw;
    const str = raw.trim();

    for (const [regex, parser] of SPECIAL_PARSERS) {
        if (regex.test(str)) {
            try {
                return parser(str);
            } catch {}
            break;
        }
    }
    return str;
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
