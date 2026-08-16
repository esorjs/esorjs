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
## 2025-02-28 - Avoid inline array `.includes` in hot paths
**Learning:** Avoid inline array creation and `.includes()` checks (e.g., `['a', 'b'].includes(val)`) inside hot rendering loops.
**Action:** Use direct boolean equality comparisons (e.g., `val === 'a' || val === 'b'`) to eliminate dynamic memory allocation and garbage collection overhead.

## 2025-02-28 - Fast string character checking
**Learning:** Checking a specific string character using index accessor `string[0]` incurs unnecessary string allocation overhead in V8 compared to `String.prototype.charCodeAt(0)`.
**Action:** Use `String.prototype.charCodeAt(0)` instead of `string[0]` for checking specific single characters in hot paths to avoid unnecessary string allocation overhead.

## 2025-02-28 - Fast object initialization in component creation
**Learning:** Avoid using `Object.fromEntries(arr.map(...))` or dynamically generating object keys inside hot component creation paths.
**Action:** Use literal object assignments with predefined keys when the schema is known and fixed to prevent significant overhead from mapping and object creation.

## 2025-02-28 - Avoid unnecessary array cloning in hot rendering paths
**Learning:** Avoid unnecessary array cloning (e.g., `[...allValues]`) in hot rendering paths.
**Action:** If an array is only read sequentially and not mutated, pass or return the original array to bypass dynamic allocation and garbage collection overhead.

## 2025-02-28 - Fast Hook Queue Batching
**Learning:** Use flat arrays (e.g., [item1, context1, item2, context2]) and iterate by steps (e.g., i += 2) instead of allocating intermediate wrapper objects (e.g., [{item, context}]) for queuing mechanisms in hot paths. Enqueuing multiple microtasks in a loop incurs a massive performance penalty compared to enqueuing a single microtask that iterates and executes all items.
**Action:** Implement shared queues using flat arrays for enqueuing multiple contextual tasks and execute them using a single batched microtask in hot execution paths to significantly reduce memory allocation and microtask queuing overhead. Always wrap array iteration inside a single queueMicrotask instead of wrapping each element execution in a distinct queueMicrotask.
