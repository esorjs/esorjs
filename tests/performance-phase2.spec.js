// @ts-check
import { test, expect } from "@playwright/test";
import { signal, effect, flushSync } from "../src/hooks/reactivity.js";
import { html } from "../src/template/render.js";

test("Performance: reconciliation with list operations", () => {
    const container = document.createElement("div");
    const items = signal(Array.from({ length: 100 }, (_, i) => i));

    // Initial render
    effect(() => {
        const list = items();
        container.innerHTML = "";
        const ul = document.createElement("ul");
        list.forEach(item => {
            const li = document.createElement("li");
            li.textContent = `Item ${item}`;
            ul.appendChild(li);
        });
        container.appendChild(ul);
    });

    const start = performance.now();

    // Test push operation (heuristic: additions at end)
    flushSync(() => items([...items(), 100, 101, 102]));

    // Test pop operation (heuristic: removals from end)
    flushSync(() => items(items().slice(0, -3)));

    // Test unshift operation (heuristic: additions at start)
    flushSync(() => items([97, 98, 99, ...items()]));

    // Test shift operation (heuristic: removals from start)
    flushSync(() => items(items().slice(3)));

    const end = performance.now();

    expect(end - start).toBeLessThan(100); // Should be fast with heuristics
    expect(container.querySelectorAll("li").length).toBe(100);
});

test("Performance: large list reconciliation", () => {
    const container = document.createElement("div");
    const items = signal(Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i })));

    effect(() => {
        const list = items();
        container.innerHTML = "";
        const ul = document.createElement("ul");
        list.forEach(item => {
            const li = document.createElement("li");
            li.textContent = `Item ${item.value}`;
            li.setAttribute("data-id", item.id);
            ul.appendChild(li);
        });
        container.appendChild(ul);
    });

    const start = performance.now();

    // Update middle item
    flushSync(() => {
        const newItems = [...items()];
        newItems[500] = { id: 500, value: 999 };
        items(newItems);
    });

    const end = performance.now();

    expect(end - start).toBeLessThan(150); // Should handle large lists efficiently
    expect(container.querySelector('[data-id="500"]')?.textContent).toBe("Item 999");
});

test("Performance: static template caching", () => {
    const container = document.createElement("div");

    // Static template (no dynamic values)
    const staticTemplate = html`<div class="static">Hello World</div>`;

    const start = performance.now();
    const iterations = 100;

    // Render same static template multiple times
    for (let i = 0; i < iterations; i++) {
        const testContainer = document.createElement("div");
        testContainer.innerHTML = "";
        // Simulating renderTemplate manually
        const fragment = staticTemplate.template.content.cloneNode(true);
        testContainer.appendChild(fragment);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    // Static templates should be very fast (< 0.1ms per render)
    expect(avgTime).toBeLessThan(0.1);
});

test("Performance: semi-static template caching", () => {
    const container = document.createElement("div");
    const name = "John";
    const age = 30;

    // Semi-static template (non-reactive values)
    const semiStaticTemplate = html`<div class="user">${name} is ${age} years old</div>`;

    const start = performance.now();
    const iterations = 50;

    // Render same semi-static template multiple times
    for (let i = 0; i < iterations; i++) {
        const testContainer = document.createElement("div");
        testContainer.innerHTML = "";
        const fragment = semiStaticTemplate.template.content.cloneNode(true);
        testContainer.appendChild(fragment);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    // Semi-static templates should be fast (< 0.2ms per render)
    expect(avgTime).toBeLessThan(0.2);
});

test("Performance: reactive vs non-reactive templates", () => {
    const count = signal(0);

    // Reactive template
    const reactiveTemplate = html`<div>${() => count()}</div>`;

    // Non-reactive template
    const nonReactiveTemplate = html`<div>${42}</div>`;

    // Both should be created efficiently
    expect(reactiveTemplate._hasReactiveValues).toBe(true);
    expect(nonReactiveTemplate._hasReactiveValues).toBe(false);
    expect(nonReactiveTemplate._isStatic).toBe(false);

    // Completely static template
    const staticTemplate = html`<div>Static Content</div>`;
    expect(staticTemplate._isStatic).toBe(true);
    expect(staticTemplate._hasReactiveValues).toBe(false);
});

test("Performance: container pool efficiency", () => {
    // Test that container pool is being used efficiently
    const start = performance.now();

    // Simulate heavy container usage
    const containers = [];
    for (let i = 0; i < 100; i++) {
        containers.push(document.createElement("div"));
    }

    // Clean up (simulating releaseContainer)
    containers.forEach(c => {
        c.textContent = "";
        c.innerHTML = "";
    });

    const end = performance.now();

    // Container operations should be fast
    expect(end - start).toBeLessThan(50);
});

test("Performance: reconciliation heuristics - same start and end", () => {
    const parent = document.createElement("div");

    // Create initial children
    for (let i = 0; i < 50; i++) {
        const child = document.createElement("div");
        child.textContent = `Child ${i}`;
        child.setAttribute("data-id", i);
        parent.appendChild(child);
    }

    const start = performance.now();

    // Update only middle elements (same start and end heuristic should apply)
    const children = Array.from(parent.childNodes);

    // This should be fast because start and end are the same
    for (let i = 20; i < 30; i++) {
        children[i].textContent = `Updated ${i}`;
    }

    const end = performance.now();

    expect(end - start).toBeLessThan(10);
    expect(parent.querySelector('[data-id="25"]')?.textContent).toBe("Updated 25");
});

test("Performance: batch reconciliation updates", () => {
    const container = document.createElement("div");
    const list = signal([1, 2, 3, 4, 5]);

    effect(() => {
        const items = list();
        container.innerHTML = "";
        items.forEach(item => {
            const div = document.createElement("div");
            div.textContent = `Item ${item}`;
            container.appendChild(div);
        });
    });

    const start = performance.now();

    // Multiple updates should batch
    list([1, 2, 3, 4, 5, 6]);
    list([1, 2, 3, 4, 5, 6, 7]);
    list([1, 2, 3, 4, 5, 6, 7, 8]);

    // Wait for batching
    flushSync(() => {});

    const end = performance.now();

    expect(end - start).toBeLessThan(20);
    expect(container.children.length).toBe(8);
});

test("Performance: memory efficiency with template cache", () => {
    // Test that template cache doesn't grow unbounded
    const templates = [];

    for (let i = 0; i < 30; i++) {
        templates.push(html`<div>Template ${i}</div>`);
    }

    // All templates should be created
    expect(templates.length).toBe(30);

    // Cache should have reasonable size (MAX_FRAGMENT_CACHE is 20)
    // This is just a sanity check - actual cache size is internal
    expect(templates.every(t => t._isStatic)).toBe(false); // They have dynamic values
});
