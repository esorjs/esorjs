
## 2024-05-24 - [Microtask Queueing Overhead in Auto-batching]
**Learning:** In the custom reactivity system, unconditionally queueing a microtask for auto-batching (even when a signal has 0 subscribers) causes a massive performance bottleneck. Queueing `queueMicrotask` 1,000,000 times takes ~30ms, while simply setting the value with an early return takes ~8ms.
**Action:** Always check if a signal actually has observers/subscribers (`subscribers.size > 0`) before scheduling microtasks or instantiating Sets for pending effects.
