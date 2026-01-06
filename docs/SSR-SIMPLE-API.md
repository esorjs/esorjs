# API Simplificada para SSR en Esorjs

La API **más simple y natural** para SSR en esorjs, usando `component()` existente.

## 🎯 Filosofía

- ✅ **Sin nuevos conceptos** - Usa `component()` que ya conoces
- ✅ **Código idéntico** - Mismo código en server y client
- ✅ **Auto-tracking** - Signals se registran automáticamente
- ✅ **Ultra-simple** - 3 funciones: `component()`, `renderComponent()`, `hydrateComponent()`

---

## 🚀 API Completa

### **Todo lo que necesitas:**

```javascript
import { component, html, signal } from 'esor';
import { renderComponent, hydrateComponent } from 'esor/ssr';

// 1. Define tu componente (como siempre!)
const Counter = component('my-counter', () => {
  const count = signal(0);
  return html`
    <div>
      <p>Count: ${count}</p>
      <button onclick=${() => count(count() + 1)}>+</button>
    </div>
  `;
});

// 2. Server: Renderiza
const { html, state } = renderComponent(Counter);

// 3. Client: Hidrata
hydrateComponent('#app', Counter);
```

**¡Eso es TODO!** No más `defineComponent`, no más mapeo manual, no más complejidad.

---

## 📚 Documentación

### `component(tagName, setupFn)`

**Ya existe en esorjs!** Define un componente como siempre.

```javascript
const Counter = component('my-counter', function(props) {
  const count = signal(props.initialCount || 0);

  return html`
    <div>
      <p>Count: ${count}</p>
      <button onclick=${() => count(count() + 1)}>+</button>
    </div>
  `;
});
```

### `renderComponent(Component, props?)`

**Server-side:** Renderiza componente a HTML.

```javascript
const { html, state, tagName } = renderComponent(Counter, {
  initialCount: 42
});

// html: '<my-counter><template shadowrootmode="open">...</template></my-counter>'
// state: { s0: 42 }
// tagName: 'my-counter'
```

**Retorna:**
- `html` - HTML con Declarative Shadow DOM
- `state` - Estado serializado
- `tagName` - Nombre del componente

### `hydrateComponent(target, Component, props?)`

**Client-side:** Hidrata componente server-rendered.

```javascript
hydrateComponent('#app', Counter, {
  initialCount: 42
});

// Automáticamente:
// 1. Detecta SSR content
// 2. Restaura signals desde state
// 3. Conecta reactivity
// 4. Listo!
```

---

## 🎨 Ejemplos

### Ejemplo 1: Contador Simple

```javascript
// counter.js (funciona en server Y client!)
import { component, html, signal } from 'esor';

export const Counter = component('my-counter', () => {
  const count = signal(0);

  return html`
    <div class="counter">
      <h1>Count: ${count}</h1>
      <button onclick=${() => count(count() + 1)}>+</button>
      <button onclick=${() => count(count() - 1)}>-</button>
      <button onclick=${() => count(0)}>Reset</button>
    </div>
  `;
});
```

```javascript
// server.js
import { renderComponent } from 'esor/ssr';
import { Counter } from './counter.js';

app.get('/', (req, res) => {
  const { html } = renderComponent(Counter);

  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="app">${html}</div>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  `);
});
```

```javascript
// client.js
import { hydrateComponent } from 'esor/ssr';
import { Counter } from './counter.js';

hydrateComponent('#app', Counter);
```

### Ejemplo 2: Con Props

```javascript
// greeting.js
import { component, html, signal } from 'esor';

export const Greeting = component('my-greeting', function(props) {
  const name = signal(props.name || 'Guest');

  return html`
    <div>
      <h1>Hello, ${name}!</h1>
      <input
        value=${name}
        oninput=${(e) => name(e.target.value)}
        placeholder="Your name"
      />
    </div>
  `;
});
```

```javascript
// server.js
const { html } = renderComponent(Greeting, {
  name: 'John'
});
```

```javascript
// client.js
hydrateComponent('#app', Greeting, {
  name: 'John' // Mismo props!
});
```

### Ejemplo 3: Computed Values

```javascript
// todo-list.js
import { component, html, signal, computed } from 'esor';

export const TodoList = component('todo-list', function(props) {
  const todos = signal(props.todos || []);
  const newTodo = signal('');

  const remaining = computed(() =>
    todos().filter(t => !t.done).length
  );

  const addTodo = () => {
    if (newTodo().trim()) {
      todos([...todos(), {
        id: Date.now(),
        text: newTodo(),
        done: false
      }]);
      newTodo('');
    }
  };

  return html`
    <div>
      <h1>Todos (${remaining} left)</h1>

      <input
        value=${newTodo}
        oninput=${(e) => newTodo(e.target.value)}
        placeholder="New todo..."
      />
      <button onclick=${addTodo}>Add</button>

      <ul>
        ${todos().map(todo => html`
          <li key=${todo.id}>
            <input
              type="checkbox"
              checked=${todo.done}
              onchange=${() => toggleTodo(todo.id)}
            />
            ${todo.text}
          </li>
        `)}
      </ul>
    </div>
  `;
});
```

---

## 🆚 Comparación con Otras APIs

### ❌ API Original (Manual)

```javascript
// SERVER - Código diferente
const count = signal(0);
const { html, state } = renderToString(template);

