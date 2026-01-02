/**
 * Enhanced SSR API for Esorjs
 *
 * Provides a cleaner, more ergonomic API for server-side rendering
 * similar to SolidJS but maintaining Esorjs philosophy.
 */

import { signal as _signal, computed as _computed, effect } from '../hooks/reactivity.js';
import { renderToString as _renderToString } from './render.js';
import { hydrate as _hydrate, isSSRContent } from './hydrate.js';
import { renderTemplate as _renderTemplate } from '../template/render.js';

// SSR Context for automatic signal tracking
let ssrContext = null;

/**
 * Creates an SSR-aware component with automatic signal tracking
 *
 * @example
 * const Counter = createSSRComponent(() => {
 *   const count = signal(0);
 *   const doubled = computed(() => count() * 2);
 *
 *   return {
 *     template: html`
 *       <div>
 *         <p>Count: ${count}</p>
 *         <p>Doubled: ${doubled}</p>
 *         <button onclick=${() => count(count() + 1)}>+1</button>
 *       </div>
 *     `,
 *     // Optional: export signals for external access
 *     state: { count, doubled }
 *   };
 * });
 */
export function createSSRComponent(setupFn) {
    return function(props = {}) {
        // Create a new context for this component
        const context = {
            signals: new Map(),
            handlers: new Map(),
            props
        };

        // Set current context
        const prevContext = ssrContext;
        ssrContext = context;

        try {
            // Run setup function
            const result = setupFn(props);

            // Return both template and context
            return {
                template: result.template || result,
                context,
                state: result.state || {}
            };
        } finally {
            ssrContext = prevContext;
        }
    };
}

/**
 * Enhanced signal that auto-registers with SSR context
 */
export function signal(initialValue) {
    const sig = _signal(initialValue);

    // Auto-register with SSR context if exists
    if (ssrContext) {
        const id = `s${ssrContext.signals.size}`;
        ssrContext.signals.set(id, sig);
        sig._ssrId = id;
    }

    return sig;
}

/**
 * Enhanced computed that auto-registers with SSR context
 */
export function computed(fn) {
    const comp = _computed(fn);

    // Auto-register with SSR context if exists
    if (ssrContext) {
        const id = `c${ssrContext.signals.size}`;
        ssrContext.signals.set(id, comp);
        comp._ssrId = id;
    }

    return comp;
}

/**
 * Creates an event handler that auto-registers with SSR context
 */
export function handler(name, fn) {
    if (ssrContext) {
        ssrContext.handlers.set(name, fn);
    }
    return fn;
}

/**
 * Renders an SSR component to string with automatic state extraction
 *
 * @example
 * const Counter = createSSRComponent(() => { ... });
 * const { html, state, handlers } = renderComponent(Counter);
 */
export function renderComponent(Component, props = {}) {
    const { template, context } = Component(props);

    // Render template to string
    const { html, state: templateState } = _renderToString(template);

    // Extract signal state from context
    const signalState = {};
    for (const [id, sig] of context.signals) {
        signalState[id] = sig();
    }

    // Merge states
    const state = { ...templateState, ...signalState };

    return {
        html,
        state,
        signals: Object.fromEntries(context.signals),
        handlers: Object.fromEntries(context.handlers)
    };
}

/**
 * Simplified hydration that works with createSSRComponent
 *
 * @example
 * // Client-side
 * const Counter = createSSRComponent(() => { ... });
 * hydrateComponent('#app', Counter);
 */
export function hydrateComponent(target, Component, props = {}) {
    const { context } = Component(props);

    // Auto-hydrate with context
    _hydrate(target, {
        signals: Object.fromEntries(context.signals),
        handlers: Object.fromEntries(context.handlers)
    });
}

/**
 * Creates a server/client isomorphic component
 *
 * This is the cleanest API - same code works on server and client!
 *
 * @example
 * // counter.js (works on both server and client!)
 * export const Counter = defineComponent(() => {
 *   const count = signal(0);
 *
 *   return html`
 *     <div>
 *       <p>Count: ${count}</p>
 *       <button onclick=${() => count(count() + 1)}>Increment</button>
 *     </div>
 *   `;
 * });
 *
 * // server.js
 * import { renderToString } from 'esor/ssr';
 * const result = await renderToString(() => Counter());
 *
 * // client.js
 * import { hydrate } from 'esor/ssr';
 * hydrate(() => Counter(), '#app');
 */
export function defineComponent(setupFn) {
    return createSSRComponent(setupFn);
}

/**
 * Universal render function - works on both server and client
 *
 * On server: renders to string
 * On client: hydrates or renders
 */
export function render(componentFn, target) {
    if (typeof window === 'undefined') {
        // Server-side
        return renderComponent(componentFn);
    } else {
        // Client-side
        if (isSSRContent()) {
            // Hydrate existing SSR content
            return hydrateComponent(target, componentFn);
        } else {
            // Regular client-side render
            const { template } = componentFn();
            const element = typeof target === 'string'
                ? document.querySelector(target)
                : target;
            _renderTemplate(element, template);
        }
    }
}

export { ssrContext };
