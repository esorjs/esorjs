## 2024-05-19 - DOM Reconciliation Optimization
**Learning:** Avoid using `Array.from()` on live `NodeList`s and `for...of` destructuring on `NamedNodeMap`s during DOM reconciliation.
**Action:** Use `firstChild`/`nextSibling` traversal for child nodes and indexed `for` loops for attributes to minimize memory allocation and garbage collection overhead.
## 2024-05-24 - DOM Traversal on Live NodeLists
**Learning:** Iterating over live DOM collections (`children` via `for...of` or `childNodes` via indexed loops) forces the browser to frequently re-evaluate the collection and allocates unnecessary memory.
**Action:** Always prefer direct pointer traversal (`firstElementChild`/`nextElementSibling` or `firstChild`/`nextSibling`) for DOM reconciliation, especially inside hot paths like `reconcileArray` and `renderTemplate` where performance overhead accumulates rapidly.
## 2024-05-18 - [Avoid destructuring NamedNodeMap]
**Learning:** Iterating over `NamedNodeMap` with `for (const { name: n, value: v } of h.attributes)` is significantly slower and creates more memory allocation overhead than an indexed loop (`for (let i = 0; i < attrs.length; i++)`) in tight DOM loops.
**Action:** Use indexed loops for `NamedNodeMap` and other array-like DOM structures to avoid iterator allocation and destructuring overhead.
