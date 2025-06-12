let current = null,
  depth = 0,
  queue = [];

/**
 * Creates a reactive signal that notifies subscribers when its value changes.
 * @param {any} initialValue - Initial value.
 * @returns {Function} - Getter/setter function to access and modify the value.
 */
const signal = (v) => {
  const subs = [];

  return (newV) => {
    if (newV === undefined) {
      // Getter - track dependency
      return (
        current &&
          !subs.includes(current) &&
          (subs.push(current), current.deps?.add(subs)),
        v
      );
    }

    // Setter
    const next = typeof newV === "function" ? newV(v) : newV;
    if (v !== next) {
      v = next;
      if (depth > 0) {
        for (let i = 0; i < subs.length; i++)
          if (!queue.includes(subs[i])) queue.push(subs[i]);
      } else for (let i = 0; i < subs.length; i++) subs[i]();
    }
    return v;
  };
};

/**
 * Creates a reactive effect that runs automatically when its dependencies change.
 * The effect function `fn` is executed immediately and re-executed whenever any
 * of the reactive signals it depends on are updated.
 *
 * @param {Function} fn - The function to execute when the effect is triggered.
 * @returns {Function} - A cleanup function to unsubscribe the effect from its dependencies.
 */
const effect = (fn) => {
  const deps = new Set();
  const run = () => {
    // Cleanup previous subscriptions
    cleanupDeps(run, deps);

    current = run;
    current.deps = deps;
    fn();
    current = null;
  };

  run();

  // Return cleanup function
  return () => {
    cleanupDeps(run, deps);
  };
};

const cleanupDeps = (sub, deps) => {
  if (deps) {
    for (const subs of deps) {
      const i = subs.indexOf(sub);
      if (i !== -1) subs.splice(i, 1);
    }
    deps.clear();
  }
};

/**
 * Creates a computed reactive value that is derived from other signals.
 * The computed value is the result of calling the `fn` function whenever any of
 * the reactive signals it depends on are updated.
 *
 * @param {Function} fn - The function to execute when the computed value is accessed.
 * @returns {Function} - A getter function with a `.dispose` method to clean up the computed value.
 */
const computed = (fn) => {
  const s = signal();
  effect(() => s(fn()));
  return s;
};

/**
 * Batches multiple signal updates into a single update cycle.
 * This defers the execution of effects until all batched updates are complete,
 * optimizing rendering performance.
 *
 * @param {Function} fn - The function containing updates to batch.
 * @returns {any} - The result of the function `fn`.
 */
const batch = (fn) => {
  depth++;
  try {
    return fn();
  } finally {
    --depth;
    if (depth === 0) {
      const queued = queue.splice(0);
      for (let i = 0; i < queued.length; i++) queued[i]();
    }
  }
};

export { signal, effect, computed, batch };
