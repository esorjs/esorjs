## 2024-05-19 - DOM Reconciliation Optimization
**Learning:** Avoid using `Array.from()` on live `NodeList`s and `for...of` destructuring on `NamedNodeMap`s during DOM reconciliation.
**Action:** Use `firstChild`/`nextSibling` traversal for child nodes and indexed `for` loops for attributes to minimize memory allocation and garbage collection overhead.
## 2024-05-24 - DOM Traversal on Live NodeLists
**Learning:** Iterating over live DOM collections (`children` via `for...of` or `childNodes` via indexed loops) forces the browser to frequently re-evaluate the collection and allocates unnecessary memory.
**Action:** Always prefer direct pointer traversal (`firstElementChild`/`nextElementSibling` or `firstChild`/`nextSibling`) for DOM reconciliation, especially inside hot paths like `reconcileArray` and `renderTemplate` where performance overhead accumulates rapidly.

## 2026-05-22 - Microtask Batching Optimization
**Learning:** Enqueuing multiple microtasks in a loop (e.g., `queueMicrotask` per hook in lifecycle events) incurs a massive performance penalty due to event loop overhead.
**Action:** Enqueue a single microtask that internally iterates and executes all items using an indexed `for` loop.
