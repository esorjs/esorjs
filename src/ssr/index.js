/**
 * Esor SSR (Server-Side Rendering) Module
 *
 * This module provides server-side rendering and hydration capabilities for Esor.
 *
 * @module esor/ssr
 *
 * @example
 * // Server-side (Node.js)
 * import { renderToString, injectState } from 'esor/ssr';
 * import { html, signal } from 'esor/ssr';
 *
 * const count = signal(0);
 * const template = html`<div>Count: ${count}</div>`;
 * const { html: htmlString, state } = renderToString(template);
 * const fullHtml = injectState(htmlString, state);
 *
 * @example
 * // Client-side (Browser)
 * import { hydrate } from 'esor/ssr';
 * import { signal } from 'esor';
 *
 * const count = signal(0);
 * hydrate('#app', {
 *   signals: { s0: count }
 * });
 */

// Server-side rendering
export { html, renderToString } from './render.js';

// State serialization
export {
    createStateScript,
    injectState,
    serializeValue,
    deserializeValue
} from './serialize.js';

// Client-side hydration
export {
    hydrate,
    createHydratableComponent,
    isSSRContent
} from './hydrate.js';

// Import for renderToHTML helper
import { renderToString as _renderToString } from './render.js';
import { injectState as _injectState } from './serialize.js';

/**
 * Helper function to render a full HTML page with SSR content
 *
 * @param {object} template - The template to render
 * @param {object} options - Rendering options
 * @param {string} [options.title='Esor App'] - Page title
 * @param {string} [options.lang='en'] - HTML lang attribute
 * @param {string} [options.head=''] - Additional head content
 * @param {string} [options.bodyAttrs=''] - Additional body attributes
 * @returns {string} Complete HTML document
 */
export const renderToHTML = (template, options = {}) => {
    const {
        title = 'Esor App',
        lang = 'en',
        head = '',
        bodyAttrs = ''
    } = options;

    const { html: content, state } = _renderToString(template);

    const htmlDoc = `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${head}
</head>
<body${bodyAttrs ? ' ' + bodyAttrs : ''}>
    ${content}
</body>
</html>`;

    return _injectState(htmlDoc, state, 'body');
};

/**
 * Stream renderer for SSR (for large applications)
 *
 * @param {object} template - The template to render
 * @returns {ReadableStream} Stream of HTML chunks
 */
export const renderToStream = (template) => {
    // Import locally
    const { renderToString } = require('./render.js');

    return new ReadableStream({
        start(controller) {
            try {
                const { html, state } = renderToString(template);

                // Encode and enqueue the HTML
                const encoder = new TextEncoder();
                controller.enqueue(encoder.encode(html));

                // Add state script at the end
                const { createStateScript } = require('./serialize.js');
                controller.enqueue(encoder.encode(createStateScript(state)));

                controller.close();
            } catch (error) {
                controller.error(error);
            }
        }
    });
};
