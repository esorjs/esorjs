/**
 * Component Helpers for Native SSR
 *
 * Extends HTMLElement with helpers for working with SSR
 */

import { getSSRState, bindSignals, bindHandlers } from './native.js';
import { effect } from '../hooks/reactivity.js';

/**
 * Checks if this component was server-side rendered
 *
 * @returns {boolean} True if SSR content exists
 */
export function isSSR() {
    return !!this.shadowRoot && this.shadowRoot.querySelector('[data-esor-state]') !== null;
}

/**
 * Gets SSR state for this component
 *
 * @returns {object|null} SSR state or null
 */
export function getState() {
    return getSSRState(this.shadowRoot);
}

/**
 * Binds a single signal to elements with data-esor-bind attribute
 *
 * @param {string} name - Signal name
 * @param {Function} signal - Signal function
 */
export function bindSignal(name, signal) {
    if (!this.shadowRoot || !signal._isSignal) return;

    // Bind to text content
    const textElements = this.shadowRoot.querySelectorAll(`[data-esor-bind="${name}"]`);
    textElements.forEach(element => {
        effect(() => {
            element.textContent = signal();
        });
        element.removeAttribute('data-esor-bind');
    });

    // Bind to attributes
    const attrElements = this.shadowRoot.querySelectorAll(`[data-esor-bind-*="${name}"]`);
    attrElements.forEach(element => {
        Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('data-esor-bind-') && attr.value === name)
            .forEach(attr => {
                const attrName = attr.name.replace('data-esor-bind-', '');

                effect(() => {
                    const value = signal();
                    if (value == null || value === false) {
                        element.removeAttribute(attrName);
                    } else {
                        element.setAttribute(attrName, value === true ? '' : value);
                    }
                });

                element.removeAttribute(attr.name);
            });
    });
}

/**
 * Binds multiple signals at once
 *
 * @param {object} signals - Map of signal names to signal functions
 */
export function bindAllSignals(signals) {
    if (!signals) return;

    Object.entries(signals).forEach(([name, signal]) => {
        this.bindSignal(name, signal);
    });
}

/**
 * Binds an event handler to elements with data-esor-on attribute
 *
 * @param {string} event - Event name (e.g., 'click')
 * @param {Function} handler - Event handler function
 */
export function bindHandler(event, handler) {
    if (!this.shadowRoot) return;

    const elements = this.shadowRoot.querySelectorAll(`[data-esor-on-${event}]`);
    elements.forEach(element => {
        element.addEventListener(event, handler);
        element.removeAttribute(`data-esor-on-${event}`);
    });
}

/**
 * Binds multiple handlers at once
 *
 * @param {object} handlers - Map of event names to handler functions
 */
export function bindAllHandlers(handlers) {
    if (!handlers) return;

    Object.entries(handlers).forEach(([event, handler]) => {
        this.bindHandler(event, handler);
    });
}

/**
 * Auto-binds signals and handlers based on SSR markers
 *
 * @param {object} options - Signals and handlers to bind
 * @param {object} options.signals - Signal map
 * @param {object} options.handlers - Handler map
 */
export function autoBind(options = {}) {
    const { signals, handlers } = options;

    if (signals) {
        this.bindAllSignals(signals);
    }

    if (handlers) {
        this.bindAllHandlers(handlers);
    }
}

/**
 * Installs SSR helpers on HTMLElement prototype
 *
 * This allows all custom elements to use SSR helpers
 */
export function installSSRHelpers() {
    if (typeof HTMLElement === 'undefined') return;

    // Only install once
    if (HTMLElement.prototype.isSSR) return;

    Object.defineProperties(HTMLElement.prototype, {
        isSSR: {
            value: isSSR,
            writable: false,
            configurable: false
        },
        getSSRState: {
            value: getState,
            writable: false,
            configurable: false
        },
        bindSignal: {
            value: bindSignal,
            writable: false,
            configurable: false
        },
        bindAllSignals: {
            value: bindAllSignals,
            writable: false,
            configurable: false
        },
        bindHandler: {
            value: bindHandler,
            writable: false,
            configurable: false
        },
        bindAllHandlers: {
            value: bindAllHandlers,
            writable: false,
            configurable: false
        },
        autoBind: {
            value: autoBind,
            writable: false,
            configurable: false
        }
    });
}

// Auto-install in browser
if (typeof window !== 'undefined') {
    installSSRHelpers();
}

export default {
    isSSR,
    getState,
    bindSignal,
    bindAllSignals,
    bindHandler,
    bindAllHandlers,
    autoBind,
    installSSRHelpers
};
