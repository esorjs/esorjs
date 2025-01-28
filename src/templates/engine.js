import { registerEvent } from "../events/events";
import { escapeHTML } from "../utils/parser";

const attrReg = /\s(\w[\w-]*)=(["'])?(?:(?!\2).)*$/;
const refReg = /ref=(["'])?\s*$/;
const evtReg = /(@\w+)=(["'])?\s*$/;
const qReg = /(["'])\s*$/;
const rawTags = /^(script|style|textarea|title)$/i;

const trimQuote = (s) => s.replace(qReg, "");
const getQuote = (s) => (s.charAt(s.length - 1) === '"' ? '"' : "'");
export const isTemplateObject = (o) => o && typeof o === "object" && o.template;

function injectRef(fn, hStr, i, refs) {
    const q = getQuote(hStr);
    refs.set(i, fn);
    return hStr.replace(refReg, `data-ref-${i}=${q}true${q}`);
}
function injectEvent(fn, eType, hStr) {
    const q = getQuote(hStr);
    const id = registerEvent(eType, fn);
    fn.isEventHandler = true;
    return hStr.replace(evtReg, `data-event-${eType}=${q}${id}${q}`);
}
function injectSignalAttr(val, aName, hStr, sIdx, signals) {
    hStr = trimQuote(hStr);
    const q = getQuote(hStr);
    const initVal = typeof val === "function" ? val() : val;
    const escVal = rawTags.test(aName) ? String(initVal) : escapeHTML(initVal);
    const bindAttr = `data-bind-${sIdx}`;
    hStr += `${escVal} '' ${bindAttr}=${q}true${q}`;
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
    signals.set(sIdx, {
        type: isFn ? "expression" : "text",
        signal: val,
        bindAttr: bA,
    });
    const out = isFn ? val() : val;
    return `${hStr}<!--${bA}-->${escapeHTML(String(out))}<!--//${bA}-->`;
}
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
function processVal(v) {
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

            // Inlined "determineInjection"
            const refMatch = hStr.match(refReg),
                evtMatch = hStr.match(evtReg),
                ref = refMatch && typeof val === "function",
                event = evtMatch && typeof val === "function",
                evtType = evtMatch ? evtMatch[1].slice(1) : null;

            if (ref) {
                hStr = injectRef(val, hStr, rIdx++, rMap);
            } else if (event) {
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
export function evalExpr(fn) {
    try {
        return fn() ?? null;
    } catch {
        return null;
    }
}

export function html(strs, ...vals) {
    return processTemplate(strs, ...vals);
}
