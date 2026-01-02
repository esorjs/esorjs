/**
 * State Serialization for SSR
 *
 * This module handles serialization of application state for hydration on the client.
 */

const STATE_SCRIPT_ID = '__ESOR_STATE__';

/**
 * Safely serializes a value to JSON, handling special cases
 *
 * @param {any} value - The value to serialize
 * @returns {string} JSON string
 */
const serializeValue = (value) => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'function') return 'null'; // Can't serialize functions
    if (typeof value === 'symbol') return 'null'; // Can't serialize symbols

    // Handle dates
    if (value instanceof Date) {
        return JSON.stringify({ __type: 'Date', value: value.toISOString() });
    }

    // Handle regular expressions
    if (value instanceof RegExp) {
        return JSON.stringify({ __type: 'RegExp', source: value.source, flags: value.flags });
    }

    // Handle arrays
    if (Array.isArray(value)) {
        return '[' + value.map(serializeValue).join(',') + ']';
    }

    // Handle objects
    if (typeof value === 'object') {
        const pairs = [];
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                pairs.push(JSON.stringify(key) + ':' + serializeValue(value[key]));
            }
        }
        return '{' + pairs.join(',') + '}';
    }

    // Primitives (string, number, boolean)
    return JSON.stringify(value);
};

/**
 * Deserializes a value, handling special types
 *
 * @param {any} value - The value to deserialize
 * @returns {any} Deserialized value
 */
const deserializeValue = (value) => {
    if (value === null || value === undefined) return value;

    // Handle special types
    if (typeof value === 'object') {
        if (value.__type === 'Date') {
            return new Date(value.value);
        }
        if (value.__type === 'RegExp') {
            return new RegExp(value.source, value.flags);
        }

        // Recursively deserialize objects and arrays
        if (Array.isArray(value)) {
            return value.map(deserializeValue);
        }

        const result = {};
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                result[key] = deserializeValue(value[key]);
            }
        }
        return result;
    }

    return value;
};

/**
 * Creates a script tag with serialized state for hydration
 *
 * @param {object} state - The state object to serialize
 * @returns {string} HTML script tag with state
 */
const createStateScript = (state) => {
    const serialized = serializeValue(state);
    return `<script id="${STATE_SCRIPT_ID}" type="application/json">${serialized}</script>`;
};

/**
 * Retrieves and deserializes state from the page (client-side only)
 *
 * @returns {object|null} Deserialized state or null if not found
 */
const getStateFromPage = () => {
    if (typeof document === 'undefined') {
        return null;
    }

    const script = document.getElementById(STATE_SCRIPT_ID);
    if (!script) {
        return null;
    }

    try {
        const state = JSON.parse(script.textContent);
        return deserializeValue(state);
    } catch (e) {
        console.error('Failed to parse SSR state:', e);
        return null;
    }
};

/**
 * Injects state script into HTML string
 *
 * @param {string} html - The HTML string
 * @param {object} state - The state to inject
 * @param {string} position - Where to inject ('head' or 'body', default 'body')
 * @returns {string} HTML with injected state
 */
const injectState = (html, state, position = 'body') => {
    const stateScript = createStateScript(state);

    if (position === 'head') {
        // Inject before closing </head>
        return html.replace('</head>', `${stateScript}\n</head>`);
    }

    // Inject before closing </body> or at the end
    if (html.includes('</body>')) {
        return html.replace('</body>', `${stateScript}\n</body>`);
    }

    return html + stateScript;
};

export {
    serializeValue,
    deserializeValue,
    createStateScript,
    getStateFromPage,
    injectState,
    STATE_SCRIPT_ID
};
