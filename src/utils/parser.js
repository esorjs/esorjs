/**
 * Sanitizes text strings to prevent HTML injection
 * @param {any} value - Value to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeHtml = (value) =>
    value == null
        ? ""
        : String(value).replace(
              /[&<>'"]/g,
              (c) =>
                  ({
                      "&": "&amp;",
                      "<": "&lt;",
                      ">": "&gt;",
                      "'": "&#39;",
                      '"': "&quot;",
                  }[c])
          );
