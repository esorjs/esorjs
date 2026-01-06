/**
 * Simplified SSR API for Esorjs
 *
 * Ultra-simple API that works with existing component() function.
 * No new concepts, just SSR support for existing components.
 */

import { renderToNativeSSR, getSSRState, bindSignals, bindHandlers } from './native.js';
import { signal as _signal, computed as _computed } from '../hooks/reactivity.js';

// Track SSR context for automatic signal collection
let ssrContext = null;

/**
 * Enhanced signal that auto-registers in SSR context
 */
export function signal(initialValue) {
    const sig = _signal(initialValue);

    // Auto-register in SSR context if exists
    if (ssrContext) {
        const id = `s${ssrContext.signals.size}`;
        ssrContext.signals.set(id, sig);
        sig._ssrId = id;
    }

    return sig;
}

/**
 * Enhanced computed that auto-registers in SSR context
 */
export function computed(fn) {
    const comp = _computed(fn);

    // Auto-register in SSR context if exists
    if (ssrContext) {
        const id = `c${ssrContext.signals.size}`;
        ssrContext.signals.set(id, comp);
        comp._ssrId = id;
    }

    return comp;
}

/**
 * Renders a component to HTML (server-side)
 *
 * @param {Function} Component - Component function (from component())
 * @param {object} props - Component props
 * @returns {object} { html, state }
 *
 * @example
 * const Counter = component(() => {
 *   const count = signal(0);
 *   return html`<div>${count}</div>`;
 * });
 *
 * const { html, state } = renderComponent(Counter);
 */
export function renderComponent(Component, props = {}) {
    // Create SSR context
    ssrContext = {
        signals: new Map(),
        props
    };

    try {
        // Execute component to get template
        const template = Component.call({ props }, props);

        // Extract signal state
        const state = {};
        for (const [id, sig] of ssrContext.signals) {
            state[id] = sig();
        }

        // Get component name from function
        const tagName = Component._tagName || 'esor-component';

        // Render using native DSD if available, fallback to enhanced
        if (typeof renderToNativeSSR === 'function') {
            // Use native DSD approach
            return {
                html: renderToNativeSSR(tagName, {
                    template: processTemplate(template, ssrContext.signals),
                    state
                }),
                state,
                tagName
            };
        } else {
            // Fallback to enhanced approach
            const { renderToString } = await import('./render.js');
            const { html, state: templateState } = renderToString(template);
            return {
                html,
                state: { ...state, ...templateState },
                tagName
            };
        }
    } finally {
        ssrContext = null;
    }
}

/**
 * Hydrates a server-rendered component (client-side)
 *
 * @param {string|HTMLElement} target - Target element or selector
 * @param {Function} Component - Component function (same as server)
 * @param {object} props - Component props (same as server)
 *
 * @example
 * const Counter = component(() => {
 *   const count = signal(0);
 *   return html`<div>${count}</div>`;
 * });
 *
 * hydrateComponent('#app', Counter);
 */
export function hydrateComponent(target, Component, props = {}) {
    const element = typeof target === 'string'
        ? document.querySelector(target)
        : target;

    if (!element) {
        throw new Error(`Hydration target not found: ${target}`);
    }

    // Check if element has SSR content
    const customElement = element.querySelector('[data-esor-state]')?.parentElement;

    if (customElement && customElement.shadowRoot) {
        // Native DSD approach - shadow root already exists
        const state = getSSRState(customElement.shadowRoot);

        // Create SSR context for signal collection
        ssrContext = {
            signals: new Map(),
            props: { ...props, ...state }
        };

        try {
            // Execute component to create signals with SSR values
            Component.call(customElement, props);

            // Bind signals to SSR-rendered elements
            const signalMap = {};
            for (const [id, sig] of ssrContext.signals) {
                signalMap[id] = sig;
            }

            bindSignals(customElement.shadowRoot, signalMap);
        } finally {
            ssrContext = null;
        }
    } else {
        // No SSR content, render normally
        const template = Component.call(element, props);
        const { renderTemplate } = await import('../template/render.js');
        renderTemplate(element, template);
    }
}

/**
 * Processes template for SSR
 */
function processTemplate(template, signalMap) {
    if (!template || !template._isTemplate) {
        return String(template || '');
    }

    // Convert template to HTML string with data attributes for signals
    let html = '';
    const { template: tmpl, values } = template;

    // This is a simplified version - full implementation would process
    // the template content to add data-esor-bind attributes
    return template;
}

// Export everything
export { renderComponent, hydrateComponent, signal, computed };
