## 2024-05-19 - DOM Reconciliation Optimization
**Learning:** Avoid using `Array.from()` on live `NodeList`s and `for...of` destructuring on `NamedNodeMap`s during DOM reconciliation.
**Action:** Use `firstChild`/`nextSibling` traversal for child nodes and indexed `for` loops for attributes to minimize memory allocation and garbage collection overhead.
## 2024-05-19 - Fast DOM Traversal in template rendering
**Learning:** Iterating over `node.childNodes` using an indexed `for` loop is extremely slow because `childNodes` is a live `NodeList` and checking its `.length` or indexing into it repeatedly incurs significant overhead (~9x slower in benchmarks). Similarly, using `for...of` on `parent.children` creates iterator overhead on a live `HTMLCollection`.
**Action:** Always use direct pointer traversal (`let child = node.firstChild; while(child) { ... child = child.nextSibling; }`) instead of indexed loops for `childNodes`. For elements, use `firstElementChild` and `nextElementSibling` instead of `parent.children`.
