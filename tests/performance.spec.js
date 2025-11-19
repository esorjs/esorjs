// @ts-check
import { test, expect } from "@playwright/test";
import { signal, effect, computed, batch, flushSync } from "../src/hooks/reactivity.js";

// Helper to wait for microtasks to complete
const waitForMicrotasks = () => new Promise(resolve => setTimeout(resolve, 0));

test("Performance: signal updates per second", () => {
    const count = signal(0);
    let updateCount = 0;

    effect(() => {
        count();
        updateCount++;
    });

    const start = performance.now();

    // Perform 1000 updates with flushSync to measure raw performance
    for (let i = 1; i <= 1000; i++) {
        flushSync(() => count(i));
    }

    const end = performance.now();
    const duration = end - start;
    const updatesPerSecond = Math.round(1000 / (duration / 1000));

    expect(updatesPerSecond).toBeGreaterThan(5000);
    expect(updateCount).toBe(1001); // initial + 1000 updates
});

test("Performance: many signals creation", () => {
    const start = performance.now();
    const signals = [];

    for (let i = 0; i < 1000; i++) {
        signals.push(signal(i));
    }

    const end = performance.now();

    expect(end - start).toBeLessThan(100);
    expect(signals.length).toBe(1000);
    expect(signals[500]()).toBe(500);
});

test("Performance: computed chaining - realistic", () => {
    const base = signal(1);

    // Create a more realistic computed chain (not so deep)
    const doubled = computed(() => base() * 2);
    const plus10 = computed(() => doubled() + 10);
    const final = computed(() => plus10() * 3);

    // Add effect to track executions
    let effectRuns = 0;
    effect(() => {
        final();
        effectRuns++;
    });

    const start = performance.now();

    // Update base multiple times with flushSync for synchronous execution
    for (let i = 2; i <= 11; i++) {
        flushSync(() => base(i));
    }

    const end = performance.now();

    // base=11 → doubled=22 → plus10=32 → final=96
    expect(final()).toBe(96);
    expect(effectRuns).toBe(11); // initial + 10 updates
    expect(end - start).toBeLessThan(50); // More realistic for shorter chain
});

test("Performance: large array handling", () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: `item-${i}`,
    }));

    const items = signal(largeArray);
    let renderCount = 0;

    effect(() => {
        items();
        renderCount++;
    });

    const start = performance.now();

    // Update single item (using flushSync for synchronous execution)
    const newArray = [...items()];
    newArray[500] = { id: 500, value: "updated-item-500" };
    flushSync(() => items(newArray));

    const end = performance.now();

    expect(renderCount).toBe(2); // initial + update
    expect(end - start).toBeLessThan(50);
    expect(items()[500].value).toBe("updated-item-500");
});

test("Performance: batch updates - corrected logic", () => {
    const count = signal(0);
    let updateCount = 0;

    effect(() => {
        count();
        updateCount++;
    });

    const start = performance.now();

    // Test actual batching behavior - multiple updates in single batch
    batch(() => {
        for (let i = 1; i <= 100; i++) {
            // Reduced iterations for more realistic test
            count(i);
        }
    });

    const end = performance.now();

    // With optimized batch implementation, effects are prevented during batch
    // but execute after batch ends, so we expect initial + 1 (after batch completes)
    expect(updateCount).toBe(2); // Initial effect + 1 batched update at the end
    expect(count()).toBe(100); // Final value should be 100
    expect(end - start).toBeLessThan(20); // Reasonable time limit
});

