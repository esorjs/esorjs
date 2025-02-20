import {
    getDocumentFragment,
    removeChildNodesBetween,
    findCommentPlaceholders,
} from "../utils/dom";
import { bindSignalToElement } from "../dom-bindings";

/**
 * Cache global para las plantillas
 */
const cacheTemplate = new Map();

/**
 * Devuelve una copia de la plantilla cacheada. Si no está en cache,
 * la clona y la guarda en cache.
 */
export function cachedTemplate(key, fragmentOrTemplate) {
    const content = getDocumentFragment(fragmentOrTemplate);
    if (!cacheTemplate.has(key))
        cacheTemplate.set(key, content.cloneNode(true));

    return cacheTemplate.get(key).cloneNode(true);
}

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

/**
 * Inserta o actualiza un texto entre dos comentarios "placeholder"
 * (start y end). Si ya existe un nodo de texto, actualiza su contenido;
 * si no, limpia y lo vuelve a insertar.
 */
export function renderEvaluated(host, start, end, val) {
    let current = start.nextSibling;
    if (current && current.nodeType === Node.TEXT_NODE) {
        current.textContent = String(val);
    } else {
        removeChildNodesBetween(start, end);
        const textNode = document.createTextNode(String(val));
        end.parentNode.insertBefore(textNode, end);
    }
}

/**
 * Conecta una signal con un "placeholder" en el DOM:
 * cuando la signal cambie, se llama a renderer(startNode, endNode, newVal).
 */
export function bindPlaceholderSignal(host, { signal, bindAttr, renderer }) {
    const [startNode, endNode] = findCommentPlaceholders(
        host.shadowRoot,
        bindAttr
    );
    if (!startNode || !endNode) return;

    bindSignalToElement(host, signal, (newVal) => {
        renderer(startNode, endNode, newVal);
    });
}

/**
 * Dado un host (componente), un tipo ("expression" | "text"), una signal
 * y un atributo de placeholder (bindAttr), configura la reacción al cambio
 * de la signal e invoca renderEvaluated() cuando cambie.
 */
export function handleSignalBinding({ host, type, signal, bindAttr }) {
    bindPlaceholderSignal(host, {
        signal,
        bindAttr,
        renderer: (start, end, val) => {
            const evaluated = type === "expression" ? evalExpr(() => val) : val;
            if (evaluated != null) {
                renderEvaluated(host, start, end, evaluated);
            }
        },
    });
}

export const specialAttr = (n) =>
    n && !/^(data_esor_|@|ref|key$)/.test(n) && /^[a-z][\w\-_:]*$/i.test(n);
