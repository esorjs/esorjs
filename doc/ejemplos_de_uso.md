# Ejemplos de Uso

## Contador Básico

```javascript
import { component, html, signal } from "esor";

component("my-counter", () => {
  const count = signal(0);

  return html`
    <div>
      <p>Contador: ${count}</p>
      <button onclick=${() => count(count() + 1)}>Incrementar</button>
    </div>
  `;
});
```

## Lista de Tareas

```javascript
import { component, html, signal } from 'esor';

component("todo-list", () => {
    const todos = signal([]);
    const newTodo = signal("");

    const addTodo = () => todos([...todos(), newTodo()])

    return html`
        <div>
            <input type="text" oninput=${(e) => newTodo(e.target.value)} />
            <button onclick=${addTodo}>Agregar Tarea</button>
            <ul>
                ${()=>todos().map((todo) => html`<li key=${todo}>${todo}</li>`)}
            </ul>
        </div>
    `;
});

## range

component("my-range", () => {
    const value = signal(50);
    
    return html`
        <div>
            <h2>My Range</h2>
            <p>Value: ${value}</p>
            <input
                type="range"
                min="0"
                max="100"
                oninput="${(e) => value(e.target.value)}"
            />
        </div>
    `;
});
```
