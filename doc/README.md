# Documentación de Esor

Bienvenido a la documentación oficial de Esor. Aquí encontrarás información detallada sobre cómo usar y aprovechar al máximo este framework.

## Índice

1. [Introducción](#introducción)
2. [Instalación](#instalación)
3. [Conceptos Básicos](#conceptos-básicos)
4. [Ejemplos de Uso](#ejemplos-de-uso)
5. [API](#api)
6. [Contribuir](#contribuir)
7. [Licencia](#licencia)

## Introducción

Esor es un framework de JavaScript ligero y eficiente para construir interfaces de usuario reactivas. Está diseñado para ser rápido, moderno y fácil de usar.

## Instalación

Puedes instalar Esor usando npm o yarn:

```bash
npm install esor
# o
yarn add esor
```

## Conceptos Básicos

### Componentes

Los componentes son la base de Esor. Puedes definir un componente usando la función `component`.

```javascript
import { component, html } from 'esor';

component('my-component', () => {
  return html`<p>Hola, Esor!</p>`;
});
```

### Reactividad

Esor utiliza un sistema de reactividad basado en señales (signals). Puedes crear señales y efectos para manejar el estado reactivo.

```javascript
import { useSignal, useEffect } from 'esor';

const [count, setCount] = useSignal(0);

useEffect(() => {
  console.log(`El contador es: ${count()}`);
});
```

## Ejemplos de Uso

### Contador Básico

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

### Lista de Tareas

```javascript
import { component, html, useSignal } from 'esor';

component('todo-list', () => {
  const [todos, setTodos] = useSignal([]);
  const [newTodo, setNewTodo] = useSignal('');

  const addTodo = () => {
    setTodos([...todos(), newTodo()]);
    setNewTodo('');
  };

  return html`
    <div>
      <input type="text" value=${newTodo()} @input=${(e) => setNewTodo(e.target.value)} />
      <button @click=${addTodo}>Agregar Tarea</button>
      <ul>
        ${todos().map(todo => html`<li>${todo}</li>`)}
      </ul>
    </div>
  `;
});
```

## API

### `component`

Define un nuevo componente.

```javascript
component(name: string, render: () => TemplateResult);
```

### `useSignal`

Crea una nueva señal reactiva.

```javascript
const [value, setValue] = useSignal(initialValue);
```

### `useEffect`

Crea un efecto que se ejecuta cuando cambian las señales dependientes.

```javascript
useEffect(() => {
  // código del efecto
});
```

## Contribuir

Las contribuciones son bienvenidas. Por favor, lee nuestras [guías de contribución](https://github.com/esorjs/esor/blob/main/CONTRIBUTING.md) antes de enviar un pull request.

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo [LICENSE](https://github.com/esorjs/esor/blob/main/LICENSE) para más detalles.
