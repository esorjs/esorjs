export const escapeHTML = (value) => {
    if (value === undefined || value === null) return "";
    return value.toString().replace(
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
};

export function cleanAttributeValue(value) {
    if (value === undefined || value === null) return "";
    return String(value)
        .replace(/^["']|["']$/g, "")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
