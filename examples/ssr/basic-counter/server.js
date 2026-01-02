/**
 * Basic Counter Example - Server Side
 *
 * This example demonstrates SSR with a simple counter component.
 */

import { html, renderToString, injectState } from '../../../src/ssr/index.js';
import { signal } from '../../../src/hooks/reactivity.js';

/**
 * Creates the counter template
 */
function createCounterTemplate() {
    const count = signal(0);

    return {
        template: html`
            <div class="counter">
                <h1>Counter Example</h1>
                <p>Current count: <strong>${count}</strong></p>
                <div class="buttons">
                    <button data-action="decrement">-</button>
                    <button data-action="increment">+</button>
                    <button data-action="reset">Reset</button>
                </div>
            </div>
        `,
        signals: { count }
    };
}

/**
 * Renders the complete HTML page
 */
function renderPage() {
    const { template, signals } = createCounterTemplate();
    const { html: content, state } = renderToString(template);

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Esor SSR - Counter Example</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .counter {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            margin-top: 0;
            color: #333;
        }
        p {
            font-size: 18px;
            color: #666;
        }
        strong {
            color: #0066cc;
            font-size: 24px;
        }
        .buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        button {
            flex: 1;
            padding: 12px 24px;
            font-size: 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background: #0066cc;
            color: white;
            transition: background 0.2s;
        }
        button:hover {
            background: #0052a3;
        }
        button:active {
            transform: scale(0.98);
        }
    </style>
    <script type="module" src="/client.js"></script>
</head>
<body>
    <div id="app">${content}</div>
</body>
</html>`;

    return injectState(fullHtml, state, 'body');
}

// Example usage with Express.js
export function setupExpressRoute(app) {
    app.get('/', (req, res) => {
        const html = renderPage();
        res.send(html);
    });
}

// For standalone usage
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log(renderPage());
}

export { renderPage, createCounterTemplate };
