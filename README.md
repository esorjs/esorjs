<p align="center">
  <a href="https://github.com/esorjs/esor/wiki" target="_blank">
    <img src="./assets/esor_logo.png" alt="Esor Logo" width="200" />
  </a>
</p>

<p align="center"><strong>Fast, light and modern</strong></p>
<p align="center"><strong>All the power of Web Components and more in just 3 KB.</strong></p>

---

**Esor** is a lightweight and efficient JavaScript framework for building reactive user interfaces, leveraging native Web Components, signal-based reactivity, and an optimized templating engine.

### 🔥 Main Features

- **Native Web Components:** Encapsulated components using Shadow DOM.
- **Signal-based Reactivity:** Inspired by SolidJS, with functions like `signal`, `effect`, and `computed`.
- **Declarative Templating:** Template syntax similar to lit-html.
- **Efficient DOM Reconciliation:** Optimized updates without a Virtual DOM.
- **Lifecycle & Events:** Modular hooks and event management.
- **Optimal Speed:** Performance-centric architecture.
- **Simple API:** Familiar patterns from React and SolidJS.
- **No Compilation Required.**

### 📖 More Information

Learn more on our [Esor Website ➞](https://github.com/esorjs/esor/wiki).

---

### 🔘 Badges

[![Version](https://img.shields.io/npm/v/esor.svg)](https://www.npmjs.com/package/esor)  
[![License](https://img.shields.io/npm/l/esor.svg)](https://github.com/esorjs/esor/blob/main/LICENSE)  
[![Downloads](https://img.shields.io/npm/dm/esor.svg)](https://www.npmjs.com/package/esor)  

[![gzip size](https://img.badgesize.io/https://unpkg.com/esor/dist/esor.min.js?compression=gzip&label=gzip)](https://unpkg.com/esor/dist/esor.min.js)  
[![brotli size](https://img.badgesize.io/https://unpkg.com/esor/dist/esor.min.js?compression=brotli&label=brotli)](https://unpkg.com/esor/dist/esor.min.js)  

[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/esorjs/esor)  
[![Twitter Follow](https://img.shields.io/twitter/follow/esor_js.svg?style=social&label=Follow)](https://twitter.com/intent/follow?screen_name=esor_js)  
[![Discord](https://img.shields.io/discord/1334318737704357930.svg?style=social&logo=discord&label=Discord)](https://discord.com/channels/1334318737704357930/1334318738140299354)

You can also check out some awesome libraries in the [awesome-esor list](https://github.com/esorjs/awesome-esor) 😎.

---

### 📦 Installation

Install Esor using npm or yarn:

```bash
npm install esor
# or
yarn add esor
```

---

### ⚛️ Basic Usage

Below is an example of a counter using the new API:

```javascript
import { component, html, signal } from "esor";

component("my-counter", () => {
  const count = signal(0);

  return html`
    <div>
      <p>Counter: ${count()}</p>
      <button onclick=${() => count(count() + 1)}>Increment</button>
    </div>
  `;
});
```

> **Note:**  
> In the new API, the `signal` function is used to create reactive values. To retrieve the current value, call `count()`, and to update it, call `count(newValue)`.

Use it in your HTML like this:

```html
<my-counter></my-counter>
```

---

### 📚 Documentation

For more detailed information about the API, please check the [official documentation](https://github.com/esorjs/esor/wiki).

---

### 🫶🏻 Contribute

Contributions are welcome! Please review our [Contribution Guidelines](https://github.com/esorjs/esor/blob/main/CONTRIBUTING.md) before submitting a pull request.

---

### 🔖 License

This project is distributed under the MIT license. See the [LICENSE](https://github.com/esorjs/esor/blob/main/LICENSE) file for more details.
