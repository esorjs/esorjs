## 2026-04-27 - [fragmentCache Condition Flaw & Live NodeList Traps]
**Learning:**
1. The `fragmentCache` cache limit condition `fragmentCache.size < 20` evaluated to `false` because `fragmentCache` is a `WeakMap`, which does not have a `.size` property. This silently disabled the caching mechanism entirely. If it had worked, caching processed semi-static nodes would have introduced a stale-cache bug, as dynamically injected static values would be retained across renders.
2. The `patchChildren` heuristics attempted to improve performance by index-based iteration and targeted `parent.removeChild(oldChild)` calls. However, `oldChildren` is a live `NodeList` derived from `childNodes`. Removing elements within a forward-iterating loop shifts indices leftward, leading to out-of-bounds `undefined` errors and application crashes during unmounts.

**Action:**
1. Avoid `WeakMap` for explicit size bounds, and carefully differentiate truly static templates from "semi-static" templates that contain changing interpolated values.
2. When performing batch deletions on a live `NodeList` (like `childNodes`) or `NamedNodeMap` (like `attributes`), either iterate backward or convert the live list to a static array first, to avoid index shifting traps. Iterating backward avoids array allocation and is highly optimal for performance.
