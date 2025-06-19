// @ts-check
import { test, expect } from "@playwright/test";
import { parseAttributeValue, initializeProps } from "../src/props.js";

test("Props: parseAttributeValue - números", () => {
    expect(parseAttributeValue("123")).toBe(123);
    expect(parseAttributeValue("123.45")).toBe(123.45);
    expect(parseAttributeValue("-123")).toBe(-123);
    expect(parseAttributeValue("123e5")).toBe(12300000);
    expect(parseAttributeValue("0")).toBe(0);
});

test("Props: parseAttributeValue - booleanos", () => {
    expect(parseAttributeValue("true")).toBe(true);
    expect(parseAttributeValue("false")).toBe(false);
    expect(parseAttributeValue("TRUE")).toBe("TRUE"); // Case sensitive
});

test("Props: parseAttributeValue - JSON", () => {
    expect(parseAttributeValue('{"a":1}')).toEqual({ a: 1 });
    expect(parseAttributeValue("[1,2,3]")).toEqual([1, 2, 3]);
    expect(parseAttributeValue('{"nested":{"value":42}}')).toEqual({
        nested: { value: 42 },
    });
});

test("Props: parseAttributeValue - edge cases", () => {
    expect(parseAttributeValue("")).toBe("");
    expect(parseAttributeValue("")).toBe("");
    expect(parseAttributeValue("")).toBe("");
    expect(parseAttributeValue("simple")).toBe("simple");
    expect(parseAttributeValue("{invalid}")).toBe("{invalid}"); // Invalid JSON
});

test("Props: parseAttributeValue - strings especiales", () => {
    expect(parseAttributeValue("null")).toBe("null");
    expect(parseAttributeValue("undefined")).toBe("undefined");
    expect(parseAttributeValue("NaN")).toBe("NaN");
    expect(parseAttributeValue("Infinity")).toBe("Infinity");
});

test("Props: initializeProps", () => {
    // Mock element with attributes
    const mockElement = {
        attributes: [
            { name: "name", value: "John" },
            { name: "age", value: "25" },
            { name: "active", value: "true" },
            { name: "config", value: '{"theme":"dark"}' },
            { name: "onclick", value: "handler" }, // Should be skipped
            { name: "ref", value: "myRef" }, // Should be skipped
        ],
        props: {},
        _functionProps: null,
    };

    initializeProps(/** @type {any} */ (mockElement));

    expect(mockElement.props.name).toBe("John");
    expect(mockElement.props.age).toBe(25);
    expect(mockElement.props.active).toBe(true);
    expect(mockElement.props.config).toEqual({ theme: "dark" });
    expect(mockElement.props.onclick).toBeUndefined();
    expect(mockElement.props.ref).toBeUndefined();
});
