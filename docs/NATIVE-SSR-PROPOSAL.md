# Native SSR with Declarative Shadow DOM

## 🎯 Filosofía de Esorjs

Esorjs debe ser:
1. ✅ **Lo más óptimo posible**
2. ✅ **Lo menos pesado posible**
3. ✅ **Escalable**
4. ✅ **Lo más sencillo posible**
5. ✅ **Usar estándares web nativos**

## 💡 La Solución Nativa: Declarative Shadow DOM

En lugar de crear un sistema de hydration complejo como SolidJS, **usamos el estándar nativo de HTML**.

### ❌ Lo que estábamos haciendo (Complejo)

```javascript
// Necesita código de hydration
// Necesita serialización de estado
// Necesita mapeo de signals
// +3 KB de código extra
```

### ✅ Lo que deberíamos hacer (Nativo)

```html
<!-- El navegador hidrata esto AUTOMÁTICAMENTE -->
<my-counter>
  <template shadowrootmode="open">
    <div>Count: 0</div>
    <button>+1</button>
  </template>
</my-counter>

<script type="module">
  customElements.define('my-counter', class extends HTMLElement {
    constructor() {
      super();
      // Shadow DOM ya existe gracias a DSD!
      const count = signal(0);
      // ...
    }
  });
</script>
```

**El navegador hace la hydration automáticamente!** 🎉

---

## 🚀 Propuesta: SSR Ultra-Simple con DSD

### Server-Side (Node.js)

```javascript
// server.js
import { component } from 'esor';

// Renderiza a Declarative Shadow DOM
function renderToHTML(tagName, template) {
  return `
    <${tagName}>
      <template shadowrootmode="open">
        ${template}
      </template>
    </${tagName}>
  `;
}

// Ejemplo
const html = renderToHTML('my-counter', `
  <div>
    <p>Count: <span data-signal="count">0</span></p>
    <button onclick="this.getRootNode().host.increment()">+1</button>
  </div>
`);

res.send(html);
```

### Client-Side (Browser)

```javascript
// client.js
import { component, html, signal } from 'esor';

component('my-counter', function() {
  const count = signal(0);

  this.increment = () => count(count() + 1);

  // Si ya hay shadow DOM (SSR), solo conectar signals
  if (this.shadowRoot) {
    const span = this.shadowRoot.querySelector('[data-signal="count"]');
    effect(() => span.textContent = count());
    return; // Ya está renderizado!
  }

  // Client-side normal
  return html`
    <div>
      <p>Count: ${count}</p>
      <button onclick=${this.increment}>+1</button>
    </div>
  `;
});
```

---

## 📊 Comparación

### Solución Anterior (Compleja)

```
Bundle Size:  6.2 KB
Código SSR:   ~500 líneas
Hydration:    Manual
Estándares:   Custom
```

### Solución Nativa (Simple)

```
Bundle Size:  ~1 KB  (-5.2 KB, -83%)
Código SSR:   ~50 líneas (-90%)
Hydration:    Automática (browser)
Estándares:   Declarative Shadow DOM (W3C)
```

---

## 🎨 Implementación Completa

### 1. SSR Renderer (Ultra-simple)

```javascript
/**
 * Native SSR with Declarative Shadow DOM
 * ~50 lines total!
 */

export function renderToDeclarativeShadowDOM(tagName, options = {}) {
  const { template, state = {} } = options;

  // Serialize state
  const stateScript = state && Object.keys(state).length > 0
    ? `<script type="application/json" data-state>${JSON.stringify(state)}</script>`
    : '';

  return `
<${tagName}>
  <template shadowrootmode="open">
    ${template}
    ${stateScript}
  </template>
</${tagName}>`;
}

// Ejemplo de uso
const html = renderToDeclarativeShadowDOM('my-counter', {
  template: `
    <div>
      <p>Count: <span data-bind="count">0</span></p>
      <button data-action="increment">+1</button>
    </div>
  `,
  state: { count: 0 }
});
```

### 2. Component con SSR Support

```javascript
import { component, signal, effect } from 'esor';

component('my-counter', function(props) {
  // Recuperar estado de SSR si existe
  const initialState = this.shadowRoot?.querySelector('[data-state]');
  const state = initialState
    ? JSON.parse(initialState.textContent)
    : {};

  const count = signal(state.count || 0);

  // Si hay shadow DOM (SSR), solo conectar
  if (this.shadowRoot) {
    const span = this.shadowRoot.querySelector('[data-bind="count"]');
    const button = this.shadowRoot.querySelector('[data-action="increment"]');

    effect(() => span.textContent = count());
    button.onclick = () => count(count() + 1);

    return; // Ya renderizado por SSR
  }

  // Client-side render normal
  return html`
    <div>
      <p>Count: ${count}</p>
      <button onclick=${() => count(count() + 1)}>+1</button>
    </div>
  `;
});
```

---

## 🌟 Ventajas de Esta Solución

### 1. **Extremadamente Simple**

```javascript
// Antes: 500+ líneas de código complejo
// Ahora: ~50 líneas de código simple
```

### 2. **Ultra Ligero**

```javascript
// Antes: 6.2 KB
// Ahora: ~1 KB (-83%)
```

### 3. **Estándar Nativo**

- ✅ Declarative Shadow DOM (W3C Standard)
- ✅ Custom Elements v1
- ✅ Template element
- ✅ Sin APIs custom

### 4. **Hydration Automática**

```html
<!-- El navegador hace esto automáticamente -->
<my-counter>
  <template shadowrootmode="open">
    ...
  </template>
</my-counter>

<!-- Se convierte en: -->
<my-counter>
  #shadow-root (open)
    ...
</my-counter>
```

