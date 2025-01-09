
export const escapeHTML = (value) =>
    value.toString().replace(
        /[&<>'"]/g,
        (match) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;",
                "/": "&#x2F;",
            }[match])
    );

export function cleanAttributeValue(value) {
    return String(value)
        .replace(/^["']|["']$/g, "")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
