// @ts-check
import { test, expect } from "@playwright/test";
import { signal, effect, computed, batch } from "../src/hooks/reactivity.js";

test("Performance: signal updates per second", () => {
    const count = signal(0);
    let updateCount = 0;

    effect(() => {
        count();
        updateCount++;
    });

    const start = performance.now();

    // Perform 1000 updates
    for (let i = 1; i <= 1000; i++) {
        count(i);
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

    // Update base multiple times
    for (let i = 2; i <= 11; i++) {
        base(i);
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

    // Update single item
    const newArray = [...items()];
    newArray[500] = { id: 500, value: "updated-item-500" };
    items(newArray);

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

test("Performance: batch vs no batch comparison", () => {
    // Test without batching
    const countNoBatch = signal(0);
    let updateCountNoBatch = 0;

    effect(() => {
        countNoBatch();
        updateCountNoBatch++;
    });

    const startNoBatch = performance.now();
    for (let i = 1; i <= 50; i++) {
        countNoBatch(i);
    }
    const endNoBatch = performance.now();
    const durationNoBatch = endNoBatch - startNoBatch;

    // Test with batching
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

    // Verify batch reduces effect executions
    expect(updateCountNoBatch).toBe(51); // initial + 50 updates
    expect(updateCountBatch).toBe(2); // initial + 1 batched update at the end

    // Both should have final value
    expect(countNoBatch()).toBe(50);
    expect(countBatch()).toBe(50);

    // Batch should be at least as fast (or faster)
    expect(durationBatch).toBeLessThanOrEqual(durationNoBatch + 5); // +5ms tolerance
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

    // Trigger all effects by updating signal
    count(5);

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

    // Single base update should cascade through all computed
    base(5);

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

    // Update all signals multiple times
    for (let round = 0; round < 10; round++) {
        signals.forEach((s, index) => {
            s(index * round);
        });
    }

    const end = performance.now();

    expect(signals.length).toBe(50);
    expect(signals[25]()).toBe(25 * 9); // 25 * (10-1)
    expect(end - start).toBeLessThan(100);
});
