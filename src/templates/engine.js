/**
 * templates/engine.js
 *
 * Este módulo procesa los template literals para generar templates DOM,
 * inyectar señales, referencias y eventos de forma dinámica.
 */

import { registerEvent } from "../events/events";
import { escapeHTML } from "../utils/parser";

// Expresiones regulares para detectar atributos, referencias, eventos y comillas.
const attrReg = /\s(\w[\w-]*)=(["'])?(?:(?!\2).)*$/;
const refReg = /ref=(["'])?\s*$/;
const evtReg = /(@\w+)=(["'])?\s*$/;
const qReg = /(["'])\s*$/;
const rawTags = /^(script|style|textarea|title)$/i;

/**
 * getSafeQuote: Obtiene la comilla de cierre usada en el string o retorna "'" por defecto.
 * @param {string} str
 * @returns {string}
 */
const getSafeQuote = (str) =>
    str && str.charAt(str.length - 1) === '"' ? '"' : "'";

/**
 * trimQuote: Elimina la comilla de cierre sobrante del string.
 * @param {string} s
 * @returns {string}
 */
const trimQuote = (s) => s.replace(qReg, "");

/**
 * isTemplateObject: Verifica si el objeto tiene una propiedad "template".
 * @param {any} o
 * @returns {boolean}
 */
export const isTemplateObject = (o) => o && typeof o === "object" && o.template;

/**
 * injectRef: Inyecta un "ref" en el string HTML, reemplazando el atributo ref.
 * @param {Function} fn - Función de referencia.
 * @param {string} hStr - String HTML en construcción.
 * @param {number} i - Índice para la referencia.
 * @param {Map} refs - Mapa donde se almacenan las referencias.
 * @returns {string} HTML modificado.
 */
function injectRef(fn, hStr, i, refs) {
    const q = getSafeQuote(hStr);
    refs.set(i, fn);
    return hStr.replace(refReg, `data-ref-${i}=${q}true${q}`);
}

/**
 * injectEvent: Inyecta un manejador de evento en el string HTML.
 * @param {Function} fn - Manejador de evento.
 * @param {string} eType - Tipo de evento (sin el "@").
 * @param {string} hStr - String HTML en construcción.
 * @returns {string} HTML modificado.
 */
function injectEvent(fn, eType, hStr) {
    const q = getSafeQuote(hStr);
    const id = registerEvent(eType, fn);
    fn.isEventHandler = true;
    return hStr.replace(evtReg, `data-event-${eType}=${q}${id}${q}`);
}

/**
 * injectSignalAttr: Inyecta una señal en un atributo HTML.
 * Cierra el atributo original y agrega un atributo de enlace.
 * @param {any} val - Valor o función señal.
 * @param {string} aName - Nombre del atributo.
 * @param {string} hStr - String HTML en construcción.
 * @param {number} sIdx - Índice de la señal.
 * @param {Map} signals - Mapa para almacenar las señales.
 * @returns {string} HTML modificado.
 */
function injectSignalAttr(val, aName, hStr, sIdx, signals) {
    hStr = trimQuote(hStr);
    const q = getSafeQuote(hStr) || '"';
    const initVal = typeof val === "function" ? val() : val;
    const escVal = rawTags.test(aName) ? String(initVal) : escapeHTML(initVal);
    const bindAttr = `data-bind-${sIdx}`;
    // Se cierra el atributo original con su valor y se inyecta el atributo de enlace.
    hStr += `${q}${escVal}${q} ${bindAttr}=${q}true${q}`;
    signals.set(sIdx, {
        type: "attribute",
        signal: val,
        attributeName: aName,
        bindAttr,
    });
    return hStr;
}

/**
 * injectExpr: Inyecta una expresión (o función) en el template.
 * Utiliza comentarios como placeholders para la señal.
 * @param {any} val - Valor o función.
 * @param {boolean} isFn - Indica si es una función.
 * @param {string} hStr - String HTML en construcción.
 * @param {number} sIdx - Índice de la señal.
 * @param {Map} signals - Mapa de señales.
 * @returns {string} HTML modificado.
 */
function injectExpr(val, isFn, hStr, sIdx, signals) {
    const bA = `data-expr-${sIdx}`;
    signals.set(sIdx, {
        type: isFn ? "expression" : "text",
        signal: val,
        bindAttr: bA,
    });
    const out = isFn ? val() : val;
    return `${hStr}<!--${bA}-->${escapeHTML(String(out))}<!--//${bA}-->`;
}

/**
 * injectArray: Inyecta una array o template-array en el template.
 * @param {any} v - Valor a inyectar (se espera array o similar).
 * @param {number} sIdx - Índice de la señal.
 * @param {Map} signals - Mapa de señales.
 * @param {string} hStr - String HTML en construcción.
 * @param {boolean} isSigArr - Indica si es una señal de array.
 * @param {Function} [fn] - Función en caso de no ser señal de array.
 * @returns {string} HTML modificado.
 */
function injectArray(v, sIdx, signals, hStr, isSigArr, fn) {
    const bind = `data-expr-${sIdx}`;
    const signalEntry = {
        type: "array",
        signal: isSigArr
            ? () => (v.__signal() || []).map(v.__mapFn || ((x) => x))
            : typeof fn === "function"
            ? fn
            : () => v,
        bindAttr: bind,
    };
    signals.set(sIdx, signalEntry);
    const items = Array.isArray(v) ? v : [];
    const out = items.map(processVal).join("");
    return `${hStr}<!--${bind}-->${out}<!--//${bind}-->`;
}

/**
 * processVal: Procesa un valor para ser inyectado en el template.
 * Soporta SVG, arrays, templates y valores primitivos.
 * @param {any} v
 * @returns {string}
 */
function processVal(v) {
    if (v instanceof SVGElement) {
        const svgContainer = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
        svgContainer.appendChild(v.cloneNode(true));
        return svgContainer.innerHTML;
    }
    if (v == null || v === false) return "";
    if (Array.isArray(v)) return v.reduce((acc, x) => acc + processVal(x), "");
    if (isTemplateObject(v))
        return [...v.template.childNodes].reduce((acc, n) => {
            if (n.nodeType === 1 && n.hasAttribute("key")) {
                n.setAttribute("data-key", n.getAttribute("key"));
                n.removeAttribute("key");
            }
            return acc + (n.outerHTML || n.textContent);
        }, "");
    if (v?.type === "template-array")
        return v.templates.reduce((a, x) => a + processVal(x), "");
    return escapeHTML(String(v));
}

/**
 * processTemplate: Procesa un template literal y sus valores para construir:
 *  - El contenido del template (template).
 *  - Un mapa de señales (signals).
 *  - Un mapa de referencias (refs).
 * @param {Array<string>} strs
 * @param  {...any} vals
 * @returns {Object} { template, signals, refs }
 */
function processTemplate(strs, ...vals) {
    let hStr = "",
        sMap = new Map(),
        rMap = new Map();
    let sIdx = 0,
        rIdx = 0;
    for (let i = 0; i < strs.length; i++) {
        hStr += strs[i];
        if (i < vals.length) {
            const val = vals[i];
            const aMatch = strs[i].match(attrReg);
            const inAttr = !!aMatch;
            const aName = aMatch?.[1];
            const refMatch = hStr.match(refReg),
                evtMatch = hStr.match(evtReg),
                isRef = refMatch && typeof val === "function",
                isEvt = evtMatch && typeof val === "function",
                evtType = evtMatch ? evtMatch[1].slice(1) : null;
            if (isRef) {
                hStr = injectRef(val, hStr, rIdx++, rMap);
            } else if (isEvt) {
                hStr = injectEvent(val, evtType, hStr);
            } else if ((val?.signal || typeof val === "function") && inAttr) {
                hStr = injectSignalAttr(val, aName, hStr, sIdx++, sMap);
            } else if (Array.isArray(val) && val.__signalArray === true) {
                hStr = injectArray(val, sIdx++, sMap, hStr, true);
            } else if (val?.signal) {
                hStr = injectExpr(val, false, hStr, sIdx++, sMap);
            } else if (typeof val === "function") {
                hStr = injectExpr(val, true, hStr, sIdx++, sMap);
            } else if (Array.isArray(val)) {
                hStr = injectArray(val, sIdx++, sMap, hStr, false, val);
            } else if (val != null) {
                hStr += processVal(val);
            }
        }
    }
    const t = document.createElement("template");
    t.innerHTML = hStr.trim();
    return { template: t.content, signals: sMap, refs: rMap };
}

/**
 * evalExpr: Evalúa una función y retorna su resultado o null en caso de error.
 * @param {Function} fn
 * @returns {any}
 */
export function evalExpr(fn) {
    try {
        return fn() ?? null;
    } catch {
        return null;
    }
}

/**
 * html: Función principal para crear templates a partir de template literals.
 * Retorna un objeto con las propiedades: { template, signals, refs }.
 * @param {Array<string>} strs
 * @param  {...any} vals
 * @returns {Object}
 */
export function html(strs, ...vals) {
    return processTemplate(strs, ...vals);
}
