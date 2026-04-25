## 2025-04-25 - [Fix WeakMap Size Limitation]
**Learning:** `WeakMap` does not have a `.size` property. Relying on `fragmentCache.size` (which evaluates to `undefined`) for conditionally limiting caching broke caching optimization for templates in `src/template/render.js`, causing it to always skip the caching step because `undefined < 20` is false.
**Action:** When tracking size limits for a `WeakMap`, always track the size explicitly with a separate counter variable, e.g., `let fragmentCacheSize = 0;`.