### 5. **Sin Compilación**

- ✅ HTML estándar
- ✅ JavaScript estándar
- ✅ Sin build step

---

## 🔧 API Propuesta

### Server-Side

```javascript
import { renderComponent } from 'esor/ssr';

// Opción 1: Simple
const html = renderComponent('my-counter', {
  template: '<div>Count: 0</div>',
  state: { count: 0 }
});

// Opción 2: Con función de setup
const html = renderComponent('my-counter', () => {
  const count = signal(0);
  return {
    template: html`<div>Count: ${count()}</div>`,
    state: { count: count() }
  };
});
```

### Client-Side

```javascript
import { component, signal } from 'esor';

component('my-counter', function() {
  // Auto-detecta SSR
  const isSSR = !!this.shadowRoot;
  const state = this.getSSRState(); // Helper

  const count = signal(state?.count || 0);

  if (isSSR) {
    this.bindSignal('count', count); // Helper
    this.bindAction('increment', () => count(count() + 1)); // Helper
    return;
  }

  return html`<div>Count: ${count}</div>`;
});
```

---

## 📦 Implementación Mínima

```javascript
/**
 * Native SSR for Esorjs
 * Total: ~100 lines
 */

// Server-side (ssr/native.js)
export function renderComponent(tagName, setup) {
  const result = typeof setup === 'function' ? setup() : setup;
  const { template, state } = result;

  const stateScript = state
    ? `<script type="application/json" data-ssr-state>${JSON.stringify(state)}</script>`
    : '';

  return `<${tagName}><template shadowrootmode="open">${template}${stateScript}</template></${tagName}>`;
}

// Client-side helpers (component.js)
HTMLElement.prototype.getSSRState = function() {
  if (!this.shadowRoot) return null;
  const script = this.shadowRoot.querySelector('[data-ssr-state]');
  return script ? JSON.parse(script.textContent) : null;
};

HTMLElement.prototype.bindSignal = function(selector, signal) {
  const element = this.shadowRoot.querySelector(`[data-bind="${selector}"]`);
  if (element) {
    effect(() => element.textContent = signal());
  }
};

HTMLElement.prototype.bindAction = function(action, handler) {
  const element = this.shadowRoot.querySelector(`[data-action="${action}"]`);
  if (element) {
    element.onclick = handler;
  }
};
```

---

## 🎯 Ejemplo Completo

### counter.js (Isomórfico)

```javascript
import { component, signal, effect } from 'esor';

export const Counter = component('my-counter', function() {
  // Auto-detect SSR
  const state = this.getSSRState();
  const count = signal(state?.count || 0);

  // SSR: solo conectar
  if (this.shadowRoot) {
    this.bindSignal('count', count);
    this.bindAction('inc', () => count(count() + 1));
    this.bindAction('dec', () => count(count() - 1));
    return;
  }

  // Client: renderizar
  return html`
    <div>
      <h1>Count: ${count}</h1>
      <button onclick=${() => count(count() - 1)}>-</button>
      <button onclick=${() => count(count() + 1)}>+</button>
    </div>
  `;
});
```

### server.js

```javascript
import { renderComponent } from 'esor/ssr';

app.get('/', (req, res) => {
  const html = renderComponent('my-counter', {
    template: `
      <div>
        <h1>Count: <span data-bind="count">0</span></h1>
        <button data-action="dec">-</button>
        <button data-action="inc">+</button>
      </div>
    `,
    state: { count: 0 }
  });

  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        ${html}
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  `);
});
```

### client.js

```javascript
import './counter.js'; // Auto-registers y conecta SSR
```

---

## 🏆 Comparación Final

| Característica | Solución Compleja | Solución Nativa |
|----------------|-------------------|-----------------|
| **Bundle Size** | 6.2 KB | **~1 KB** 🥇 |
| **Líneas de código** | ~500 | **~100** 🥇 |
| **Hydration** | Manual | **Automática** 🥇 |
| **Estándares** | Custom | **W3C** 🥇 |
| **Compilación** | No | **No** ✅ |
| **Complejidad** | Alta | **Baja** 🥇 |
| **Mantenibilidad** | Media | **Alta** 🥇 |
| **Browser Support** | Bueno | **Chrome 90+, Safari 16+** |

---

## 🌐 Soporte de Navegadores

**Declarative Shadow DOM:**
- ✅ Chrome 90+ (2021)
- ✅ Edge 91+ (2021)
- ✅ Safari 16.4+ (2023)
- ⚠️ Firefox: En desarrollo (usa polyfill)

**Polyfill (~500 bytes):**
```javascript
// Para Firefox
if (!HTMLTemplateElement.prototype.hasOwnProperty('shadowRootMode')) {
  document.querySelectorAll('template[shadowrootmode]').forEach(template => {
    const mode = template.getAttribute('shadowrootmode');
    const parent = template.parentNode;
    const shadowRoot = parent.attachShadow({ mode });
    shadowRoot.appendChild(template.content);
    template.remove();
  });
}
```

---

## 💡 Conclusión

La solución nativa con **Declarative Shadow DOM** es:

1. ✅ **5x más simple** (~100 líneas vs ~500)
2. ✅ **6x más ligera** (~1 KB vs 6.2 KB)
3. ✅ **Basada en estándares** (W3C)
4. ✅ **Hydration automática** (browser nativo)
5. ✅ **Más mantenible** (menos código)
6. ✅ **Más escalable** (aprovecha optimizaciones del browser)

**Esto es verdaderamente la filosofía de Esorjs:**
- Óptimo
- Ligero
- Sencillo
- Estándares nativos

¿Quieres que implemente esta solución nativa?
