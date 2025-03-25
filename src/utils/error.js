/**
 * Handles errors centrally with context
 * @param {string} context - Context of error (module or function)
 * @param {Error|string} error - Error or message
 * @param {string} [level=“error”] - Log level (error, warn, info)
 * @returns {Error} Error processed for possible additional handling
 */
export function handleError(context, error, level = "error") {
    const method = level === "warn" ? console.warn : console.error;
    const errorObj = error instanceof Error ? error : new Error(String(error));
    method(`[Esor Framework Error] ${context}:`, errorObj.message);

    return errorObj; // Allows chaining
}

/**
 * Executes code with built-in error handling
 * @param {Function} fn - Function to execute
 * @param {string} context - Context for error messages
 * @param {any} [fallback] - Default value if error occurs
 * @returns {any} Result of function or fallback
 */
export function tryCatch(fn, context, fallback) {
    try {
        return fn();
    } catch (error) {
        handleError(context, error);
        return fallback;
    }
}
