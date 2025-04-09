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
    method(`[Esor Error] ${context}:`, errorObj.message);

    return errorObj; // Allows chaining
}
