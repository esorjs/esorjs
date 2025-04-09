import { component, html, signal } from "../dist/esor.min.js";

component("my-counter", () => {
  const count = signal(0);

  return html`
    <div>
      <h2>My Counter</h2>
      <p>Count: ${count}</p>
      <button onclick=${() => count(count() + 1)}>Increment</button>
      <button onclick=${() => count(count() - 1)}>Decrement</button>
      <button onclick=${() => count(0)}>Reset</button>
    </div>
  `;
});
