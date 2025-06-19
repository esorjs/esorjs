// @ts-check
import { test, expect } from "@playwright/test";
import { emit } from "../src/hooks/emit.js";

test("Events: basic emission", () => {
    const target = new EventTarget();
    const events = [];

    target.addEventListener("test-event", (event) => {
        events.push(event);
    });

    const event = emit("test-event", { data: "test" }, target);

    expect(event instanceof CustomEvent).toBe(true);
    expect(events.length).toBe(1);
    expect(events[0]).toBe(event);
});

test("Events: event properties", () => {
    const target = new EventTarget();

    const event = emit("test-event", { data: "test" }, target);

    expect(event.type).toBe("test-event");
    expect(event.detail).toEqual({ data: "test" });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.cancelable).toBe(true);
});

test("Events: without target", () => {
    const event = emit("test-event", { data: "test" });

    expect(event instanceof CustomEvent).toBe(true);
    expect(event.type).toBe("test-event");
    expect(event.detail).toEqual({ data: "test" });
});

test("Events: complex detail", () => {
    const complexData = {
        user: { name: "John", id: 123 },
        items: [1, 2, 3],
        metadata: { timestamp: Date.now() },
    };

    const event = emit("complex-event", complexData);

    expect(event.detail).toEqual(complexData);
    expect(event.detail.user.name).toBe("John");
    expect(event.detail.items).toEqual([1, 2, 3]);
});
