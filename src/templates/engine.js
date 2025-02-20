import { registerEvent } from "../events";
import { escapeHTML } from "../utils/parser";

export const PLACEHOLDER_EXPRESSION_PREFIX = "$:";
export const ATTRIBUTES_NAMES_EVENTS = "data_esor_event";
export const ATTRIBUTES_NAMES_BIND = "data_esor_bind";
export const ATTRIBUTES_NAMES_REFS = "data_esor_ref";

const attrReg = /* @__PURE__ */ new RegExp(/\s(\w[\w-]*)=(["'])?(?:(?!\2).)*$/);
const refReg = /* @__PURE__ */ new RegExp(/ref=(["'])?\s*$/);
const evtReg = /* @__PURE__ */ new RegExp(/(@\w+)=(["'])?\s*$/);
const qReg = /* @__PURE__ */ new RegExp(/["']\s*$/);
const rawTags = /* @__PURE__ */ new RegExp(/^(script|style|textarea|title)$/i);

function replaceAttribute(hStr, regexMatch, name, value) {
    const q = hStr && hStr.charAt(hStr.length - 1) === '"' ? '"' : "'";
    return hStr.replace(regexMatch, `${name}=${q}${value}${q}`);
}

const removeQuote = (s) => s.replace(qReg, "");

export const isTemplateObject = (o) =>
    o?.template?.nodeType === Node.DOCUMENT_FRAGMENT_NODE;

function injectEvent(fn, eType, hStr) {
    const id = registerEvent(eType, fn);
    return replaceAttribute(
        hStr,
        evtReg,
        `${ATTRIBUTES_NAMES_EVENTS}-${eType}`,
        id
    );
}

function injectRef(fn, hStr, i, refs) {
    refs.set(i, fn);
    return replaceAttribute(hStr, refReg, `${ATTRIBUTES_NAMES_REFS}-${i}`, i);
}

function injectSignalAttr(val, aName, hStr, sIdx, signals) {
    hStr = removeQuote(hStr);
    const quote = hStr && hStr.charAt(hStr.length - 1) === '"' ? '"' : "'";
    const initVal = typeof val === "function" ? val() : val;
    const escVal = rawTags.test(aName) ? String(initVal) : escapeHTML(initVal);
    const bindAttr = `${ATTRIBUTES_NAMES_BIND}-${sIdx}`;
    hStr += `${quote}${escVal}${quote} ${bindAttr}=${quote}true${quote}`;
    signals.set(sIdx, {
        type: "attribute",
        signal: val,
        attributeName: aName,
        bindAttr,
    });
    return hStr;
}

function injectExpr(val, isFn, hStr, sIdx, signals) {
    const bA = `${PLACEHOLDER_EXPRESSION_PREFIX}${sIdx}`;
    signals.set(sIdx, {
        type: isFn ? "expression" : "text",
        signal: val,
        bindAttr: bA,
    });
    const out = isFn ? val() : val;
    return `${hStr}<!--${bA}-->${escapeHTML(String(out))}<!--//${bA}-->`;
}

function injectArray(v, sIdx, signals, hStr, isSigArr, fn) {
    const bind = `${PLACEHOLDER_EXPRESSION_PREFIX}${sIdx}`;
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

function processTemplateNodes(template) {
    let output = "";
    for (const node of template.childNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute("key")) {
            node.setAttribute("data-key", node.getAttribute("key"));
            node.removeAttribute("key");
        }
        output += node.outerHTML || node.textContent;
    }
    return output;
}

function processVal(v) {
    if (v == null || v === false) return "";
    if (Array.isArray(v)) return v.reduce((acc, x) => acc + processVal(x), "");
    if (v instanceof SVGElement) return v.outerHTML;
    if (isTemplateObject(v)) return processTemplateNodes(v.template);
    if (v?.type === "template-array")
        return v.templates.reduce((a, x) => a + processVal(x), "");
    return v.toString();
}

function processTemplate(strs, ...vals) {
    let hStr = "";
    const sMap = new Map();
    const rMap = new Map();
    let sIdx = 0;
    let rIdx = 0;

    for (let i = 0; i < strs.length; i++) {
        hStr += strs[i];
        if (i >= vals.length) continue;

        const val = vals[i];
        // Detectar si estamos en un atributo
        const aMatch = strs[i].match(attrReg);
        const inAttr = !!aMatch;
        const aName = aMatch?.[1];

        const refMatch = refReg.exec(hStr);
        const evtMatch = evtReg.exec(hStr);

        const isRef = refMatch && typeof val === "function";
        const isEvt = evtMatch && typeof val === "function";
        const evtType = isEvt ? evtMatch[1].slice(1) : null;

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

    const t = document.createElement("template");
    t.innerHTML = hStr.trim();

    return { template: t.content, signals: sMap, refs: rMap };
}

export function html(strs, ...vals) {
    return processTemplate(strs, ...vals);
}
