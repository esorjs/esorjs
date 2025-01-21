import { registerEvent } from "../events/events";
import { escapeHTML } from "../utils/parser";

/* Regex y utilidades */
const attrReg = /\s(\w[\w-]*)=(["'])?(?:(?!\2).)*$/;
const refReg = /ref=(["'])?\s*$/;
const evtReg = /(@\w+)=(["'])?\s*$/;
const qReg = /(["'])\s*$/;
const rawTags = /^(script|style|textarea|title)$/i;

function trimQuote(str) {
    const i = str.search(/["']\s*$/);
    return i >= 0 ? str.slice(0, i) : str.slice(0, -1);
}
function getQuote(s) {
    const m = s.match(qReg);
    return m ? m[1] : '"';
}
function safeHTML(val, tag) {
    return rawTags.test(tag) ? String(val) : escapeHTML(val);
}

/** Decide si se inyecta ref, event o ninguno. */
function determineInjection(hStr, val) {
    const refMatch = hStr.match(refReg);
    const evtMatch = hStr.match(evtReg);
    return {
        ref: refMatch && typeof val === "function",
        event: evtMatch && typeof val === "function",
        eventType: evtMatch ? evtMatch[1].slice(1) : null,
    };
}

/** Funciones de inyección de distintos tipos */
function injectRef(fn, hStr, idx, refs) {
    const q = getQuote(hStr);
    const out = hStr.replace(refReg, `data-ref-${idx}=${q}true${q}`);
    refs.set(idx, fn);
    return out;
}
function injectEvent(fn, eventType, hStr) {
    const q = getQuote(hStr);
    const eAttr = `data-event-${eventType}`;
    const id = registerEvent(eventType, fn);
    fn.isEventHandler = true;
    return hStr.replace(evtReg, `${eAttr}=${q}${id}${q}`);
}
function injectSignalAttr(val, aName, hStr, sIdx, signals) {
    hStr = trimQuote(hStr);
    const q = getQuote(hStr);
    const initialVal = typeof val === "function" ? val() : val();
    const escVal = safeHTML(initialVal, aName);
    const bindAttr = `data-bind-${sIdx}`;
    hStr += `${escVal}" ${bindAttr}=${q}true${q}`;
    signals.set(sIdx, {
        type: "attribute",
        signal: val,
        attributeName: aName,
        bindAttr,
    });
    return hStr;
}
function injectExpr(val, isFn, hStr, sIdx, signals) {
    const bA = `data-expr-${sIdx}`;
    const t = isFn ? "expression" : "text";
    const out = isFn ? val() : val;
    signals.set(sIdx, { type: t, signal: val, bindAttr: bA });
    return `${hStr}<!--${bA}-->${escapeHTML(String(out))}<!--//${bA}-->`;
}

/**
 * injectArray: maneja arrays normales y arrays reactivas (signal arrays).
 * Se determinan con `isSigArr` (cuando v.__signalArray === true).
 */
function injectArray(v, sIdx, signals, hStr, isSigArr, fn) {
    const bind = `data-expr-${sIdx}`;
    let out = `<!--${bind}-->`;

    if (isSigArr) {
        // Array Reactiva (v tiene .__signal y .__mapFn)
        const sig = v.__signal;
        const mapFn = v.__mapFn;
        const arrFn = () => {
            const c = sig();
            return !Array.isArray(c) ? [] : mapFn ? c.map(mapFn) : c;
        };
        const initialItems = arrFn();
        if (Array.isArray(initialItems)) {
            for (const item of initialItems) out += processVal(item);
        }
        signals.set(sIdx, { type: "array", signal: arrFn, bindAttr: bind });
    } else {
        // Array normal
        const arr = Array.isArray(v) ? v : [];
        for (const item of arr) {
            out += processVal(html`<div>${item}</div>`);
        }
        signals.set(sIdx, {
            type: "array",
            bindAttr: bind,
            signal: typeof fn === "function" ? fn : () => v,
        });
    }

    return hStr + out + `<!--//${bind}-->`;
}

/**
 * processTemplate: parsea la tagged template y construye:
 * { template: DocumentFragment, signals: Map, refs: Map }
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
            const aName = aMatch?.[1] || null;

            const { ref, event, eventType } = determineInjection(hStr, val);

            if (ref) {
                hStr = injectRef(val, hStr, rIdx++, rMap);
            } else if (event) {
                hStr = injectEvent(val, eventType, hStr);
            } else if ((val?.signal || typeof val === "function") && inAttr) {
                hStr = injectSignalAttr(val, aName, hStr, sIdx++, sMap);
            } else if (isSignalArrayResult(val)) {
                hStr = injectArray(val, sIdx++, sMap, hStr, true);
            } else if (val?.signal) {
                hStr = injectExpr(val, false, hStr, sIdx++, sMap);
            } else if (typeof val === "function") {
                hStr = injectExpr(val, true, hStr, sIdx++, sMap);
            } else if (Array.isArray(val)) {
                hStr = injectArray(val, sIdx++, sMap, hStr, false);
            } else if (val != null) {
                hStr += processVal(val);
            }
        }
    }

    const t = document.createElement("template");
    t.innerHTML = hStr.trim();
    return { template: t.content, signals: sMap, refs: rMap };
}

/** =========================================
 *  API Pública
 * ========================================= */
export function html(strs, ...vals) {
    return processTemplate(strs, ...vals);
}
export function evalExpr(fn) {
    try {
        const r = fn();
        return r || r === 0 || r === "" ? r : null;
    } catch {
        return null;
    }
}
export function isSignalArrayResult(value) {
    return Array.isArray(value) && value.__signalArray === true;
}
export function isTemplateObject(obj) {
    return obj && typeof obj === "object" && obj.template;
}

/** =========================================
 *  Procesa literales / templates
 * ========================================= */
function processVal(v) {
    if (v == null || v === false) return "";
    if (Array.isArray(v)) {
        return v.reduce((acc, x) => acc + processVal(x), "");
    }
    if (isTemplateObject(v)) {
        return [...v.template.childNodes].reduce((acc, n) => {
            if (n.nodeType === 1 && n.hasAttribute("key")) {
                n.setAttribute("data-key", n.getAttribute("key"));
                n.removeAttribute("key");
            }
            return acc + (n.outerHTML || n.textContent);
        }, "");
    }
    if (v?.type === "template-array") {
        return v.templates.reduce((acc, x) => acc + processVal(x), "");
    }
    return escapeHTML(String(v));
}
