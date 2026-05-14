## 2024-05-14 - Initialize
**Learning:** Initialized Bolt journal.
**Action:** None.
## 2024-05-14 - Optimize DOM patchNode Attributes and Children
**Learning:** Avoid using `Array.from()` on live `NodeList`s (like `childNodes`) and iterators (like `attributes`) in hot paths like `patchNode`. Iterating with traditional indexed for-loops or using linked-list traversal (`firstChild`/`nextSibling`) significantly reduces garbage collection and array allocation overhead, providing measurable performance gains for deeply nested DOM trees.
**Action:** When updating the DOM during reconciliation, prefer zero-allocation traversal techniques.
