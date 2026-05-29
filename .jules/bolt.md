## 2024-05-19 - DOM Reconciliation Optimization
**Learning:** Avoid using `Array.from()` on live `NodeList`s and `for...of` destructuring on `NamedNodeMap`s during DOM reconciliation.
**Action:** Use `firstChild`/`nextSibling` traversal for child nodes and indexed `for` loops for attributes to minimize memory allocation and garbage collection overhead.
## 2024-05-24 - DOM Traversal on Live NodeLists
**Learning:** Iterating over live DOM collections (`children` via `for...of` or `childNodes` via indexed loops) forces the browser to frequently re-evaluate the collection and allocates unnecessary memory.
**Action:** Always prefer direct pointer traversal (`firstElementChild`/`nextElementSibling` or `firstChild`/`nextSibling`) for DOM reconciliation, especially inside hot paths like `reconcileArray` and `renderTemplate` where performance overhead accumulates rapidly.
## 2024-05-24 - Microtask Queue Batching
**Learning:** Enqueuing multiple microtasks in a loop (e.g., `queueMicrotask` per hook in `forEach`) incurs a massive performance penalty and causes heap memory exhaustion for large sets compared to enqueuing a single microtask that iterates and executes all items. Benchmarking showed an overhead reduction from ~65ms to ~2ms for 100k iteration test case.
**Action:** Always wrap array iteration inside a single `queueMicrotask` instead of wrapping each element execution in a distinct `queueMicrotask`. Also prefer standard `for` loop over `.forEach` in hot paths.
## 2024-05-25 - Attribute Syncing without Maps
**Learning:** Using `Map` to track old attributes during DOM patching (`patchNode`) introduces unnecessary object allocations and slows down reconciliation. Using `newNode.hasAttribute` to check for missing attributes directly in an indexed reverse loop is significantly faster.
**Action:** When synchronizing attributes between two DOM nodes, iterate and apply `newNode` attributes, then loop backwards through `oldNode.attributes` and remove those missing in `newNode` via `!newNode.hasAttribute()`, skipping intermediate `Map` tracking entirely.
