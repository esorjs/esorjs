## 2024-05-18 - Broken WeakMap Size Check
**Learning:** `WeakMap` in JavaScript does not have a `.size` property. This means conditions like `weakMap.size < MAX` evaluate to `undefined < MAX` which is always `false`. In `src/template/render.js`, this completely disabled the `fragmentCache` because it never grew past the limit (it was always evaluated as false).
**Action:** Track WeakMap size manually with a counter, or use a Map if size tracking/capping is required without memory leak concerns.
