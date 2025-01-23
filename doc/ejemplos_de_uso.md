
# Ejemplos de Uso

## Contador Básico

```javascript
import { component, html, useSignal } from 'esor';

component('my-counter', () => {
  const [count, setCount] = useSignal(0);

  return html`
    <div>
      <p>Contador: ${count}</p>
      <button @click=${() => setCount(count + 1)}>Incrementar</button>
    </div>
  `;
});
```

## Lista de Tareas

```javascript
import { component, html, useSignal } from 'esor';

component("todo-list", () => {
    const [todos, setTodos] = useSignal([]);
    const [newTodo, setNewTodo] = useSignal("");

    const addTodo = () => {
        setTodos([...todos(), newTodo()]);
    };

    return html`
        <div>
            <input type="text" @input=${(e) => setNewTodo(e.target.value)} />
            <button @click=${addTodo}>Agregar Tarea</button>
            <ul>
                ${todos().map((todo) => html`<li>${todo}</li>`)}
            </ul>
        </div>
    `;
});

## range

component("my-range", () => {
    const [value, setValue] = useSignal(50);
    return html`
        <div>
            <h2>My Range</h2>
            <p>Value: ${value}</p>
            <input
                type="range"
                min="0"
                max="100"
                @input="${(e) => setValue(e.target.value)}"
            />
        </div>
    `;
});