import { useSignal } from "../hooks/signals";
import { cleanAttributeValue } from "../utils/parser";
import { specialAttr } from "./templates";

function coerceAttrValue(raw) {
    if (typeof raw !== "string") return raw;
    const t = raw.trim();
    if (!t) return t;
    const low = t.toLowerCase(),
        sp = {
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
        const [signal, setSignal] = useSignal(
            coerceAttrValue(cleanAttributeValue(value))
        );
        signal.set = setSignal;
        instance._props[name] = signal;
    }
}

export function observeAttrMutations(instance) {
    const obs = new MutationObserver((ms) => {
        for (const m of ms) {
            if (m.type !== "attributes" || !specialAttr(m.attributeName))
                continue;
            const sig = instance._props[m.attributeName];
            if (sig?.set)
                sig.set(
                    coerceAttrValue(instance.getAttribute(m.attributeName))
                );
        }
    });
    obs.observe(instance, { attributes: true, attributeOldValue: true });
    instance._cleanup.add(() => obs.disconnect());
}

export function initPropsAndObserve(instance) {
    generateSpecialAttrSignals(instance);
    observeAttrMutations(instance);
}
