/**
 * Native SSR with Declarative Shadow DOM
 *
 * Ultra-lightweight SSR using W3C standards.
 * Total: ~100 lines, ~1 KB bundle
 *
 * Philosophy:
 * - Use native browser capabilities
 * - Minimal code, maximum standards
 * - Automatic hydration via Declarative Shadow DOM
 */

const MARKER = "\uFEFF";

/**
 * Renders a component to Declarative Shadow DOM HTML
 *
 * @param {string} tagName - Custom element tag name
 * @param {object|function} options - Template and state or setup function
 * @returns {string} HTML with Declarative Shadow DOM
 *
 * @example
 * // Simple
 * renderToNativeSSR('my-counter', {
 *   template: '<div>Count: 0</div>',
 *   state: { count: 0 }
 * });
 *
 * // With setup function
 * renderToNativeSSR('my-counter', () => {
 *   const count = signal(0);
 *   return {
 *     template: `<div>Count: ${count()}</div>`,
 *     state: { count: count() }
 *   };
 * });
 */
export function renderToNativeSSR(tagName, options) {
    const result = typeof options === 'function' ? options() : options;
    const { template, state = {}, mode = 'open' } = result;

    // State serialization
    const stateScript = Object.keys(state).length > 0
        ? `<script type="application/json" data-esor-state>${escapeHtml(JSON.stringify(state))}</script>`
        : '';

    // Declarative Shadow DOM
    return `<${tagName}><template shadowrootmode="${mode}">${template}${stateScript}</template></${tagName}>`;
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Processes a template with signal values for SSR
 *
 * @param {object} templateObj - Template object from html``
 * @param {object} signalMap - Map of signal names to values
 * @returns {string} Processed HTML
 */
export function processTemplate(templateObj, signalMap = {}) {
    if (!templateObj || !templateObj._isTemplate) {
        return String(templateObj || '');
    }

    const { template, values } = templateObj;
    const content = template.content.cloneNode(true);
    let valueIndex = 0;

    const walker = document.createTreeWalker(
        content,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
    );

    const signalBindings = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;

        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes(MARKER)) {
            const value = values[valueIndex++];
            const signalName = getSignalName(value, signalMap);

            if (signalName) {
                // Replace with span for signal binding
                const span = document.createElement('span');
                span.setAttribute('data-esor-bind', signalName);
                span.textContent = getValue(value);
                node.parentNode.replaceChild(span, node);
                signalBindings.push({ name: signalName, value: getValue(value) });
            } else {
                node.nodeValue = node.nodeValue.replace(MARKER, getValue(value));
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Process attributes
            Array.from(node.attributes).forEach(attr => {
                if (attr.value === MARKER) {
                    const value = values[valueIndex++];
                    const signalName = getSignalName(value, signalMap);

                    if (attr.name.startsWith('on')) {
                        // Event handler - add data attribute
                        const event = attr.name.slice(2);
                        node.setAttribute(`data-esor-on-${event}`, 'handler');
                        node.removeAttribute(attr.name);
                    } else if (signalName) {
                        // Signal binding
                        node.setAttribute(`data-esor-bind-${attr.name}`, signalName);
                        node.setAttribute(attr.name, getValue(value));
                    } else {
                        node.setAttribute(attr.name, getValue(value));
                    }
                }
            });
        }
    }

    const div = document.createElement('div');
    div.appendChild(content);
    return div.innerHTML;
}

/**
 * Gets signal name from signal map
 */
function getSignalName(value, signalMap) {
    if (!value || !value._isSignal) return null;

    for (const [name, signal] of Object.entries(signalMap)) {
        if (signal === value) return name;
    }

    return null;
}

/**
 * Extracts value from signal or returns value directly
 */
function getValue(value) {
    if (value == null || value === false) return '';
    if (value._isSignal) return value();
    if (typeof value === 'function') return getValue(value());
    return String(value);
}

/**
 * Client-side: Gets SSR state from shadow root
 *
 * @param {ShadowRoot} shadowRoot - Shadow root to check
 * @returns {object|null} SSR state or null
 */
export function getSSRState(shadowRoot) {
    if (!shadowRoot) return null;

    const script = shadowRoot.querySelector('[data-esor-state]');
    if (!script) return null;

    try {
        return JSON.parse(script.textContent);
    } catch (e) {
        console.error('Failed to parse SSR state:', e);
        return null;
    }
}

/**
 * Client-side: Binds signals to SSR-rendered elements
 *
 * @param {ShadowRoot} shadowRoot - Shadow root with SSR content
 * @param {object} signals - Map of signal names to signal functions
 */
export function bindSignals(shadowRoot, signals) {
    if (!shadowRoot) return;

    // Bind text content signals
    shadowRoot.querySelectorAll('[data-esor-bind]').forEach(element => {
        const signalName = element.getAttribute('data-esor-bind');
        const signal = signals[signalName];

        if (signal && signal._isSignal) {
            // Import effect from reactivity
            const { effect } = await import('../hooks/reactivity.js');
            effect(() => {
                element.textContent = signal();
            });
        }
    });

    // Bind attribute signals
    Object.keys(signals).forEach(signalName => {
        const signal = signals[signalName];
        if (!signal._isSignal) return;

        shadowRoot.querySelectorAll(`[data-esor-bind-${signalName}]`).forEach(element => {
            const attrs = Array.from(element.attributes)
                .filter(attr => attr.name.startsWith('data-esor-bind-'));

            attrs.forEach(attr => {
                const attrName = attr.name.replace('data-esor-bind-', '');
                const { effect } = await import('../hooks/reactivity.js');

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
    });
}

/**
 * Client-side: Binds event handlers to SSR-rendered elements
 *
 * @param {ShadowRoot} shadowRoot - Shadow root with SSR content
 * @param {object} handlers - Map of handler names to functions
 */
export function bindHandlers(shadowRoot, handlers) {
    if (!shadowRoot) return;

    shadowRoot.querySelectorAll('[data-esor-on]').forEach(element => {
        Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('data-esor-on-'))
            .forEach(attr => {
                const eventName = attr.name.replace('data-esor-on-', '');
                const handlerName = attr.value;
                const handler = handlers[handlerName] || handlers[eventName];

                if (handler) {
                    element.addEventListener(eventName, handler);
                    element.removeAttribute(attr.name);
                }
            });
    });
}

/**
 * Polyfill for Declarative Shadow DOM (Firefox support)
 *
 * Call this once on page load to support browsers without DSD
 */
export function polyfillDeclarativeShadowDOM() {
    if (typeof document === 'undefined') return;
    if (HTMLTemplateElement.prototype.hasOwnProperty('shadowRootMode')) return;

    // Polyfill for browsers without Declarative Shadow DOM support
    document.querySelectorAll('template[shadowrootmode]').forEach(template => {
        const mode = template.getAttribute('shadowrootmode');
        const parent = template.parentNode;

        if (parent && !parent.shadowRoot) {
            const shadowRoot = parent.attachShadow({ mode });
            shadowRoot.appendChild(template.content.cloneNode(true));
            template.remove();
        }
    });
}

// Auto-polyfill if in browser
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', polyfillDeclarativeShadowDOM);
    } else {
        polyfillDeclarativeShadowDOM();
    }
}

export default {
    renderToNativeSSR,
    getSSRState,
    bindSignals,
    bindHandlers,
    polyfillDeclarativeShadowDOM
};
