## 2026-05-26 - Avoid memory allocation overhead during iteration of NamedNodeMap
**Learning:** Iterating over `NamedNodeMap` (like `element.attributes`) with `for...of` destructuring incurs significant iterator and object allocation memory overhead, which causes slower execution times and higher garbage collection churn.
**Action:** Always use a standard indexed `for` loop (`for (let i = 0; i < node.attributes.length; i++)`) to extract attributes to optimize hot execution paths like component property initialization.
