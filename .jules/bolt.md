## 2024-05-17 - Reactivity Set Allocation
**Learning:** The reactivity engine's hot path was allocating `new Set()` on every update batch, creating significant GC pressure.
**Action:** Always pre-allocate and swap data structures (like double buffering) in frequently executed framework loops.
