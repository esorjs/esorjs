/**
 * Emits a custom event with the given name and detail
 * @param {string} name - name of the event
 * @param {*} detail - detail of the event
 * @param {EventTarget} [target=null] - target of the event
 * @returns {CustomEvent} - the emitted event
 */
export function emit(name, detail, target = null) {
    const event = new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
        cancelable: true,
    });

    target?.dispatchEvent(event);
    return event;
}
