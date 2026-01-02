/**
 * SSR Build Entry Point
 *
 * This file exports all SSR-related functionality for server-side rendering.
 * Use this in Node.js environments.
 */

export { html, renderToString, renderToHTML, renderToStream } from '../src/ssr/index.js';
export { createStateScript, injectState, serializeValue, deserializeValue } from '../src/ssr/serialize.js';
export { hydrate, createHydratableComponent, isSSRContent } from '../src/ssr/hydrate.js';

// Re-export core reactivity for convenience
export { signal, effect, computed, batch, flushSync } from '../src/hooks/reactivity.js';
