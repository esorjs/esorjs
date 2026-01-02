/**
 * Counter Component - Enhanced SSR API Example
 *
 * This component works identically on server and client!
 */

import { defineComponent, signal, computed } from '../../../src/ssr/enhanced-api.js';
import { html } from '../../../src/template/render.js';

export const Counter = defineComponent((props) => {
    // Signals are automatically tracked for SSR
    const count = signal(props?.initialCount || 0);

    // Computed values are also tracked
    const doubled = computed(() => count() * 2);
    const isEven = computed(() => count() % 2 === 0);

    // Event handlers
    const increment = () => count(count() + 1);
    const decrement = () => count(count() - 1);
    const reset = () => count(0);

    return html`
        <div class="counter">
            <h1>Enhanced SSR Counter</h1>

            <div class="display">
                <p>Count: <strong>${count}</strong></p>
                <p>Doubled: <strong>${doubled}</strong></p>
                <p>Status: <strong>${() => isEven() ? 'Even' : 'Odd'}</strong></p>
            </div>

            <div class="controls">
                <button onclick=${decrement}>− Decrement</button>
                <button onclick=${reset}>↺ Reset</button>
                <button onclick=${increment}>+ Increment</button>
            </div>

            <style>
                .counter {
                    font-family: system-ui, sans-serif;
                    max-width: 400px;
                    margin: 40px auto;
                    padding: 30px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .display {
                    margin: 20px 0;
                    padding: 20px;
                    background: #f5f5f5;
                    border-radius: 4px;
                }
                .display p {
                    margin: 10px 0;
                    font-size: 18px;
                }
                .display strong {
                    color: #0066cc;
                    font-size: 24px;
                }
                .controls {
                    display: flex;
                    gap: 10px;
                }
                .controls button {
                    flex: 1;
                    padding: 12px;
                    font-size: 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    background: #0066cc;
                    color: white;
                    transition: background 0.2s;
                }
                .controls button:hover {
                    background: #0052a3;
                }
                .controls button:active {
                    transform: scale(0.98);
                }
            </style>
        </div>
    `;
});
