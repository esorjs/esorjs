/**
 * SSR Tests for Esor
 *
 * Tests for server-side rendering and hydration functionality
 */

import { test, expect } from '@playwright/test';
import { html, renderToString } from '../src/ssr/render.js';
import { signal, computed } from '../src/hooks/reactivity.js';
import {
    serializeValue,
    deserializeValue,
    createStateScript,
    injectState
} from '../src/ssr/serialize.js';

// Test Group: Template Rendering
test.describe('SSR Template Rendering', () => {
    test('should render static template', () => {
        const template = html`<div>Hello World</div>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('Hello World');
        expect(result).toContain('<div>');
        expect(result).toContain('</div>');
    });

    test('should render template with text values', () => {
        const name = 'John';
        const template = html`<div>Hello, ${name}!</div>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('Hello, John!');
    });

    test('should render template with signal', () => {
        const count = signal(42);
        const template = html`<div>Count: ${count}</div>`;
        const { html: result, state } = renderToString(template);

        expect(result).toContain('Count:');
        expect(result).toContain('42');
        expect(state).toBeDefined();
        expect(Object.keys(state).length).toBeGreaterThan(0);
    });

    test('should render template with computed', () => {
        const count = signal(5);
        const doubled = computed(() => count() * 2);
        const template = html`<div>Doubled: ${doubled}</div>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('Doubled:');
        expect(result).toContain('10');
    });

    test('should render template with attributes', () => {
        const id = 'test-id';
        const className = 'test-class';
        const template = html`<div id=${id} class=${className}>Content</div>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('id="test-id"');
        expect(result).toContain('class="test-class"');
    });

    test('should render template with signal attribute', () => {
        const isActive = signal(true);
        const template = html`<div data-active=${isActive}>Content</div>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('data-active');
        expect(result).toContain('data-esor-signal');
    });

    test('should escape HTML in values', () => {
        const malicious = '<script>alert("xss")</script>';
        const template = html`<div>${malicious}</div>`;
        const { html: result } = renderToString(template);

        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;script&gt;');
    });

    test('should render nested templates', () => {
        const inner = html`<span>Inner</span>`;
        const outer = html`<div>${inner}</div>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('<div>');
        expect(result).toContain('<span>Inner</span>');
        expect(result).toContain('</div>');
    });

    test('should render array of values', () => {
        const items = ['Item 1', 'Item 2', 'Item 3'];
        const template = html`
            <ul>
                ${items.map(item => html`<li>${item}</li>`)}
            </ul>
        `;
        const { html: result } = renderToString(template);

        expect(result).toContain('<ul>');
        expect(result).toContain('<li>Item 1</li>');
        expect(result).toContain('<li>Item 2</li>');
        expect(result).toContain('<li>Item 3</li>');
        expect(result).toContain('</ul>');
    });

    test('should handle null and undefined values', () => {
        const template = html`<div>${null} ${undefined} ${false}</div>`;
        const { html: result } = renderToString(template);

        expect(result).toBe('<div>  </div>');
    });

    test('should handle boolean attributes', () => {
        const disabled = true;
        const checked = false;
        const template = html`<input disabled=${disabled} checked=${checked}>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('disabled');
        expect(result).not.toContain('checked');
    });
});

// Test Group: State Serialization
test.describe('SSR State Serialization', () => {
    test('should serialize primitive values', () => {
        const state = {
            string: 'hello',
            number: 42,
            boolean: true,
            null: null
        };

        const serialized = serializeValue(state);
        expect(serialized).toContain('"hello"');
        expect(serialized).toContain('42');
        expect(serialized).toContain('true');
        expect(serialized).toContain('null');
    });

    test('should serialize arrays', () => {
        const arr = [1, 2, 3];
        const serialized = serializeValue(arr);

        expect(serialized).toBe('[1,2,3]');
    });

    test('should serialize nested objects', () => {
        const obj = {
            nested: {
                value: 'test'
            }
        };

        const serialized = serializeValue(obj);
        expect(serialized).toContain('"nested"');
        expect(serialized).toContain('"value"');
        expect(serialized).toContain('"test"');
    });

    test('should deserialize values correctly', () => {
        const original = {
            string: 'hello',
            number: 42,
            boolean: true,
            array: [1, 2, 3]
        };

        const deserialized = deserializeValue(original);
        expect(deserialized).toEqual(original);
    });

    test('should create state script tag', () => {
        const state = { count: 42 };
        const script = createStateScript(state);

        expect(script).toContain('<script');
        expect(script).toContain('id="__ESOR_STATE__"');
        expect(script).toContain('type="application/json"');
        expect(script).toContain('42');
        expect(script).toContain('</script>');
    });

    test('should inject state into HTML body', () => {
        const html = '<html><body><div>Content</div></body></html>';
        const state = { test: 'value' };
        const result = injectState(html, state, 'body');

        expect(result).toContain('<script id="__ESOR_STATE__"');
        expect(result).toContain('"test"');
        expect(result).toContain('"value"');
        expect(result.indexOf('</body>')).toBeGreaterThan(result.indexOf('__ESOR_STATE__'));
    });

    test('should inject state into HTML head', () => {
        const html = '<html><head></head><body></body></html>';
        const state = { test: 'value' };
        const result = injectState(html, state, 'head');

        expect(result).toContain('<script id="__ESOR_STATE__"');
        expect(result.indexOf('</head>')).toBeGreaterThan(result.indexOf('__ESOR_STATE__'));
    });
});

// Test Group: Signal Tracking
test.describe('SSR Signal Tracking', () => {
    test('should track single signal', () => {
        const count = signal(10);
        const template = html`<div>${count}</div>`;
        const { state } = renderToString(template);

        expect(Object.keys(state).length).toBe(1);
        expect(Object.values(state)[0]).toBe(10);
    });

    test('should track multiple signals', () => {
        const name = signal('Alice');
        const age = signal(25);
        const template = html`<div>${name} is ${age} years old</div>`;
        const { state } = renderToString(template);

        expect(Object.keys(state).length).toBe(2);
        expect(Object.values(state)).toContain('Alice');
        expect(Object.values(state)).toContain(25);
    });

    test('should track signals in attributes', () => {
        const isActive = signal(true);
        const count = signal(5);
        const template = html`<div data-active=${isActive} data-count=${count}>Test</div>`;
        const { state } = renderToString(template);

        expect(Object.keys(state).length).toBe(2);
        expect(Object.values(state)).toContain(true);
        expect(Object.values(state)).toContain(5);
    });

    test('should assign unique IDs to signals', () => {
        const s1 = signal(1);
        const s2 = signal(2);
        const template = html`<div>${s1} ${s2}</div>`;
        const { state } = renderToString(template);

        const keys = Object.keys(state);
        expect(keys.length).toBe(2);
        expect(keys[0]).toMatch(/^s\d+$/);
        expect(keys[1]).toMatch(/^s\d+$/);
        expect(keys[0]).not.toBe(keys[1]);
    });
});

// Test Group: Special Cases
test.describe('SSR Special Cases', () => {
    test('should handle style objects', () => {
        const styles = { color: 'red', fontSize: '16px' };
        const template = html`<div style=${styles}>Styled</div>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('style=');
        expect(result).toContain('color:red');
        expect(result).toContain('font-size:16px');
    });

    test('should mark event handlers', () => {
        const handleClick = () => {};
        const template = html`<button onclick=${handleClick}>Click</button>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('data-esor-handler="click"');
    });

    test('should skip ref attributes', () => {
        const myRef = { current: null };
        const template = html`<div ref=${myRef}>Content</div>`;
        const { html: result } = renderToString(template);

        expect(result).not.toContain('ref=');
    });

    test('should handle functions as values', () => {
        const getValue = () => 'Dynamic Value';
        const template = html`<div>${getValue}</div>`;
        const { html: result } = renderToString(template);

        expect(result).toContain('Dynamic Value');
    });

    test('should render empty template', () => {
        const template = html``;
        const { html: result } = renderToString(template);

        expect(result).toBe('');
    });
});

test.describe('SSR Integration', () => {
    test('should render complete component', () => {
        const count = signal(0);
        const name = signal('Test User');
        const greeting = computed(() => `Hello, ${name()}!`);

        const template = html`
            <div class="app">
                <h1>${greeting}</h1>
                <p>Count: ${count}</p>
                <button>Increment</button>
            </div>
        `;

        const { html: result, state } = renderToString(template);

        expect(result).toContain('class="app"');
        expect(result).toContain('<h1>');
        expect(result).toContain('Hello, Test User!');
        expect(result).toContain('Count:');
        expect(result).toContain('0');
        expect(result).toContain('<button>');

        expect(Object.keys(state).length).toBeGreaterThan(0);
    });
});
