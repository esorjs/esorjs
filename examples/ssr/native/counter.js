/**
 * Counter Component - Native SSR Example
 *
 * This demonstrates the native SSR approach using Declarative Shadow DOM.
 * Works identically on server and client!
 */

import { component, html, signal, computed } from '../../../src/index.js';

export default component('native-counter', function(props) {
    // Check if this is SSR (shadow root already exists)
    const isSSR = this.isSSR?.() || false;
    const state = this.getSSRState?.() || {};

    // Create signals (restored from SSR state if available)
    const count = signal(state.count !== undefined ? state.count : (props?.initialCount || 0));
    const step = signal(state.step || 1);

    // Computed values
    const doubled = computed(() => count() * 2);
    const isEven = computed(() => count() % 2 === 0);

    // Event handlers
    const increment = () => count(count() + step());
    const decrement = () => count(count() - step());
    const reset = () => count(0);

    // If SSR, just bind signals and handlers
    if (isSSR) {
        // Bind signals to SSR-rendered elements
        this.bindAllSignals?.({
            count,
            doubled,
            isEven: isEven, // Computed values work too!
            step
        });

        // Bind event handlers
        this.bindAllHandlers?.({
            click: (e) => {
                const action = e.target.dataset.action;
                if (action === 'increment') increment();
                else if (action === 'decrement') decrement();
                else if (action === 'reset') reset();
            },
            input: (e) => {
                if (e.target.dataset.bind === 'step') {
                    step(parseInt(e.target.value) || 1);
                }
            }
        });

        return; // Already rendered by SSR!
    }

    // Client-side render (no SSR)
    return html`
        <div class="native-counter">
            <h1>Native SSR Counter</h1>

            <div class="display">
                <p class="count">Count: <strong>${count}</strong></p>
                <p class="doubled">Doubled: <strong>${doubled}</strong></p>
                <p class="status">
                    Status: <strong>${() => isEven() ? '✓ Even' : '○ Odd'}</strong>
                </p>
            </div>

            <div class="controls">
                <button onclick=${decrement}>− Decrement</button>
                <button onclick=${reset}>↺ Reset</button>
                <button onclick=${increment}>+ Increment</button>
            </div>

            <div class="settings">
                <label>
                    Step:
                    <input
                        type="number"
                        value=${step}
                        oninput=${(e) => step(parseInt(e.target.value) || 1)}
                        min="1"
                        max="10"
                    />
                </label>
            </div>

            <style>
                .native-counter {
                    font-family: system-ui, -apple-system, sans-serif;
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 30px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                }

                h1 {
                    margin: 0 0 20px;
                    color: #333;
                    font-size: 24px;
                    text-align: center;
                }

                .display {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }

                .display p {
                    margin: 10px 0;
                    color: white;
                    font-size: 16px;
                }

                .display strong {
                    font-size: 28px;
                    font-weight: 700;
                }

                .controls {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                button {
                    padding: 12px 20px;
                    font-size: 16px;
                    font-weight: 600;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    background: #667eea;
                    color: white;
                    transition: all 0.2s;
                }

                button:hover {
                    background: #5568d3;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
                }

                button:active {
                    transform: translateY(0);
                }

                .settings {
                    text-align: center;
                }

                .settings label {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    color: #666;
                }

                .settings input {
                    width: 60px;
                    padding: 6px 10px;
                    border: 2px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    text-align: center;
                }

                .settings input:focus {
                    outline: none;
                    border-color: #667eea;
                }
            </style>
        </div>
    `;
});
