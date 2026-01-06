/**
 * Server - Native SSR with Declarative Shadow DOM
 *
 * Ultra-simple server using native browser standards
 */

import { renderToNativeSSR } from '../../../src/ssr/native.js';

/**
 * Renders the counter component to Declarative Shadow DOM HTML
 *
 * @param {number} initialCount - Initial count value
 * @returns {string} Complete HTML page
 */
export function renderCounterPage(initialCount = 0) {
    // Template for SSR (with data attributes for binding)
    const template = `
        <div class="native-counter">
            <h1>Native SSR Counter</h1>

            <div class="display">
                <p class="count">
                    Count: <strong data-esor-bind="count">${initialCount}</strong>
                </p>
                <p class="doubled">
                    Doubled: <strong data-esor-bind="doubled">${initialCount * 2}</strong>
                </p>
                <p class="status">
                    Status: <strong data-esor-bind="isEven">${initialCount % 2 === 0 ? '✓ Even' : '○ Odd'}</strong>
                </p>
            </div>

            <div class="controls">
                <button data-action="decrement" data-esor-on-click="handler">− Decrement</button>
                <button data-action="reset" data-esor-on-click="handler">↺ Reset</button>
                <button data-action="increment" data-esor-on-click="handler">+ Increment</button>
            </div>

            <div class="settings">
                <label>
                    Step:
                    <input
                        type="number"
                        data-bind="step"
                        data-esor-on-input="handler"
                        value="1"
                        min="1"
                        max="10"
                    />
                </label>
            </div>

            <style>
                .native-counter {
                    font-family: system-ui, -apple-system, sans-serif;
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 30px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                }

                h1 {
                    margin: 0 0 20px;
                    color: #333;
                    font-size: 24px;
                    text-align: center;
                }

                .display {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }

                .display p {
                    margin: 10px 0;
                    color: white;
                    font-size: 16px;
                }

                .display strong {
                    font-size: 28px;
                    font-weight: 700;
                }

                .controls {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                button {
                    padding: 12px 20px;
                    font-size: 16px;
                    font-weight: 600;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    background: #667eea;
                    color: white;
                    transition: all 0.2s;
                }

                button:hover {
                    background: #5568d3;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
                }

                button:active {
                    transform: translateY(0);
                }

                .settings {
                    text-align: center;
                }

                .settings label {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    color: #666;
                }

                .settings input {
                    width: 60px;
                    padding: 6px 10px;
                    border: 2px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    text-align: center;
                }

                .settings input:focus {
                    outline: none;
                    border-color: #667eea;
                }
            </style>
        </div>
    `;

    // State to serialize
    const state = {
        count: initialCount,
        doubled: initialCount * 2,
        isEven: initialCount % 2 === 0 ? '✓ Even' : '○ Odd',
        step: 1
    };

    // Render to Declarative Shadow DOM
    const componentHTML = renderToNativeSSR('native-counter', {
        template,
        state
    });

    // Complete HTML page
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Native SSR Counter - Esorjs</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: system-ui, -apple-system, sans-serif;
        }

        #app {
            width: 100%;
            padding: 20px;
        }

        .info {
            max-width: 500px;
            margin: 20px auto 0;
            padding: 20px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
            color: #666;
        }

        .info strong {
            color: #667eea;
        }

        .badge {
            display: inline-block;
            padding: 4px 8px;
            background: #667eea;
            color: white;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin: 0 4px;
        }
    </style>
</head>
<body>
    <div id="app">
        ${componentHTML}

        <div class="info">
            <p>
                <strong>🎉 Native SSR with Declarative Shadow DOM</strong>
            </p>
            <p>
                <span class="badge">~1 KB</span>
                <span class="badge">W3C Standard</span>
                <span class="badge">Auto Hydration</span>
            </p>
            <p>
                This page was server-rendered using <strong>Declarative Shadow DOM</strong>.
                The browser automatically hydrates the component!
            </p>
        </div>
    </div>

    <!-- Component code loads and activates reactivity -->
    <script type="module" src="/client.js"></script>
</body>
</html>`;
}

/**
 * Express.js integration
 */
export function setupExpress(app) {
    app.get('/', (req, res) => {
        const html = renderCounterPage();
        res.send(html);
    });

    app.get('/counter/:count', (req, res) => {
        const initialCount = parseInt(req.params.count) || 0;
        const html = renderCounterPage(initialCount);
        res.send(html);
    });
}

/**
 * Fastify integration
 */
export function setupFastify(fastify) {
    fastify.get('/', async (request, reply) => {
        const html = renderCounterPage();
        reply.type('text/html').send(html);
    });

    fastify.get('/counter/:count', async (request, reply) => {
        const initialCount = parseInt(request.params.count) || 0;
        const html = renderCounterPage(initialCount);
        reply.type('text/html').send(html);
    });
}

/**
 * Node.js HTTP server
 */
export function createServer() {
    const http = require('http');

    return http.createServer((req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);

        if (url.pathname === '/') {
            const html = renderCounterPage();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } else if (url.pathname.startsWith('/counter/')) {
            const count = parseInt(url.pathname.split('/')[2]) || 0;
            const html = renderCounterPage(count);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('='.repeat(60));
    console.log('Native SSR Example - Declarative Shadow DOM');
    console.log('='.repeat(60));
    console.log('\nRendered HTML:\n');
    console.log(renderCounterPage(42));
    console.log('\n' + '='.repeat(60));
    console.log('Bundle size: ~1 KB (vs 6.2 KB enhanced API)');
    console.log('Using W3C Declarative Shadow DOM standard');
    console.log('Browser handles hydration automatically!');
    console.log('='.repeat(60));
}

export { renderCounterPage };
