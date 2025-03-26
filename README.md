<p align="center">
<a href="https://github.com/esorjs/esor/wiki" target="_blank">
    <img src="./assets/esor_logo.png" alt="Esor Logo" width="200"/> 
 </a>

</p>
<p align="center"><strong>Fast, light and modern</strong></p>
Esor is a lightweight and efficient JavaScript framework for building reactive user interfaces, leveraging native Web Components, signal-based reactivity and an optimized templating engine.

  **All the power of Web Components and more in just 3 KB.**

##### Características Principales

- Native Web Components:\*\* Creates encapsulated components with Shadow DOM.
- Signal-based reactivity:\*\* Inspired by SolidJS, with functions such as `signal`, `effect` and `computed`.
- Declarative templating:\*\* Syntax similar to lit-html to define templates declaratively.
- Efficient DOM:\*\* Efficient reconciliation system, accurate and optimized updates, no Virtual DOM.
- Events and Lifecycle:\*\* Define hooks and manage events in a modular way.
- Optimal Speed: \*\* Performance-centric architecture.
- API and patterns known from `React` and `SolidJs`.
- No compilation required.

### 🔥 More information at the [Esor Website ➞](https://github.com/esorjs/esor/wiki)

<table border="0">
<tbody>
<tr>
<td>

[![Version](https://img.shields.io/npm/v/esor.svg)](https://www.npmjs.com/package/esor)  
[![License](https://img.shields.io/npm/l/esor.svg)](https://github.com/esorjs/esor/blob/main/LICENSE)  
[![Downloads](https://img.shields.io/npm/dm/esor.svg)](https://www.npmjs.com/package/esor)

[![gzip size](https://img.badgesize.io/https://unpkg.com/esor/dist/esor.min.js?compression=gzip&label=gzip)](https://unpkg.com/esor/dist/esor.min.js)
[![brotli size](https://img.badgesize.io/https://unpkg.com/esor/dist/esor.min.js?compression=brotli&label=brotli)](https://unpkg.com/esor/dist/esor.min.js)

</td>
</tr>
</tbody>
</table>

You can find some awesome libraries in the [awesome-esor list](https://github.com/esorjs/awesome-esor) :sunglasses:

---

## Installation

Install Esor using npm or yarn:

```bash
npm install esor
# o
yarn add esor
```

---

## Basic Usage

Here is an example of a counter using the new API:

```javascript
import { component, html, signal } from "esor";

component("my-counter", () => {
  const count = signal(0);

  return html`
    <div>
      <p>Contador: ${count()}</p>
      <button onclick=${() => count(count() + 1)}>Incrementar</button>
    </div>
  `;
});
```

> **Note:**  
> In the new API, the `signal` function is used to create reactive values. To get the current value, it is invoked as a function: `count()`, and to update it, it is called by passing the new value as an argument: `count(newValue)`.

---

## Documentation

For more details about the API, check the [official documentation].(https://github.com/esorjs/esor/wiki).

---

## Contribute

Contributions are welcome! See our [contribution guidelines].(https://github.com/esorjs/esor/blob/main/CONTRIBUTING.md) before sending a pull request.

---

## License

This project is distributed under the MIT license. See the file [LICENSE](https://github.com/esorjs/esor/blob/main/LICENSE) for more details.
