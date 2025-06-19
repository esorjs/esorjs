/**
 * Creates a mutable reference to a value.
 *
 * @param {any} [initialValue=null] - The initial value for the reference.
 * @returns {Function} A getter/setter function for the reference value.
 */
export function ref(initialValue = null) {
    let current = initialValue;
    return (...v) => (v.length === 0 ? current : (current = v[0]));
}
