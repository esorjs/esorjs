/**
 * Client-side Hydration for SSR
 *
 * This module activates reactivity on server-rendered content.
 */

import { effect } from '../hooks/reactivity.js';
import { getStateFromPage } from './serialize.js';

const SSR_SIGNAL_ATTR = 'data-esor-signal';
const SSR_HANDLER_ATTR = 'data-esor-handler';

/**
 * Hydrates a DOM element with reactive signals
 *
 * @param {HTMLElement} root - The root element to hydrate
 * @param {object} signalMap - Map of signal IDs to signal functions
 * @param {object} state - Initial state from SSR
 */
const hydrateElement = (root, signalMap, state) => {
    // Find all elements with signal markers
    const signalElements = root.querySelectorAll(`[${SSR_SIGNAL_ATTR}]`);

    for (const element of signalElements) {
        const signalData = element.getAttribute(SSR_SIGNAL_ATTR);
        const [signalId, bindType] = signalData.split(':');

        const signal = signalMap[signalId];
        if (!signal) {
            console.warn(`Signal ${signalId} not found in signal map`);
            continue;
        }

        // Initialize signal with SSR value if available
        if (state && signalId in state) {
            signal(state[signalId]);
        }

        // Set up reactive binding based on type
        if (bindType === 'text') {
            // Text content binding
            effect(() => {
                element.textContent = signal();
            });
        } else {
            // Attribute binding
            effect(() => {
                const value = signal();

                if (bindType === 'value' || bindType === 'checked' || bindType === 'selected') {
                    // Form element properties
                    element[bindType] = value;
                } else if (value == null || value === false) {
                    // Remove attribute for falsy values
                    element.removeAttribute(bindType);
                } else {
                    // Set attribute
                    element.setAttribute(bindType, value === true ? '' : value);
                }
            });
        }

        // Clean up the hydration marker
        element.removeAttribute(SSR_SIGNAL_ATTR);
    }
};

/**
 * Hydrates event handlers on elements
 *
 * @param {HTMLElement} root - The root element to hydrate
 * @param {object} handlerMap - Map of event names to handler functions
 */
const hydrateEventHandlers = (root, handlerMap) => {
    if (!handlerMap) return;

    const handlerElements = root.querySelectorAll(`[${SSR_HANDLER_ATTR}]`);

    for (const element of handlerElements) {
        const eventName = element.getAttribute(SSR_HANDLER_ATTR);
        const handler = handlerMap[eventName];

        if (handler && typeof handler === 'function') {
            element.addEventListener(eventName, handler);

            // Store cleanup function
            if (!element._cleanup) {
                element._cleanup = () => element.removeEventListener(eventName, handler);
            }
        }

        // Clean up the hydration marker
        element.removeAttribute(SSR_HANDLER_ATTR);
    }
};

/**
 * Main hydration function - activates reactivity on SSR content
 *
 * @param {HTMLElement|string} target - Root element or selector to hydrate
 * @param {object} options - Hydration options
 * @param {object} options.signals - Map of signal IDs to signal functions
 * @param {object} [options.handlers] - Map of event names to handler functions
 * @param {object} [options.state] - Initial state (if not auto-detected)
 * @returns {void}
 */
const hydrate = (target, options = {}) => {
    // Resolve target element
    const root = typeof target === 'string'
        ? document.querySelector(target)
        : target;

    if (!root) {
        throw new Error(`Hydration target not found: ${target}`);
    }

    // Get state from page if not provided
    const state = options.state ?? getStateFromPage();

    // Hydrate signals
    if (options.signals) {
        hydrateElement(root, options.signals, state);
    }

    // Hydrate event handlers
    if (options.handlers) {
        hydrateEventHandlers(root, options.handlers);
    }
};

/**
 * Creates a hydration-ready component wrapper
 *
 * This function wraps a component setup function to make it hydration-aware.
 * It will skip initial rendering if SSR content is detected and instead hydrate the existing DOM.
 *
 * @param {Function} setupFn - The component setup function
 * @returns {Function} Hydration-aware setup function
 */
const createHydratableComponent = (setupFn) => {
    return function(props) {
        const template = setupFn.call(this, props);

        // Check if we're in a hydration scenario
        const isHydrating = this.shadowRoot?.querySelector(`[${SSR_SIGNAL_ATTR}]`) !== undefined;

        if (isHydrating) {
            // Extract signals from template for hydration
            // This requires the component to expose its signals
            if (this._signals) {
                const state = getStateFromPage();
                hydrateElement(this.shadowRoot, this._signals, state);
            }

            // Return the template but skip re-rendering
            // The existing DOM will be hydrated instead
            return template;
        }

        // Normal client-side rendering
        return template;
    };
};

/**
 * Checks if the current page contains SSR content
 *
 * @returns {boolean} True if SSR content is detected
 */
const isSSRContent = () => {
    if (typeof document === 'undefined') {
        return false;
    }

    return document.querySelector(`[${SSR_SIGNAL_ATTR}]`) !== null ||
           getStateFromPage() !== null;
};

export {
    hydrate,
    hydrateElement,
    hydrateEventHandlers,
    createHydratableComponent,
    isSSRContent
};
