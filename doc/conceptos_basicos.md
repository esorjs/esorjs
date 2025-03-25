
# Conceptos Básicos

## Componentes

Los componentes son la base de Esor. Puedes definir un componente usando la función `component`.

```javascript
import { component, html } from 'esor';

component('my-component', () => {
  return html`<p>Hola, Esor!</p>`;
});
```

## Reactividad

Esor utiliza un sistema de reactividad basado en señales (signals). Puedes crear señales y efectos para manejar el estado reactivo.

```javascript
import { signal, onMount } from 'esor';

const count = signal(0);

onMount(() => {
  console.log(`El contador es: ${count()}`);
});
```