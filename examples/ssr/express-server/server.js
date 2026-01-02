/**
 * Express.js Server with Esor SSR
 *
 * This example shows how to integrate Esor SSR with an Express.js server.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { html, renderToString, injectState } from '../../../src/ssr/index.js';
import { signal, computed } from '../../../src/hooks/reactivity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (for client.js)
app.use('/static', express.static(path.join(__dirname, 'public')));

// Example 1: Simple Counter Page
app.get('/', (req, res) => {
    const count = signal(0);

    const template = html`
        <div class="app">
            <h1>Esor SSR with Express</h1>
            <p>Count: <strong>${count}</strong></p>
            <p>This content was rendered on the server!</p>
        </div>
    `;

    const { html: content, state } = renderToString(template);

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Esor SSR - Express Example</title>
    <link rel="stylesheet" href="/static/styles.css">
    <script type="module" src="/static/app.js"></script>
</head>
<body>
    <div id="app">${content}</div>
</body>
</html>`;

    res.send(injectState(page, state));
});

// Example 2: Dynamic Content with Query Parameters
app.get('/user/:name', (req, res) => {
    const userName = signal(req.params.name || 'Guest');
    const visitCount = signal(Math.floor(Math.random() * 100));

    const template = html`
        <div class="user-profile">
            <h1>Welcome, ${userName}!</h1>
            <p>You've visited this page ${visitCount} times.</p>
            <p><em>This data was generated on the server at ${new Date().toISOString()}</em></p>
        </div>
    `;

    const { html: content, state } = renderToString(template);

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Profile - ${req.params.name}</title>
    <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
    <div id="app">${content}</div>
</body>
</html>`;

    res.send(injectState(page, state));
});

// Example 3: List Rendering with Computed Values
app.get('/products', (req, res) => {
    const products = [
        { id: 1, name: 'Laptop', price: 999 },
        { id: 2, name: 'Mouse', price: 29 },
        { id: 3, name: 'Keyboard', price: 79 }
    ];

    const productsList = signal(products);
    const totalPrice = computed(() =>
        productsList().reduce((sum, p) => sum + p.price, 0)
    );

    const template = html`
        <div class="products">
            <h1>Products</h1>
            <p>Total: $${totalPrice}</p>
            <ul>
                ${productsList().map(p => html`
                    <li key=${p.id}>
                        ${p.name} - $${p.price}
                    </li>
                `)}
            </ul>
        </div>
    `;

    const { html: content, state } = renderToString(template);

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products - Esor SSR</title>
    <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
    <div id="app">${content}</div>
</body>
</html>`;

    res.send(injectState(page, state));
});

// Example 4: API Data Fetching
app.get('/api/data', async (req, res) => {
    // Simulate API call
    const apiData = {
        message: 'Data from API',
        timestamp: Date.now(),
        items: ['Item 1', 'Item 2', 'Item 3']
    };

    const data = signal(apiData);

    const template = html`
        <div class="api-data">
            <h1>API Data Example</h1>
            <p>Message: ${() => data().message}</p>
            <p>Timestamp: ${() => data().timestamp}</p>
            <ul>
                ${() => data().items.map(item => html`<li>${item}</li>`)}
            </ul>
        </div>
    `;

    const { html: content, state } = renderToString(template);

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Data - Esor SSR</title>
    <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
    <div id="app">${content}</div>
</body>
</html>`;

    res.send(injectState(page, state));
});

// Start server
app.listen(PORT, () => {
    console.log(`
🚀 Esor SSR server running!

Examples:
  → http://localhost:${PORT}/
  → http://localhost:${PORT}/user/John
  → http://localhost:${PORT}/products
  → http://localhost:${PORT}/api/data

Press Ctrl+C to stop.
    `);
});

export default app;
