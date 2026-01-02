/**
 * Server - Enhanced SSR API Example
 *
 * Simple server demonstrating the enhanced SSR API
 */

import { renderComponent } from '../../../src/ssr/enhanced-api.js';
import { injectState } from '../../../src/ssr/serialize.js';
import { Counter } from './counter.js';

/**
 * Renders the counter page
 */
export function renderCounterPage(initialCount = 0) {
    // Render component with props
    const { html, state } = renderComponent(Counter, { initialCount });

    // Create HTML page
    const page = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced SSR Counter - Esorjs</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #app {
            width: 100%;
        }
    </style>
    <script type="module" src="/client.js"></script>
</head>
<body>
    <div id="app">${html}</div>
</body>
</html>`;

    // Inject state for hydration
    return injectState(page, state);
}

/**
 * Example usage with different servers
 */

// Express.js
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

// Fastify
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

// Node.js HTTP
export function handleRequest(req, res) {
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
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('--- Enhanced SSR Example ---\n');
    console.log(renderCounterPage(42));
}
