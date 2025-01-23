<p align="center">
  <img src="./assets/esor_logo.png" alt="Esor Logo" width="200"/>
</p>

<p align="center"><strong>Rápido, ligero y moderno</strong></p>

# Esor
[![Version](https://img.shields.io/npm/v/esor.svg)](https://www.npmjs.com/package/esor)
[![Build Status](https://github.com/esorjs/esor/actions/workflows/ci.yml/badge.svg)](https://github.com/esorjs/esor/actions)
[![License](https://img.shields.io/npm/l/esor.svg)](https://github.com/esorjs/esor/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dm/esor.svg)](https://www.npmjs.com/package/esor)

Esor es un framework de JavaScript ligero y eficiente para construir interfaces de usuario reactivas.

## Carateristicas Principales

- Está construido sobre Web Components nativos.
- Usa un sistema de reactividad basado en señales (signals) inspirado en SolidJs.
- Implementa un motor de templating con sintaxis similar a lit-html
- Maneja la gestión de estado a través de stores.
- Sistema de reconciliación de arrays y actualización eficiente del DOM
- Manejo de atributos y propiedades.
- Sistema de eventos personalizado.

## Instalación

Puedes instalar Esor usando npm o yarn:

```bash
npm install esor
# o
yarn add esor
```

## Uso Básico

Aquí tienes un ejemplo básico de un counter con Esor:

```javascript
import { component, html, useSignal } from 'esor';

component('my-counter', () => {
  const [count, setCount] = useeSignal(0);

  return html`
    <div>
      <p>Contador: ${count}</p>
      <button @click=${() => setCount(count+ 1)}>Incrementar</button>
    </div>
  `;
});
```

## Documentación

Para más información, visita la [documentación oficial](https://github.com/esorjs/esor/wiki).

## Contribuir

Las contribuciones son bienvenidas. Por favor, lee nuestras [guías de contribución](https://github.com/esorjs/esor/blob/main/CONTRIBUTING.md) antes de enviar un pull request.

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo [LICENSE](https://github.com/esorjs/esor/blob/main/LICENSE) para más detalles.
