/**
 * Creates a mutable reference to a value.
 *
 * @param {any} [initialValue=null] - The initial value for the reference.
 * @returns {Function} A getter/setter function for the reference value.
 */
export function ref(initialValue = null) {
    let current = initialValue;
    // Bolt ⚡: Using `function()` and `arguments` instead of `(...args) =>` avoids array allocation overhead
    return function() { return arguments.length === 0 ? current : (current = arguments[0]); };
}
