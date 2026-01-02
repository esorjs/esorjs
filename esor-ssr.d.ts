/**
 * Type definitions for Esor SSR
 *
 * Server-side rendering and hydration types for Esor framework
 */

// Re-export core types
export { Signal, Effect, Computed } from './esor';

/**
 * Template object for SSR
 */
export interface SSRTemplate {
    strings: TemplateStringsArray;
    values: any[];
    _isTemplate: true;
    _key?: string | number;
    _isSSR: true;
}

/**
 * Result of renderToString
 */
export interface RenderResult {
    html: string;
    state: Record<string, any>;
}

/**
 * Options for renderToHTML
 */
export interface RenderToHTMLOptions {
    title?: string;
    lang?: string;
    head?: string;
    bodyAttrs?: string;
}

/**
 * Hydration options
 */
export interface HydrateOptions {
    signals?: Record<string, any>;
    handlers?: Record<string, Function>;
    state?: Record<string, any>;
}

// Server-side rendering
/**
 * Creates a template for SSR
 */
export function html(strings: TemplateStringsArray, ...values: any[]): SSRTemplate;

/**
 * Renders a template to HTML string with state
 */
export function renderToString(template: SSRTemplate): RenderResult;

/**
 * Renders a complete HTML document
 */
export function renderToHTML(template: SSRTemplate, options?: RenderToHTMLOptions): string;

/**
 * Renders to a ReadableStream (for streaming responses)
 */
export function renderToStream(template: SSRTemplate): ReadableStream;

// State serialization
/**
 * Creates a script tag with serialized state
 */
export function createStateScript(state: Record<string, any>): string;

/**
 * Injects state script into HTML
 */
export function injectState(
    html: string,
    state: Record<string, any>,
    position?: 'head' | 'body'
): string;

/**
 * Serializes a value to JSON string
 */
export function serializeValue(value: any): string;

/**
 * Deserializes a value from JSON
 */
export function deserializeValue(value: any): any;

// Client-side hydration
/**
 * Hydrates server-rendered content
 */
export function hydrate(
    target: HTMLElement | string,
    options?: HydrateOptions
): void;

/**
 * Creates a hydration-aware component
 */
export function createHydratableComponent(setupFn: Function): Function;

/**
 * Checks if page contains SSR content
 */
export function isSSRContent(): boolean;

// Re-export reactivity primitives
export function signal<T>(initialValue: T): Signal<T>;
export function effect(fn: () => void): Effect;
export function computed<T>(fn: () => T): Computed<T>;
export function batch<T>(fn: () => T): T;
export function flushSync<T>(fn: () => T): T;

// Signal type
export interface Signal<T> {
    (): T;
    (value: T): T;
    _isSignal: true;
}

// Effect type
export interface Effect {
    (): void;
}

// Computed type
export interface Computed<T> extends Signal<T> {
    (): T;
}
