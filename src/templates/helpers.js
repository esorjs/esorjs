const exprCache = new WeakMap();

/**
 * Evalúa la expresión fn() con simple cache interno para no recalcular
 * en cada render (opcional). Retorna null si ocurre error o si fn() retorna undefined.
 */
export function evalExpr(fn) {
    if (exprCache.has(fn)) return exprCache.get(fn);

    try {
        const result = fn() ?? null;
        exprCache.set(fn, result);
        return result;
    } catch {
        return null;
    }
}

export const collectNodes = (start, end) => {
    const nodes = [];
    for (
        let curr = start.nextSibling;
        curr && curr !== end;
        curr = curr.nextSibling
    )
        nodes.push(curr);

    return nodes;
};

export const specialAttr = (n) =>
    n && !/^(data_esor_|@|ref|key$)/.test(n) && /^[a-z][\w\-_:]*$/i.test(n);