// CLIENT - Código diferente, manual mapping
const count = signal(0);
hydrate('#app', { signals: { s0: count } }); // ❌ Manual!
```

**Problemas:**
- Mapeo manual de signals
- Código diferente en server/client
- Propenso a errores

### ⚠️ API Enhanced (defineComponent)

```javascript
// Introduce defineComponent() - concepto nuevo innecesario
const Counter = defineComponent(() => {
  const count = signal(0);
  return html`<div>${count}</div>`;
});

renderComponent(Counter);
hydrateComponent('#app', Counter);
```

**Problemas:**
- `defineComponent()` es redundante con `component()`
- Introduce nuevos conceptos
- Más bundle size

### ✅ API Simple (Propuesta)

```javascript
// Usa component() que ya existe!
const Counter = component('my-counter', () => {
  const count = signal(0);
  return html`<div>${count}</div>`;
});

// SERVER
renderComponent(Counter);

// CLIENT
hydrateComponent('#app', Counter);
```

**Beneficios:**
- ✅ Sin nuevos conceptos
- ✅ Usa API existente
- ✅ Código idéntico
- ✅ Auto-tracking
- ✅ Más simple

---

## 📊 Comparación de Bundle

| API | Bundle SSR | Conceptos Nuevos | Complejidad |
|-----|------------|------------------|-------------|
| **Simple** | **~1.5 KB** 🥇 | 0 | Baja |
| Native DSD | ~1 KB | 3 (helpers) | Baja |
| Enhanced | 6.2 KB | 5 (defineComponent, etc) | Media |
| Original | 5.7 KB | 0 | Alta |

---

## 🎯 Por qué es Mejor

### 1. **Consistencia con esorjs**

```javascript
// Ya conoces esto:
component('my-comp', () => { ... });

// Ahora funciona con SSR - ¡SIN CAMBIOS!
const { html } = renderComponent(MyComp);
```

### 2. **Sin Conceptos Nuevos**

```
Enhanced API necesita:
- defineComponent()  ← Nuevo
- createSSRComponent()  ← Nuevo
- signal() de SSR  ← Diferente
- computed() de SSR  ← Diferente
- renderComponent()
- hydrateComponent()

Simple API necesita:
- component()  ← Ya existe
- renderComponent()
- hydrateComponent()
```

### 3. **Código Natural**

```javascript
// Se siente como esorjs normal
const Counter = component('my-counter', () => {
  const count = signal(0);
  return html`<div>${count}</div>`;
});

// SSR es solo una línea extra
const { html } = renderComponent(Counter);
```

### 4. **DRY (Don't Repeat Yourself)**

```javascript
// Define UNA VEZ
const Counter = component('my-counter', ...);

// Usa en server
renderComponent(Counter);

// Usa en client
hydrateComponent('#app', Counter);

// ¡Mismo componente, cero duplicación!
```

---

## 🚀 Implementación Interna

La API simple usa **Declarative Shadow DOM** internamente:

1. **Auto-tracking de signals** durante `renderComponent()`
2. **Renderiza a DSD** usando estándar W3C
3. **Browser hidrata** automáticamente el shadow DOM
4. **Componente conecta** signals en `hydrateComponent()`

**Obtienes lo mejor de ambos mundos:**
- Simplicidad de la API Enhanced
- Performance de Native DSD
- Consistencia con esorjs existente

---

## 📦 Migración

### De API Original

```diff
- // SERVER
- const count = signal(0);
- const template = html`<div>${count}</div>`;
- const { html, state } = renderToString(template);

+ // Define componente
+ const Counter = component('my-counter', () => {
+   const count = signal(0);
+   return html`<div>${count}</div>`;
+ });

+ // SERVER
+ const { html } = renderComponent(Counter);

- // CLIENT
- const count = signal(0);
- hydrate('#app', { signals: { s0: count } });

+ // CLIENT
+ hydrateComponent('#app', Counter);
```

### De API Enhanced

```diff
- const Counter = defineComponent(() => {
+ const Counter = component('my-counter', () => {
    const count = signal(0);
    return html`<div>${count}</div>`;
  });

  // SERVER y CLIENT sin cambios!
  renderComponent(Counter);
  hydrateComponent('#app', Counter);
```

---

## 🎉 Conclusión

**API Simple es la solución perfecta para esorjs SSR:**

1. ✅ **Usa `component()` existente** - No inventamos nada nuevo
2. ✅ **Auto-tracking** - Signals automáticos como Enhanced
3. ✅ **Native DSD** - Performance y estándares
4. ✅ **Código idéntico** - DRY perfecto
5. ✅ **Bundle pequeño** - Solo +1.5 KB
6. ✅ **Natural** - Se siente como esorjs normal

**Esta ES la API que esorjs necesita para SSR.** 🚀

---

## 📝 Próximos Pasos

1. Implementar `renderComponent()` completo
2. Implementar `hydrateComponent()` completo
3. Integrar con Native DSD
4. Tests completos
5. Actualizar ejemplos
6. Documentación final

¿Procedemos con la implementación completa?
