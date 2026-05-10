
## 2024-05-24 - Array allocation overhead in Signal getter/setter
**Learning:** Using rest parameters (`...args`) inside heavily invoked primitive functions like the `signal` getter/setter introduces array allocation overhead. While convenient, creating `args` array on every single read operation of a signal creates a measurable performance impact (taking ~270ms vs ~90ms for 100M read iterations).
**Action:** For extremely hot paths and primitives, avoid `...args` and instead use the explicit `arguments` object check (e.g. `arguments.length === 0`) combined with explicit parameter declaration (e.g. `function(newValue)`). This avoids array allocation for getter calls and drastically speeds up read operations.
