/**
 * SSR Rendering Module for Esor
 *
 * This module provides server-side rendering capabilities without relying on DOM APIs.
 * It converts Esor templates to HTML strings that can be sent to the client.
 */

const MARKER = "\uFEFF";
const SSR_SIGNAL_ATTR = "data-esor-signal";
const SSR_HANDLER_ATTR = "data-esor-handler";

/**
 * State tracker for SSR - collects all signal values encountered during rendering
 */
class SSRStateTracker {
    constructor() {
        this.signals = new Map(); // id -> value
        this.nextId = 0;
    }

    trackSignal(signal) {
        if (!this.signals.has(signal)) {
            const id = `s${this.nextId++}`;
            this.signals.set(signal, { id, value: signal() });
            return id;
        }
        return this.signals.get(signal).id;
    }

    getState() {
        const state = {};
        for (const [signal, { id, value }] of this.signals) {
            state[id] = value;
        }
        return state;
    }
}

/**
 * Creates a template object for SSR (similar to client-side html``)
 *
 * @param {TemplateStringsArray} strings - Template strings with placeholders
 * @param {...any} values - Values to be inserted into the template
 * @returns {object} Template object for SSR rendering
 */
const html = (strings, ...values) => {
    const keyAttrIndex = strings.findIndex((s) => s.trim().endsWith("key="));

    let key;
    let otherValues = [...values];
    if (keyAttrIndex !== -1) {
        key = values[keyAttrIndex];
        otherValues.splice(keyAttrIndex, 1);
    }

    return {
        strings,
        values: otherValues,
        _isTemplate: true,
        _key: key,
        _isSSR: true
    };
};

/**
 * Escapes HTML special characters
 */
const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

/**
 * Renders a value to HTML string
 *
 * @param {any} value - The value to render
 * @param {SSRStateTracker} tracker - State tracker for signals
 * @returns {string} HTML string
 */
const renderValue = (value, tracker) => {
    // Handle null, undefined, false
    if (value == null || value === false) {
        return '';
    }

    // Handle arrays
    if (Array.isArray(value)) {
        return value.map(v => renderValue(v, tracker)).join('');
    }

    // Handle templates
    if (value._isTemplate) {
        return renderTemplate(value, tracker);
    }

    // Handle signals - extract value and track for hydration
    if (value._isSignal) {
        const signalId = tracker.trackSignal(value);
        const actualValue = value();
        // Return the current value, marker will be added by attribute handling
        return escapeHtml(actualValue);
    }

    // Handle functions - execute them in SSR context
    if (typeof value === 'function') {
        return renderValue(value(), tracker);
    }

    // Handle primitives
    return escapeHtml(value);
};

/**
 * Processes attribute values for SSR
 *
 * @param {string} name - Attribute name
 * @param {any} value - Attribute value
 * @param {SSRStateTracker} tracker - State tracker
 * @returns {string} HTML attribute string
 */
const renderAttribute = (name, value, tracker) => {
    // Skip ref attributes in SSR
    if (name === 'ref') {
        return '';
    }

    // Handle event handlers - store for hydration
    if (name.startsWith('on')) {
        const eventName = name.slice(2).toLowerCase();
        return ` ${SSR_HANDLER_ATTR}="${eventName}"`;
    }

    // Handle style objects
    if (name === 'style' && typeof value === 'object' && !Array.isArray(value)) {
        const styleStr = Object.entries(value)
            .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${v}`)
            .join(';');
        return ` style="${escapeHtml(styleStr)}"`;
    }

    // Handle signals in attributes
    if (value?._isSignal) {
        const signalId = tracker.trackSignal(value);
        const actualValue = value();

        if (name === 'value' || name === 'checked' || name === 'selected') {
            // For form elements, set both attribute and add signal marker
            return ` ${name}="${escapeHtml(actualValue)}" ${SSR_SIGNAL_ATTR}="${signalId}:${name}"`;
        }

        if (actualValue == null || actualValue === false) {
            return ` ${SSR_SIGNAL_ATTR}="${signalId}:${name}"`;
        }

        return ` ${name}="${escapeHtml(actualValue === true ? '' : actualValue)}" ${SSR_SIGNAL_ATTR}="${signalId}:${name}"`;
    }

    // Handle functions in attributes
    if (typeof value === 'function') {
        return renderAttribute(name, value(), tracker);
    }

    // Handle boolean attributes
    if (value === true) {
        return ` ${name}`;
    }

    if (value === false || value == null) {
        return '';
    }

    // Handle special form element properties
    if (name === 'value' || name === 'checked' || name === 'selected') {
        return ` ${name}="${escapeHtml(value)}"`;
    }

    // Regular attributes
    return ` ${name}="${escapeHtml(value)}"`;
};

/**
 * Renders a template to HTML string
 *
 * @param {object} templateObj - Template object with strings and values
 * @param {SSRStateTracker} tracker - State tracker for signals
 * @returns {string} HTML string
 */
const renderTemplate = (templateObj, tracker) => {
    const { strings, values } = templateObj;
    let html = '';
    let valueIndex = 0;

    for (let i = 0; i < strings.length; i++) {
        const str = strings[i];

        // Add the static string part
        html += str.replace(MARKER, '');

        // Add the dynamic value if we're not at the end
        if (i < values.length) {
            const value = values[valueIndex++];

            // Check if this is an attribute value (previous string ends with =)
            const isAttribute = str.trimEnd().endsWith('=');

            if (isAttribute) {
                // Extract attribute name
                const attrMatch = str.match(/\s+(\w+(?:-\w+)*)=$/);
                if (attrMatch) {
                    const attrName = attrMatch[1];
                    // Remove the = we already added
                    html = html.slice(0, -1);
                    html += renderAttribute(attrName, value, tracker);
                }
            } else {
                // Text content
                if (value?._isSignal) {
                    const signalId = tracker.trackSignal(value);
                    const actualValue = value();
                    html += `<span ${SSR_SIGNAL_ATTR}="${signalId}:text">${escapeHtml(actualValue)}</span>`;
                } else if (typeof value === 'function') {
                    const result = value();
                    if (result?._isSignal) {
                        const signalId = tracker.trackSignal(result);
                        const actualValue = result();
                        html += `<span ${SSR_SIGNAL_ATTR}="${signalId}:text">${escapeHtml(actualValue)}</span>`;
                    } else {
                        html += renderValue(result, tracker);
                    }
                } else {
                    html += renderValue(value, tracker);
                }
            }
        }
    }

    return html;
};

/**
 * Renders a template to an HTML string with state
 *
 * @param {object} template - The template object to render
 * @returns {{ html: string, state: object }} Object containing HTML and state for hydration
 */
const renderToString = (template) => {
    if (!template || !template._isTemplate) {
        throw new Error('renderToString expects a template created with html``');
    }

    const tracker = new SSRStateTracker();
    const htmlString = renderTemplate(template, tracker);
    const state = tracker.getState();

    return { html: htmlString, state };
};

export { html, renderToString, renderValue, renderTemplate };
