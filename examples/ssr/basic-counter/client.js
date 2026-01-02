/**
 * Basic Counter Example - Client Side
 *
 * This script hydrates the server-rendered counter and adds interactivity.
 */

import { signal } from '../../../src/hooks/reactivity.js';
import { hydrate } from '../../../src/ssr/hydrate.js';

// Recreate the count signal (will be initialized from SSR state)
const count = signal(0);

// Hydrate the server-rendered content
hydrate('#app', {
    signals: {
        s0: count  // s0 is the first signal in the template
    }
});

// Add event handlers for the buttons
document.querySelector('[data-action="increment"]')?.addEventListener('click', () => {
    count(count() + 1);
});

document.querySelector('[data-action="decrement"]')?.addEventListener('click', () => {
    count(count() - 1);
});

document.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    count(0);
});

console.log('Counter hydrated! Initial count:', count());
