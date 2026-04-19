
## 2024-05-18 - [Reactivity Memory & Performance Optimization]
**Learning:** In the `esor` framework's custom reactivity system, creating a `Set` for every signal eagerly consumes significant memory, and updating unobserved signals triggers unnecessary check logic overhead.
**Action:** Always lazily initialize data structures like `Set`s for subscribers only when they are first observed. Add fast paths to skip logic entirely when a signal is unobserved (has no subscribers) to dramatically speed up updates and reduce memory overhead.
