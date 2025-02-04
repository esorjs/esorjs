/**
 * engine.js
 * Module for processing template literals, generating DOM templates and injecting signals,
 * references and events dynamically. Refactored to reduce repetitive code,
 * unify attribute injection logic and simplify functions.
 */

import { registerEvent } from "../events/events";
import { escapeHTML } from "../utils/parser";

// Regular expressions to detect attributes, references, events and quotes
const attrReg = /\s(\w[\w-]*)=(["'])?(?:(?!\2).)*$/;
const refReg = /ref=(["'])?\s*$/;
const evtReg = /(@\w+)=(["'])?\s*$/;
const qReg = /(["'])\s*$/;
const rawTags = /^(script|style|textarea|title)$/i;

/**
 * replaceAttribute:
 * Utility to replace in an hStr string the attribute matching the regex (regexMatch),
 * injecting name=value with safe quotes.
 * @param {string} hStr - Accumulated HTML string.
 * @param {RegExp} regexMatch - Regular expression to replace.
 * @param {string} name - Attribute name to insert.
 * @param {string} value - Attribute value.
 * @returns {string}
 */
function replaceAttribute(hStr, regexMatch, name, value) {
    // Detect existing end quote or use ' by default
    const q = hStr && hStr.charAt(hStr.length - 1) === '"' ? '"' : "'";
    return hStr.replace(regexMatch, `${name}=${q}${value}${q}`);
}

/**
 * removeQuote: Removes extra ending quotes.
 * @param {string} s
 * @returns {string}
 */
function removeQuote(s) {
    return s.replace(qReg, "");
}

/**
 * isTemplateObject: Verifies if the object has a "template" property.
 * @param {any} o
 * @returns {boolean}
 */
export const isTemplateObject = (o) => o && typeof o === "object" && o.template;

/**
 * injectRef: Injects a "ref" into the HTML string (data-ref-i).
 * @param {Function} fn - Reference function.
 * @param {string} hStr - HTML string.
 * @param {number} i - Index for the ref.
 * @param {Map} refs - References map.
 */
function injectRef(fn, hStr, i, refs) {
    refs.set(i, fn);
    return replaceAttribute(hStr, refReg, `data-ref-${i}`, "true");
}

/**
 * injectEvent: Injects the event handler (data-event-type).
 * @param {Function} fn - Handler function.
 * @param {string} eType - Event type (without @).
 * @param {string} hStr - HTML string.
 */
function injectEvent(fn, eType, hStr) {
    const id = registerEvent(eType, fn);
    fn.isEventHandler = true;
    return replaceAttribute(hStr, evtReg, `data-event-${eType}`, id);
}

/**
 * injectSignalAttr: Injects a signal into an HTML attribute
 * (closing the original attribute and adding data-bind).
 * @param {any} val
 * @param {string} aName
 * @param {string} hStr
 * @param {number} sIdx
 * @param {Map} signals
 */
function injectSignalAttr(val, aName, hStr, sIdx, signals) {
    hStr = removeQuote(hStr);
    const quote = hStr && hStr.charAt(hStr.length - 1) === '"' ? '"' : "'";

    const initVal = typeof val === "function" ? val() : val;
    const escVal = rawTags.test(aName) ? String(initVal) : escapeHTML(initVal);
    const bindAttr = `data-bind-${sIdx}`;

    // Close previous attribute with its value and add data-bind
    hStr += `${quote}${escVal}${quote} ${bindAttr}=${quote}true${quote}`;

    signals.set(sIdx, {
        type: "attribute",
        signal: val,
        attributeName: aName,
        bindAttr,
    });
    return hStr;
}

/**
 * injectExpr: Injects an expression (or function) using comments as placeholders.
 * @param {any} val
 * @param {boolean} isFn
 * @param {string} hStr
 * @param {number} sIdx
 * @param {Map} signals
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
 * injectArray: Injects an array or template-array into the template.
 * @param {any} v
 * @param {number} sIdx
 * @param {Map} signals
 * @param {string} hStr
 * @param {boolean} isSigArr
 * @param {Function} [fn]
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
 * processVal: Processes a value to inject it into the template.
 * @param {any} v
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

    if (Array.isArray(v)) {
        return v.reduce((acc, x) => acc + processVal(x), "");
    }

    if (isTemplateObject(v)) {
        // Convert childNodes to string; if they have key, change it to data-key
        return [...v.template.childNodes].reduce((acc, n) => {
            if (n.nodeType === 1 && n.hasAttribute("key")) {
                n.setAttribute("data-key", n.getAttribute("key"));
                n.removeAttribute("key");
            }
            return acc + (n.outerHTML || n.textContent);
        }, "");
    }

    if (v?.type === "template-array") {
        return v.templates.reduce((a, x) => a + processVal(x), "");
    }

    return escapeHTML(String(v));
}

/**
 * processTemplate: Processes a template literal and its values to build:
 *   - The template content (template).
 *   - A signals map (signals).
 *   - A references map (refs).
 * @param {Array<string>} strs
 * @param  {...any} vals
 */
function processTemplate(strs, ...vals) {
    let hStr = "";
    const sMap = new Map();
    const rMap = new Map();
    let sIdx = 0;
    let rIdx = 0;

    for (let i = 0; i < strs.length; i++) {
        hStr += strs[i];
        if (i < vals.length) {
            const val = vals[i];
            const aMatch = strs[i].match(attrReg);
            const inAttr = !!aMatch;
            const aName = aMatch?.[1];
            const refMatch = hStr.match(refReg);
            const evtMatch = hStr.match(evtReg);

            // Determine if it's a ref or event
            const isRef = refMatch && typeof val === "function";
            const isEvt = evtMatch && typeof val === "function";
            const evtType = evtMatch ? evtMatch[1].slice(1) : null;

            if (isRef) {
                hStr = injectRef(val, hStr, rIdx++, rMap);
            } else if (isEvt) {
                hStr = injectEvent(val, evtType, hStr);
            } else if ((val?.signal || typeof val === "function") && inAttr) {
                // Signal injection in an attribute
                hStr = injectSignalAttr(val, aName, hStr, sIdx++, sMap);
            } else if (Array.isArray(val) && val.__signalArray === true) {
                // Array with signal
                hStr = injectArray(val, sIdx++, sMap, hStr, true);
            } else if (val?.signal) {
                // Expression: normal signal
                hStr = injectExpr(val, false, hStr, sIdx++, sMap);
            } else if (typeof val === "function") {
                // Expression: function
                hStr = injectExpr(val, true, hStr, sIdx++, sMap);
            } else if (Array.isArray(val)) {
                // Simple array
                hStr = injectArray(val, sIdx++, sMap, hStr, false, val);
            } else if (val != null) {
                // Primitive value
                hStr += processVal(val);
            }
        }
    }

    const t = document.createElement("template");
    t.innerHTML = hStr.trim();
    return { template: t.content, signals: sMap, refs: rMap };
}

/**
 * evalExpr: Evaluates a function and returns its result or null in case of error.
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
 * html: Main function to create templates from template literals.
 * @param {Array<string>} strs
 * @param  {...any} vals
 * @returns {Object} { template, signals, refs }
 */
export function html(strs, ...vals) {
    return processTemplate(strs, ...vals);
}
