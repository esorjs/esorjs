/**
 * Retrieves and caches all style elements and stylesheet links within the document's head.
 *
 * This function selects all <style> elements and <link> elements with a rel attribute
 * of "stylesheet" from the document's head section. It caches the results for future
 * use, ensuring that the query is only executed once and subsequent calls return the
 * cached results.
 *
 * @returns {Array} An array of style and link elements representing the stylesheets
 * in the document's head.
 */
export const s = () =>
    (s.cache ||= [
        ...document.querySelectorAll("head style, head link[rel=stylesheet]"),
    ]);
