// ts-ignore
// Import simple DOM mock first
import "./dom-mock.js";

import { test, expect } from "@playwright/test";
import { html } from "../src/template/render.js";

test.describe("Template Basic Functionality", () => {
    test("html function creates template object", () => {
        const template = html`<div>Hello World</div>`;
        expect(template._isTemplate).toBe(true);
        expect(template.template).toBeInstanceOf(HTMLTemplateElement);
        expect(Array.isArray(template.values)).toBe(true);
        expect(template.values.length).toBe(0);
    });

    test("single interpolation", () => {
        const name = "John";
        const template = html`<div>Hello ${name}</div>`;
        expect(template._isTemplate).toBe(true);
        expect(template.values.length).toBe(1);
        expect(template.values[0]).toBe("John");
    });

    test("multiple interpolations", () => {
        const name = "John";
        const age = 25;
        const active = true;
        const template = html`<div>
            Name: ${name}, Age: ${age}, Active: ${active}
        </div>`;

        expect(template._isTemplate).toBe(true);
        expect(template.values.length).toBe(3);
        expect(template.values).toEqual(["John", 25, true]);
    });
});

// Grupo de tests de key handling
test.describe("Template Key Handling", () => {
    test("with key attribute", () => {
        const itemId = "item-123";
        const template = html`<div key=${itemId}>Content</div>`;
        expect(template._key).toBe("item-123");
        expect(template.values.length).toBe(0);
    });

    test("key extraction from complex template", () => {
        const key = "my-key";
        const content = "Hello";
        const template = html`<div key=${key} class="item">${content}</div>`;
        expect(template._key).toBe("my-key");
        expect(template.values.length).toBe(1);
        expect(template.values[0]).toBe("Hello");
    });

    test("no key attribute", () => {
        const template = html`<div>No key here</div>`;
        expect(template._key).toBeUndefined();
    });
});

// Grupo de tests de edge cases
test.describe("Template Edge Cases", () => {
    test("empty template", () => {
        const template = html``;
        expect(template._isTemplate).toBe(true);
        expect(template.values.length).toBe(0);
    });

    test("only interpolation", () => {
        const content = "Just content";
        const template = html`${content}`;
        expect(template.values[0]).toBe("Just content");
    });

    test("special characters", () => {
        const special = "Hello & Welcome <script>alert('test')</script>";
        const template = html`<div>${special}</div>`;
        expect(template.values[0]).toBe(special);
    });
});

// Grupo de tests de tipos de datos
test.describe("Template Data Types", () => {
    test("numeric and boolean values", () => {
        const count = 42;
        const enabled = true;
        const rating = 4.5;
        const disabled = false;
        const template = html`<div>
            Count: ${count} Enabled: ${enabled} Rating: ${rating} Disabled:
            ${disabled}
        </div>`;

        expect(template.values).toEqual([42, true, 4.5, false]);
    });

    test("null and undefined handling", () => {
        const empty = "";
        const nullValue = null;
        const undefinedValue = undefined;
        const template = html`<div>${empty}${nullValue}${undefinedValue}</div>`;

        expect(template.values).toEqual(["", null, undefined]);
    });

    test("function values", () => {
        const clickHandler = () => console.log("clicked");
        const template = html`<button onclick=${clickHandler}>Click</button>`;

        expect(typeof template.values[0]).toBe("function");
        expect(template.values[0]).toBe(clickHandler);
    });
});
