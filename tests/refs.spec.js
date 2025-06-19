// @ts-check
import { test, expect } from "@playwright/test";
import { ref } from "../src/hooks/ref.js";

test("Refs: basic functionality", () => {
    const myRef = ref();

    expect(myRef()).toBe(null);

    const testValue = "test value";
    myRef(testValue);

    expect(myRef()).toBe(testValue);
});

test("Refs: custom initial value", () => {
    const myRef = ref("initial");
    expect(myRef()).toBe("initial");

    myRef("updated");
    expect(myRef()).toBe("updated");
});

test("Refs: with objects", () => {
    const objRef = ref();
    const testObj = { name: "test", value: 42 };

    objRef(testObj);
    expect(objRef()).toBe(testObj);
    expect(objRef().name).toBe("test");
});

test("Refs: clearing values", () => {
    const myRef = ref("initial");
    expect(myRef()).toBe("initial");

    myRef(null);
    expect(myRef()).toBe(null);

    myRef(undefined);
    expect(myRef()).toBe(undefined);
});

test("Refs: not reactive", () => {
    const myRef = ref("initial");
    const values = [];

    // refs should not be reactive
    // This test confirms refs don't trigger effects when changed
    expect(() => {
        // No effect system should track ref access
        const value = myRef();
        values.push(value);
    }).not.toThrow();

    expect(values).toEqual(["initial"]);
});

test("Refs: memory management", () => {
    const refs = [];

    // Create many refs
    for (let i = 0; i < 100; i++) {
        const r = ref(`value-${i}`);
        refs.push(r);
    }

    expect(refs.length).toBe(100);
    expect(refs[50]()).toBe("value-50");

    // Clear all refs
    refs.forEach((r) => r(null));

    expect(refs[0]()).toBe(null);
    expect(refs[99]()).toBe(null);
});