test("Performance: auto-batching vs flushSync vs manual batch", async () => {
    // Test 1: flushSync (synchronous execution, no batching)
    const countSync = signal(0);
    let updateCountSync = 0;

    effect(() => {
        countSync();
        updateCountSync++;
    });

    const startSync = performance.now();
    for (let i = 1; i <= 50; i++) {
        flushSync(() => countSync(i));
    }
    const endSync = performance.now();
    const durationSync = endSync - startSync;

    // Test 2: auto-batching (automatic batching with microtasks)
    const countAuto = signal(0);
    let updateCountAuto = 0;

    effect(() => {
        countAuto();
        updateCountAuto++;
    });

    const startAuto = performance.now();
    for (let i = 1; i <= 50; i++) {
        countAuto(i);
    }
    const endAutoSync = performance.now();
    await waitForMicrotasks(); // Wait for auto-batching to complete
    const endAuto = performance.now();
    const durationAuto = endAutoSync - startAuto; // Measure without setTimeout overhead

    // Test 3: manual batch (explicit batching)
    const countBatch = signal(0);
    let updateCountBatch = 0;

    effect(() => {
        countBatch();
        updateCountBatch++;
    });

    const startBatch = performance.now();
    batch(() => {
        for (let i = 1; i <= 50; i++) {
            countBatch(i);
        }
    });
    const endBatch = performance.now();
    const durationBatch = endBatch - startBatch;

    // Verify execution counts
    expect(updateCountSync).toBe(51); // initial + 50 updates (no batching)
    expect(updateCountAuto).toBe(2); // initial + 1 auto-batched update
    expect(updateCountBatch).toBe(2); // initial + 1 manual batched update

    // All should have final value
    expect(countSync()).toBe(50);
    expect(countAuto()).toBe(50);
    expect(countBatch()).toBe(50);

    // Auto-batching and manual batch should be faster than flushSync
    // (measuring only the synchronous part for fair comparison)
    expect(durationAuto).toBeLessThan(durationSync);
    expect(durationBatch).toBeLessThan(durationSync);
});

test("Performance: effect creation and execution", () => {
    const count = signal(0);
    const effects = [];

    const start = performance.now();

    // Create many effects
    for (let i = 0; i < 100; i++) {
        let effectValue = null;
        const eff = effect(() => {
            effectValue = count() * i;
        });
        effects.push({ effect: eff, getValue: () => effectValue });
    }

    // Trigger all effects by updating signal (using flushSync for synchronous execution)
    flushSync(() => count(5));

    const end = performance.now();

    expect(effects.length).toBe(100);
    expect(effects[10].getValue()).toBe(50); // 5 * 10
    expect(effects[50].getValue()).toBe(250); // 5 * 50
    expect(end - start).toBeLessThan(100); // Should create and execute quickly
});

test("Performance: computed dependency chain", () => {
    const base = signal(1);
    const computed1 = computed(() => base() * 2);
    const computed2 = computed(() => computed1() + 10);
    const computed3 = computed(() => computed2() * 3);

    let effectRuns = 0;
    effect(() => {
        computed3();
        effectRuns++;
    });

    const start = performance.now();

    // Single base update should cascade through all computed (using flushSync)
    flushSync(() => base(5));

    const end = performance.now();

    expect(computed3()).toBe(60); // ((5 * 2) + 10) * 3 = 60
    expect(effectRuns).toBe(2); // initial + after base update
    expect(end - start).toBeLessThan(20);
});

test("Performance: memory efficient updates", () => {
    // Test that framework doesn't leak memory with many updates
    const signals = [];

    const start = performance.now();

    // Create signals
    for (let i = 0; i < 50; i++) {
        signals.push(signal(i));
    }

    // Update all signals multiple times (batching helps with memory efficiency)
    for (let round = 0; round < 10; round++) {
        batch(() => {
            signals.forEach((s, index) => {
                s(index * round);
            });
        });
    }

    const end = performance.now();

    expect(signals.length).toBe(50);
    expect(signals[25]()).toBe(25 * 9); // 25 * (10-1)
    expect(end - start).toBeLessThan(100);
});

test("Performance: auto-batching demonstration", async () => {
    // Demonstrate that auto-batching works automatically
    const count = signal(0);
    const name = signal("initial");
    const active = signal(false);
    let renderCount = 0;

    effect(() => {
        count();
        name();
        active();
        renderCount++;
    });

    expect(renderCount).toBe(1); // Initial render

    // Multiple signal updates in same synchronous block
    count(1);
    name("updated");
    active(true);

    // Effects haven't run yet (still in same microtask)
    expect(renderCount).toBe(1);

    // Wait for auto-batching to complete
    await waitForMicrotasks();

    // All updates batched into single render
    expect(renderCount).toBe(2); // Initial + 1 batched update
    expect(count()).toBe(1);
    expect(name()).toBe("updated");
    expect(active()).toBe(true);
});
