## 2025-02-27 - Rest parameter array allocations in hot paths
**Learning:** Using rest parameters (`...args`) inside heavily invoked functions like `signal` getters/setters causes unnecessary array allocation on every single read and write. In micro-benchmarks within this framework's architecture, using a traditional `function` with the `arguments` object was around 10-40% faster.
**Action:** Always prefer traditional functions with the `arguments` object over rest parameters for simple setter/getter patterns that are considered hot paths in the framework's reactivity system.
