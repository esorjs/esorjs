import { registerEvent } from "../events.js";
import { escapeHTML } from "../utils/parser.js";

/** Regex */
const attrReg = /\s(\w[\w-]*)=(["'])?(?:(?!\2).)*$/;
const refReg = /ref=(["'])?\s*$/;
const evtReg = /(@\w+)=(["'])?\s*$/;
const qReg = /(["'])\s*$/;
const rawTags = /^(script|style|textarea|title)$/i;

/** If there is a quotation mark at the end, it removes it, otherwise it removes the last character. */
function trimQuote(str) {
    const i = str.search(/["']\s*$/);
    return i >= 0 ? str.slice(0, i) : str.slice(0, -1);
}
/** Find quotation marks or use ” */
function getQuote(s) {
    const m = s.match(qReg);
    return m ? m[1] : '"';
}
/** We do not escape if it is a raw tag */
function safeHTML(val, tag) {
    return rawTags.test(tag) ? String(val) : escapeHTML(val);
}

/** Injection ref */
function injectRef(fn, hStr, idx, refs) {
    const q = getQuote(hStr);
    const out = hStr.replace(refReg, `data-ref-${idx}=${q}true${q}`);
    refs.set(idx, fn);
    return out;
}

/** Injection event */
function injectEvent(fn, eType, hStr) {
    const q = getQuote(hStr),
        eAttr = `data-event-${eType}`,
        id = registerEvent(eType, fn);
    fn.isEventHandler = true;
    return hStr.replace(evtReg, `${eAttr}=${q}${id}${q}`);
}

/** Signal injection in attribute */
function injectSignalAttr(val, aName, hStr, sIdx, signals) {
    hStr = trimQuote(hStr);
    const q = getQuote(hStr),
        ini = typeof val === "function" ? val() : val(),
        esc = safeHTML(ini, aName),
        bA = `data-bind-${sIdx}`;

    hStr += `${esc}" ${bA}=${q}true${q}`;
    signals.set(sIdx, {
        type: "attribute",
        signal: val,
        attributeName: aName,
        bindAttr: bA,
    });
    return hStr;
}

/** Text/expression injection => <!-- data-expr-n --> */
function injectExpr(val, isFn, hStr, sIdx, signals) {
    const bA = `data-expr-${sIdx}`;
    const t = isFn ? "expression" : "text";
    const out = isFn ? val() : val;
    signals.set(sIdx, { type: t, signal: val, bindAttr: bA });
    return `${hStr}<!--${bA}-->${escapeHTML(String(out))}<!--//${bA}-->`;
}

/** Array injection => <!-- data-expr-n --> */
function injectArray(v, sIdx, signals, hStr, isSigArr, fn) {
    const b = `data-expr-${sIdx}`;
    let out = `<!--${b}-->`;
    if (isSigArr) {
        const r = handleSignalArray(v, b);
        out += r.htmlString;
        if (r.signal) signals.set(sIdx, r.signal);
    } else {
        const arr = Array.isArray(v) ? v : [];
        for (const item of arr) out += processVal(html`<div>${item}</div>`);
        signals.set(sIdx, {
            type: "array",
            bindAttr: b,
            signal: typeof fn === "function" ? fn : () => v,
        });
    }
    return hStr + out + `<!--//${b}-->`;
}

function processTemplate(strs, ...vals) {
    let hStr = "",
        sMap = new Map(),
        rMap = new Map();
    let sIdx = 0,
        rIdx = 0;

    for (let i = 0; i < strs.length; i++) {
        hStr += strs[i];
        if (i < vals.length) {
            const val = vals[i],
                aMatch = strs[i].match(attrReg),
                inAttr = !!aMatch,
                aName = aMatch?.[1] || null,
                refMatch = hStr.match(refReg),
                evtMatch = hStr.match(evtReg);

            if (refMatch && typeof val === "function") {
                hStr = injectRef(val, hStr, rIdx, rMap);
                rIdx++;
            } else if (evtMatch && typeof val === "function") {
                hStr = injectEvent(val, evtMatch[1].slice(1), hStr);
            } else if ((val?.signal || typeof val === "function") && inAttr) {
                hStr = injectSignalAttr(val, aName, hStr, sIdx, sMap);
                sIdx++;
            } else if (isSignalArrayResult(val)) {
                hStr = injectArray(val, sIdx++, sMap, hStr, true);
            } else if (val?.signal) {
                hStr = injectExpr(val, false, hStr, sIdx, sMap);
                sIdx++;
            } else if (typeof val === "function") {
                hStr = injectExpr(val, true, hStr, sIdx, sMap);
                sIdx++;
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
 *            MAIN FUNCTION
 * ========================================= */
export function html(strs, ...vals) {
    return processTemplate(strs, ...vals);
}

/** =========================================
 *  Signal Array Management
 * ========================================= */
function handleSignalArray(v, bA) {
    const sig = v.__signal,
        mapFn = v.__mapFn;
    const arrFn = () => {
        const c = sig();
        return !Array.isArray(c) ? [] : mapFn ? c.map(mapFn) : c;
    };
    let hs = `<!--${bA}-->`;
    const init = arrFn();
    if (Array.isArray(init)) for (const i of init) hs += processVal(i);
    hs += `<!--//${bA}-->`;
    return {
        htmlString: hs,
        signal: { type: "array", signal: arrFn, bindAttr: bA },
    };
}

/** =========================================
 *  Processing literals / templates
 * ========================================= */
function processVal(v) {
    if (v == null || v === false) return "";
    if (Array.isArray(v)) return v.reduce((a, x) => a + processVal(x), "");
    if (isTemplateObject(v)) {
        return [...v.template.childNodes].reduce((a, n) => {
            if (n.nodeType === 1 && n.hasAttribute("key")) {
                n.setAttribute("data-key", n.getAttribute("key"));
                n.removeAttribute("key");
            }
            return a + (n.outerHTML || n.textContent);
        }, "");
    }
    if (v?.type === "template-array") {
        return v.templates.reduce((a, x) => a + processVal(x), "");
    }
    return escapeHTML(String(v));
}

/** =========================================
 *  Evaluating expressions
 * ========================================= */
export function evalExpr(fn) {
    try {
        const r = fn();
        return r || r === 0 || r === "" ? r : null;
    } catch {
        return null;
    }
}

/** =========================================
 *  Check if it is an array of signals
 * ========================================= */
export function isSignalArrayResult(value) {
    return Array.isArray(value) && value.__signalArray === true;
}

/** =========================================
 *  Check if it is a template object
 * ========================================= */
export function isTemplateObject(obj) {
    return obj && typeof obj === "object" && obj.template;
}
