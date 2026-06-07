## 2024-05-19 - DOM Reconciliation Optimization
**Learning:** Avoid using `Array.from()` on live `NodeList`s and `for...of` destructuring on `NamedNodeMap`s during DOM reconciliation.
**Action:** Use `firstChild`/`nextSibling` traversal for child nodes and indexed `for` loops for attributes to minimize memory allocation and garbage collection overhead.
## 2024-05-24 - DOM Traversal on Live NodeLists
**Learning:** Iterating over live DOM collections (`children` via `for...of` or `childNodes` via indexed loops) forces the browser to frequently re-evaluate the collection and allocates unnecessary memory.
**Action:** Always prefer direct pointer traversal (`firstElementChild`/`nextElementSibling` or `firstChild`/`nextSibling`) for DOM reconciliation, especially inside hot paths like `reconcileArray` and `renderTemplate` where performance overhead accumulates rapidly.
## 2024-05-24 - Microtask Queue Batching
**Learning:** Enqueuing multiple microtasks in a loop (e.g., `queueMicrotask` per hook in `forEach`) incurs a massive performance penalty and causes heap memory exhaustion for large sets compared to enqueuing a single microtask that iterates and executes all items. Benchmarking showed an overhead reduction from ~65ms to ~2ms for 100k iteration test case.
**Action:** Always wrap array iteration inside a single `queueMicrotask` instead of wrapping each element execution in a distinct `queueMicrotask`. Also prefer standard `for` loop over `.forEach` in hot paths.
## 2025-02-28 - Fast DOM children removal
**Learning:** Using `parent.textContent = ''` is significantly faster for clearing a DOM node's children compared to iterating with `while (parent.firstChild) parent.removeChild(parent.firstChild);`. This is due to internal browser optimizations for textContent assignment.
**Action:** Prefer `parent.textContent = ''` when clearing all children of a non-DocumentFragment node, particularly in hot paths like template rendering.
## 2025-02-28 - Fast DOM attribute synchronization
**Learning:** Avoid intermediate `Map` allocations when syncing attributes between old and new nodes.
**Action:** Apply attributes from the new node directly, then iterate backwards through the old node's attributes to remove missing ones using `!newNode.hasAttribute()`, which significantly reduces object allocation and garbage collection overhead.
## 2025-02-28 - Fast iteration over Empty Sets
**Learning:** Checking `set.size > 0` before entering a `for...of` loop over a Set prevents the overhead of creating an iterator when the Set is empty. This is especially relevant in reactive systems where signals might have no subscribers yet. Benchmarks show a significant reduction in execution time for empty sets.
**Action:** Always check `size > 0` before using `for...of` on a `Set` if it is likely to be empty in a hot path.
