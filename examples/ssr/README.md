# Esor SSR Examples

This directory contains examples of Server-Side Rendering (SSR) with Esor.

## Overview

Esor's SSR module allows you to:
- Render templates to HTML strings on the server
- Serialize application state for client hydration
- Hydrate server-rendered content on the client
- Build fast, SEO-friendly applications

## Quick Start

### 1. Server-Side Rendering

```javascript
// server.js
import { html, renderToString, injectState } from 'esor/ssr';
import { signal } from 'esor';

// Create your reactive state
const count = signal(42);
const name = signal('World');

// Create your template
const template = html`
  <div>
    <h1>Hello, ${name}!</h1>
    <p>Count: ${count}</p>
  </div>
`;

// Render to HTML string
const { html: htmlString, state } = renderToString(template);

// Inject state for hydration
const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Esor SSR Example</title>
  <script type="module" src="/client.js"></script>
</head>
<body>
  <div id="app">${htmlString}</div>
  ${injectState('', state)}
</body>
</html>
`;

// Send to client
response.send(fullHtml);
```

### 2. Client-Side Hydration

```javascript
// client.js
import { signal } from 'esor';
import { hydrate } from 'esor/ssr';

// Recreate the same signals (order matters!)
const count = signal(0);
const name = signal('');

// Hydrate the server-rendered content
hydrate('#app', {
  signals: {
    s0: name,  // First signal in template
    s1: count  // Second signal in template
  }
});

// Now your signals are reactive and connected to the DOM!
count(count() + 1); // Updates will reflect in the UI
```

## Examples

### Basic Counter
See `basic-counter/` for a simple counter with SSR.

### Form with Input
See `form-example/` for handling forms and user input with SSR.

### Dynamic List
See `list-example/` for rendering lists with SSR.

### Express Integration
See `express-server/` for a complete Express.js server setup.

## Important Notes

### Signal Order
The order of signals in the `hydrate()` call must match the order they appear in the template:

```javascript
// Template
html`<div>${signal1} ${signal2}</div>`

// Hydration - CORRECT
hydrate('#app', {
  signals: { s0: signal1, s1: signal2 }
});

// Hydration - WRONG (order mismatch)
hydrate('#app', {
  signals: { s0: signal2, s1: signal1 } // ❌
});
```

### Event Handlers
Event handlers are not automatically serialized. You need to reattach them during hydration:

```javascript
// Server
const handleClick = () => console.log('clicked');
const template = html`<button onclick=${handleClick}>Click</button>`;

// Client
const handleClick = () => console.log('clicked');
hydrate('#app', {
  signals: {},
  handlers: {
    click: handleClick
  }
});
```

### Web Components
SSR with Web Components requires declarative shadow DOM support in the browser. For older browsers, you may need a polyfill.

## Performance Tips

1. **Use Static Templates**: Templates without signals render faster
2. **Minimize State**: Only serialize what's necessary for hydration
3. **Stream Rendering**: Use `renderToStream()` for large pages
4. **Cache Rendered HTML**: Cache static parts of your pages

## Limitations

- Custom element lifecycle hooks run only on client-side
- Refs are not serialized (they only work client-side)
- Event handlers must be reattached during hydration
- Computed values are serialized as their current value

## API Reference

### Server-Side

- `renderToString(template)` - Renders template to HTML string with state
- `renderToHTML(template, options)` - Renders complete HTML document
- `renderToStream(template)` - Renders to a ReadableStream
- `injectState(html, state, position)` - Injects state script into HTML

### Client-Side

- `hydrate(target, options)` - Activates reactivity on SSR content
- `isSSRContent()` - Checks if page contains SSR content
- `createHydratableComponent(setupFn)` - Creates hydration-aware component

## Browser Support

SSR output works in all modern browsers. Hydration requires:
- ES6 Modules support
- Custom Elements v1
- Shadow DOM v1

For older browsers, use polyfills like `@webcomponents/webcomponentsjs`.
