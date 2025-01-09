export function coerceAttrValue(rawValue) {
    if (typeof rawValue !== "string") return rawValue;

    const trimmed = rawValue.trim();
    const lower = trimmed.toLowerCase();

    switch (lower) {
        case "true":
            return true;
        case "false":
            return false;
        case "null":
            return null;
        case "undefined":
            return undefined;
        case "nan":
            return NaN;
        case "infinity":
            return Infinity;
        case "-infinity":
            return -Infinity;
    }

    const number = Number(trimmed);
    if (!Number.isNaN(number)) return number;
    try {
        return JSON.parse(trimmed);
    } catch {
        return trimmed;
    }
}
