## 2024-05-13 - DOM Traversal Memory Optimization
**Learning:** In the core reconciliation loop (`src/template/reconcile.js`), converting `childNodes` to arrays using `Array.from()` creates massive allocation overhead during deep tree patching. Additionally, iterating `attributes` using `for...of` creates unnecessary iterators.
**Action:** Always prefer direct DOM traversal using `.firstChild` and `.nextSibling` combined with a `while` loop for recursive DOM processing to avoid allocating temporary arrays. Use traditional `for (let i = 0...)` loops for `attributes`.
