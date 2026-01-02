# Enhanced SSR API Examples

Demonstrates the new, cleaner SSR API for Esorjs, inspired by SolidJS but maintaining Esorjs philosophy.

## 🆚 API Comparison

### ❌ Old API (Manual)

```javascript
// server.js - OLD WAY
import { html, renderToString, injectState } from 'esor/ssr';
import { signal } from 'esor';

const count = signal(0);
const name = signal('John');

const template = html`
  <div>
    <h1>Hello, ${name}!</h1>
    <p>Count: ${count}</p>
    <button>Increment</button>
  </div>
`;

const { html: htmlString, state } = renderToString(template);
const page = `<!DOCTYPE html>
<html>
<body>
  <div id="app">${htmlString}</div>
</body>
</html>`;

const fullPage = injectState(page, state);

// client.js - OLD WAY
import { signal } from 'esor';
import { hydrate } from 'esor/ssr';

const count = signal(0);  // Must recreate
const name = signal('');   // Must recreate

// ⚠️ PROBLEM: Manual mapping of s0, s1, s2...
hydrate('#app', {
  signals: {
    s0: name,   // Which signal is s0? Hard to maintain!
    s1: count   // Order matters, easy to mess up
  },
  handlers: {
    click: () => count(count() + 1)  // Manual handler mapping
  }
});
```

**Problems:**
- ❌ Manual signal ID mapping (`s0`, `s1`, `s2`...)
- ❌ Hard to maintain when adding/removing signals
- ❌ Server and client code are completely different
- ❌ Easy to make mistakes with ordering

---

### ✅ New API (Automatic)

```javascript
// counter.js - SAME CODE FOR SERVER AND CLIENT! 🎉
import { defineComponent, signal } from 'esor/ssr/enhanced';
import { html } from 'esor';

export const Counter = defineComponent(() => {
  const count = signal(0);
  const name = signal('John');

  return html`
    <div>
      <h1>Hello, ${name}!</h1>
      <p>Count: ${count}</p>
      <button onclick=${() => count(count() + 1)}>Increment</button>
    </div>
  `;
});

// server.js - SIMPLE!
import { renderComponent, injectState } from 'esor/ssr/enhanced';
import { Counter } from './counter.js';

const { html, state } = renderComponent(Counter);
const page = `<!DOCTYPE html>
<html>
<body>
  <div id="app">${html}</div>
</body>
</html>`;

res.send(injectState(page, state));

// client.js - SIMPLE!
import { hydrateComponent } from 'esor/ssr/enhanced';
import { Counter } from './counter.js';

// ✅ Automatic signal mapping!
hydrateComponent('#app', Counter);
```

**Benefits:**
- ✅ Same code on server and client (DRY)
- ✅ Automatic signal tracking (no manual IDs)
- ✅ Type-safe (signals are tracked automatically)
- ✅ Easy to maintain (add/remove signals freely)

---

## 📚 API Reference

### `defineComponent(setupFn)`

Creates an isomorphic component that works on both server and client.

```javascript
const MyComponent = defineComponent((props) => {
  const count = signal(props.initialCount || 0);

  return html`<div>${count}</div>`;
});
```

### `signal(initialValue)`

Enhanced signal with automatic SSR tracking.

```javascript
const count = signal(0);
const name = signal('Alice');
// Automatically tracked when used in defineComponent!
```

### `computed(fn)`

Enhanced computed with automatic SSR tracking.

```javascript
const count = signal(5);
const doubled = computed(() => count() * 2);
// Automatically tracked!
```

### `renderComponent(Component, props?)`

Server-side: Renders component to HTML with automatic state extraction.

```javascript
const { html, state, signals, handlers } = renderComponent(MyComponent, {
  initialCount: 10
});
```

### `hydrateComponent(target, Component, props?)`

Client-side: Hydrates server-rendered component with automatic signal connection.

```javascript
hydrateComponent('#app', MyComponent, { initialCount: 10 });
```

### `render(Component, target)`

Universal function - automatically chooses server render or client hydration.

```javascript
// Works everywhere!
render(MyComponent, '#app');
```

---

## 🎯 Complete Examples

### Example 1: Simple Counter

```javascript
// counter.js
import { defineComponent, signal } from 'esor/ssr/enhanced';
import { html } from 'esor';

export const Counter = defineComponent(() => {
  const count = signal(0);

  const increment = () => count(count() + 1);
  const decrement = () => count(count() - 1);
  const reset = () => count(0);

  return html`
    <div class="counter">
      <h1>Count: ${count}</h1>
      <button onclick=${increment}>+</button>
      <button onclick=${decrement}>-</button>
      <button onclick=${reset}>Reset</button>
    </div>
  `;
});
```

### Example 2: Todo List

