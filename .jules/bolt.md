## 2024-05-19 - DOM Reconciliation Optimization
**Learning:** Avoid using `Array.from()` on live `NodeList`s and `for...of` destructuring on `NamedNodeMap`s during DOM reconciliation.
**Action:** Use `firstChild`/`nextSibling` traversal for child nodes and indexed `for` loops for attributes to minimize memory allocation and garbage collection overhead.
## 2024-05-24 - DOM Traversal on Live NodeLists
**Learning:** Iterating over live DOM collections (`children` via `for...of` or `childNodes` via indexed loops) forces the browser to frequently re-evaluate the collection and allocates unnecessary memory.
**Action:** Always prefer direct pointer traversal (`firstElementChild`/`nextElementSibling` or `firstChild`/`nextSibling`) for DOM reconciliation, especially inside hot paths like `reconcileArray` and `renderTemplate` where performance overhead accumulates rapidly.
## 2024-05-24 - Microtask Queue Batching
**Learning:** Enqueuing multiple microtasks in a loop (e.g., `queueMicrotask` per hook in `forEach`) incurs a massive performance penalty and causes heap memory exhaustion for large sets compared to enqueuing a single microtask that iterates and executes all items. Benchmarking showed an overhead reduction from ~65ms to ~2ms for 100k iteration test case.
**Action:** Always wrap array iteration inside a single `queueMicrotask` instead of wrapping each element execution in a distinct `queueMicrotask`. Also prefer standard `for` loop over `.forEach` in hot paths.

## 2024-05-27 - Iterator overhead on live collections
**Learning:** Using `for...of` loops with object destructuring (e.g., `for (const { name: n, value: v } of h.attributes)`) over live `NamedNodeMap`s inside hot paths incurs heavy performance penalties due to iterator allocation and memory usage from destructuring. Benchmarking showed ~2.5x slower execution (803ms vs 332ms for 1M iterations) compared to indexed loops.
**Action:** Replace `for...of` loops with standard indexed `for` loops (`for (let i = 0; i < h.attributes.length; i++)`) for iterating over `NamedNodeMap` properties in hot paths like `initializeProps` to significantly boost execution speed and reduce garbage collection workload.
