<p align="center">
  <img src="./assets/esor_logo.png" alt="Esor Logo" width="200"/>
</p>

<p align="center"><strong>Rápido, ligero y moderno</strong></p>

# Esor

[![Version](https://img.shields.io/npm/v/esor.svg)](https://www.npmjs.com/package/esor)  
[![License](https://img.shields.io/npm/l/esor.svg)](https://github.com/esorjs/esor/blob/main/LICENSE)  
[![Downloads](https://img.shields.io/npm/dm/esor.svg)](https://www.npmjs.com/package/esor)

Esor es un framework de JavaScript ligero y eficiente para construir interfaces de usuario reactivas, aprovechando Web Components nativos, reactividad basada en señales y un motor de templating optimizado.

---

## Características Principales

- **Web Components Nativos:** Crea componentes encapsulados utilizando Shadow DOM.
- **Reactividad basada en Señales:** Inspirado en SolidJS, con funciones como `signal`, `effect` y `computed`.
- **Motor de Templating Moderno:** Sintaxis similar a lit-html para definir templates de forma declarativa.
- **Gestión de Estado Sencilla:** Soporte para stores que facilitan el manejo de estados globales.
- **Actualización Eficiente del DOM:** Sistema de reconciliación de arrays y optimizaciones para minimizar re-renderizados.
- **Eventos y Ciclo de Vida Personalizados:** Define hooks y gestiona eventos de manera modular.
- **Plugin para Vite/Rollup:** Optimiza la carga y transformación de templates, mejorando el rendimiento en producción.

---

## Instalación

Instala Esor mediante npm o yarn:

```bash
npm install esor
# o
yarn add esor
```

---

## Uso Básico

A continuación, un ejemplo de un contador usando la nueva API:

```javascript
import { component, html, signal } from 'esor';

component('my-counter', () => {
  const count = signal(0);

  return html`
    <div>
      <p>Contador: ${count()}</p>
      <button onclick=${() => count(count() + 1)}>Incrementar</button>
    </div>
  `;
});
```

> **Nota:**  
> En la nueva API, la función `signal` se utiliza para crear valores reactivos. Para obtener el valor actual, se invoca como función (e.g., `count()`), y para actualizarlo se llama pasando el nuevo valor (`count(nuevoValor)`).

---

## Documentación

Para obtener más detalles sobre la API, revisa la [documentación oficial](https://github.com/esorjs/esor/wiki).

---

## Contribuir

¡Las contribuciones son bienvenidas! Consulta nuestras [guías de contribución](https://github.com/esorjs/esor/blob/main/CONTRIBUTING.md) antes de enviar un pull request.

---

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo [LICENSE](https://github.com/esorjs/esor/blob/main/LICENSE) para más detalles.
