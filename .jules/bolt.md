## 2025-03-09 - [Signal Early Return Optimization]
**Learning:** Signal updates involve `queueMicrotask` scheduling, creating `Set` objects, and calling other iteration functions. When a signal is updated but has 0 subscribers, all this work is wasted.
**Action:** Always check `subscribers.size === 0` immediately after setting the value and return early to bypass unnecessary work. This pattern yields almost a 2x performance improvement in raw signal updates where the signal has no active bindings/effects.
