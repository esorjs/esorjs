import { signal } from "../hooks/signals";
import { cleanAttributeValue } from "../utils/parser";
import { specialAttr } from "./helpers";

let textAreaElement;

function decodeHTMLEntities(text) {
    if (!textAreaElement) textAreaElement = document.createElement("textarea");
    textAreaElement.innerHTML = text;
    return textAreaElement.value;
}

function coerceAttrValue(raw) {
    if (typeof raw !== "string") return raw;
    if (raw.indexOf("&") !== -1) raw = decodeHTMLEntities(raw);
    const t = raw.trim();
    if (!t) return t;
    const low = t.toLowerCase();
    const sp = {
        true: true,
        false: false,
        null: null,
        undefined: undefined,
        nan: NaN,
        infinity: Infinity,
        "-infinity": -Infinity,
    };
    if (low in sp) return sp[low];
    const num = Number(t);
    if (!Number.isNaN(num)) return num;
    try {
        return JSON.parse(t);
    } catch {
        return t;
    }
}

export function generateSpecialAttrSignals(instance) {
    for (const { name, value } of instance.attributes) {
        if (!specialAttr(name)) continue;
        const prop = coerceAttrValue(cleanAttributeValue(value));
        instance._props[name] = signal(prop);
    }
}

export function observeAttrMutations(instance) {
    const handler = (mutationsList) => {
        for (const { attributeName } of mutationsList) {
            if (!specialAttr(attributeName)) continue;
            const sig = instance._props[attributeName];
            if (sig) sig(coerceAttrValue(instance.getAttribute(attributeName)));
        }
    };
    const observer = new MutationObserver(handler);
    observer.observe(instance, { attributes: true });
    instance._cleanup.add(() => observer.disconnect());
}

export function initPropsAndObserve(instance) {
    generateSpecialAttrSignals(instance);
    observeAttrMutations(instance);
}