```javascript
// todos.js
import { defineComponent, signal, computed } from 'esor/ssr/enhanced';
import { html } from 'esor';

export const TodoList = defineComponent((props) => {
  const todos = signal(props.initialTodos || []);
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

  const toggleTodo = (id) => {
    todos(todos().map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    ));
  };

  return html`
    <div class="todo-list">
      <h1>Todos (${remaining} remaining)</h1>

      <div class="add-todo">
        <input
          value=${newTodo}
          oninput=${(e) => newTodo(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button onclick=${addTodo}>Add</button>
      </div>

      <ul>
        ${todos().map(todo => html`
          <li key=${todo.id} class=${todo.done ? 'done' : ''}>
            <input
              type="checkbox"
              checked=${todo.done}
              onchange=${() => toggleTodo(todo.id)}
            />
            <span>${todo.text}</span>
          </li>
        `)}
      </ul>
    </div>
  `;
});
```

### Example 3: Async Data Loading

```javascript
// user-profile.js
import { defineComponent, signal, computed } from 'esor/ssr/enhanced';
import { html } from 'esor';

export const UserProfile = defineComponent(async (props) => {
  // Server: Fetch data before rendering
  // Client: Will be restored from SSR state
  const userData = signal(
    await fetch(`/api/users/${props.userId}`).then(r => r.json())
  );

  const displayName = computed(() =>
    `${userData().firstName} ${userData().lastName}`
  );

  return html`
    <div class="profile">
      <img src=${() => userData().avatar} alt=${displayName} />
      <h1>${displayName}</h1>
      <p>${() => userData().bio}</p>
      <p>Followers: ${() => userData().followers}</p>
    </div>
  `;
});
```

### Example 4: Nested Components

```javascript
// components.js
import { defineComponent, signal } from 'esor/ssr/enhanced';
import { html } from 'esor';

// Child component
const Button = defineComponent((props) => {
  const clicks = signal(0);

  const handleClick = () => {
    clicks(clicks() + 1);
    props.onClick?.();
  };

  return html`
    <button onclick=${handleClick}>
      ${props.label} (clicked ${clicks} times)
    </button>
  `;
});

// Parent component
export const App = defineComponent(() => {
  const message = signal('Hello!');

  return html`
    <div>
      <h1>${message}</h1>
      <${Button} label="Click me" onClick=${() => message('Thanks!')} />
      <${Button} label="Or me" onClick=${() => message('Awesome!')} />
    </div>
  `;
});
```

---

## 🚀 Full Server Example

```javascript
// server.js
import express from 'express';
import { renderComponent, injectState } from 'esor/ssr/enhanced';
import { Counter } from './components/counter.js';
import { TodoList } from './components/todos.js';

const app = express();

app.get('/', (req, res) => {
  const { html, state } = renderComponent(Counter);

  const page = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Esor Enhanced SSR</title>
      <script type="module" src="/client.js"></script>
    </head>
    <body>
      <div id="app">${html}</div>
    </body>
    </html>
  `;

  res.send(injectState(page, state));
});

app.get('/todos', async (req, res) => {
  const initialTodos = await fetchTodosFromDB();

  const { html, state } = renderComponent(TodoList, {
    initialTodos
  });

  const page = createPage(html);
  res.send(injectState(page, state));
});

app.listen(3000);
```

## 🌐 Full Client Example

```javascript
// client.js
import { hydrateComponent } from 'esor/ssr/enhanced';
import { Counter } from './components/counter.js';
import { TodoList } from './components/todos.js';

// Automatically detects which component to hydrate based on route
const path = window.location.pathname;

if (path === '/') {
  hydrateComponent('#app', Counter);
} else if (path === '/todos') {
  hydrateComponent('#app', TodoList);
}

// Or use universal render (auto-detects SSR content)
import { render } from 'esor/ssr/enhanced';
render(Counter, '#app');  // Hydrates if SSR content exists, else renders
```

---

## 💡 Migration Guide

### From Old API to New API

1. **Wrap components with `defineComponent`:**

```diff
- const template = html`<div>${count}</div>`;
+ const Counter = defineComponent(() => {
+   const count = signal(0);
+   return html`<div>${count}</div>`;
+ });
```

2. **Replace `renderToString` with `renderComponent`:**

```diff
- const { html, state } = renderToString(template);
+ const { html, state } = renderComponent(Counter);
```

3. **Replace manual `hydrate` with `hydrateComponent`:**

```diff
- hydrate('#app', {
-   signals: { s0: count, s1: name },
-   handlers: { click: handleClick }
- });
+ hydrateComponent('#app', Counter);
```

4. **Use `signal` and `computed` from enhanced API:**

```diff
- import { signal } from 'esor';
+ import { signal, computed } from 'esor/ssr/enhanced';
```

---

## 🎨 Comparison with SolidJS

### SolidJS:
```jsx
// Requires JSX compilation
const Counter = () => {
  const [count, setCount] = createSignal(0);
  return <div onClick={() => setCount(c => c + 1)}>{count()}</div>;
};

// Server
const html = renderToString(() => <Counter />);

// Client
hydrate(() => <Counter />, root);
```

### Esorjs Enhanced:
```javascript
// No compilation needed!
const Counter = defineComponent(() => {
  const count = signal(0);
  return html`<div onclick=${() => count(count() + 1)}>${count}</div>`;
});

// Server
const { html, state } = renderComponent(Counter);

// Client
hydrateComponent('#app', Counter);
```

**Key Differences:**
- ✅ Esorjs: No JSX compilation required
- ✅ Esorjs: Native template literals
- ✅ Esorjs: Web Components compatible
- ✅ SolidJS: Slightly more compact syntax
- ✅ SolidJS: Better IDE support (JSX)

---

## 🏆 Why Use Enhanced API?

1. **Cleaner Code** - No manual signal mapping
2. **Type Safety** - Automatic tracking prevents errors
3. **Maintainability** - Add/remove signals without changing hydration
4. **Isomorphic** - Same code for server and client
5. **Performance** - Auto-optimization of signal tracking
6. **Developer Experience** - More intuitive and less boilerplate

---

## 📦 Bundle Size

Enhanced API adds minimal overhead:

- Old API: 5.7 KB
- Enhanced API: **6.2 KB** (+0.5 KB)

Still smaller than:
- SolidJS: 14-27 KB
- Svelte: 27-55 KB
