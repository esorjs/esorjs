import { useSignal } from "../hooks/signals";
import { cleanAttributeValue } from "../utils/parser";
import { specialAttr } from "./templates";

let textAreaElement;

/**
 * decodeHTMLEntities:
 * Reutiliza un único <textarea> para decodificar entidades HTML.
 */
function decodeHTMLEntities(text) {
    if (!textAreaElement) textAreaElement = document.createElement("textarea");
    textAreaElement.innerHTML = text;
    return textAreaElement.value;
}

/**
 * coerceAttrValue:
 * Convierte la cadena a su tipo adecuado (boolean, number, JSON, etc.),
 * decodificando las entidades HTML si es necesario.
 */
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
    instance._props = instance._props || {};
    instance._propsSetters = instance._propsSetters || {};

    for (const { name, value } of instance.attributes) {
        if (!specialAttr(name)) continue;
        if (Object.prototype.hasOwnProperty.call(instance, name)) continue;

        const coercedValue = coerceAttrValue(cleanAttributeValue(value));
        const [signal, setSignal] = useSignal(coercedValue);

        if (typeof coercedValue === "object") {
            Object.defineProperty(instance._props, name, {
                get: signal,
                configurable: true,
            });
        } else {
            instance._props[name] = signal;
            instance._propsSetters[name] = setSignal;
        }
    }
}

export function observeAttrMutations(instance) {
    const obs = new MutationObserver((ms) => {
        for (const m of ms) {
            if (m.type !== "attributes" || !specialAttr(m.attributeName))
                continue;
            const setter = instance._propsSetters[m.attributeName];
            if (setter) {
                const newValue = coerceAttrValue(
                    instance.getAttribute(m.attributeName)
                );
                setter(newValue);
            }
        }
    });
    obs.observe(instance, { attributes: true, attributeOldValue: true });
    instance._cleanup.add(() => obs.disconnect());
}

export function initPropsAndObserve(instance) {
    generateSpecialAttrSignals(instance);
    observeAttrMutations(instance);
}
