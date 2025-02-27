import { withCurrentComponent } from "../globals";
import { reconcileArrays } from "./reconcile";
import { findCommentPlaceholders, removeChildNodesBetween } from "../utils/dom";
import { effect } from "../hooks/signals";
import { getEventHandler } from "../events";
import { evalExpr } from "./helpers";
import { ATTRIBUTES_NAMES_EVENTS } from "./engine";

export function setupEventDelegation($this, eventAttrs) {
    const shadow = $this?.shadowRoot;
    if (!shadow) return;

    const eventTypes = new Set();
    for (const attr of eventAttrs) {
        const evtType = attr.name.replace(`${ATTRIBUTES_NAMES_EVENTS}-`, "");
        if (evtType) eventTypes.add(evtType);
    }

    for (const evtType of eventTypes) {
        const listener = (event) => {
            const target = event.target;
            if (target.hasAttribute(`${ATTRIBUTES_NAMES_EVENTS}-${evtType}`)) {
                const handlerId = Number(
                    target.getAttribute(`${ATTRIBUTES_NAMES_EVENTS}-${evtType}`)
                );
                const handler = getEventHandler($this, handlerId);
                if (typeof handler === "function") {
                    withCurrentComponent($this, () => {
                        handler.call($this, event);
                    });
                }
            }
        };

        shadow.addEventListener(evtType, listener, {
            passive: false,
            capture: true,
        });
        $this._eventHandlers = $this._eventHandlers || new Map();
        $this._eventHandlers.set(evtType, listener);
    }
}

export function setupRefs(refAttrs, refMap) {
    if (!refAttrs || !refMap) return;

    for (const attr of refAttrs) {
        const el = attr.ownerElement;
        if (!el) continue;

        const idx = Number(attr.value);
        el.removeAttribute(attr.name);

        const refFn = refMap.get(idx);
        if (typeof refFn === "function") refFn(el);
    }
}

export function bindSignalToElement($this, sig, updateFn) {
    const eff = effect(() => {
        if ($this._isUpdating) return;
        $this._isUpdating = true;
        try {
            let value;
            typeof sig === "function" ? (value = sig()) : (value = sig);
            updateFn(value);
        } catch (err) {
            console.error("Error in signal binding:", err);
        } finally {
            $this._isUpdating = false;
        }
    });

    $this._cleanup.add(eff);
}

function handleSignalBinding({ host, type, signal, bindAttr }) {
    bindPlaceholderSignal(host, {
        signal,
        bindAttr,
        renderer: (start, end, val) => {
            const evaluated = type === "expression" ? evalExpr(() => val) : val;
            if (evaluated != null) renderEvaluated(host, start, end, evaluated);
        },
    });
}

function bindPlaceholderSignal(host, { signal, bindAttr, renderer }) {
    const [startNode, endNode] = findCommentPlaceholders(
        host.shadowRoot,
        bindAttr
    );
    if (!startNode || !endNode) return;

    bindSignalToElement(host, signal, (newVal) => {
        renderer(startNode, endNode, newVal);
    });
}

function renderEvaluated(host, start, end, val) {
    let current = start.nextSibling;
    if (current && current.nodeType === Node.TEXT_NODE) {
        current.textContent = String(val);
    } else {
        removeChildNodesBetween(start, end);
        const textNode = document.createTextNode(String(val));
        end.parentNode.insertBefore(textNode, end);
    }
}

export function setupSignals($this, signals) {
    if (!signals || signals.size === 0) return;

    for (const { type, signal, bindAttr, attributeName } of signals.values()) {
        switch (type) {
            case "attribute":
                handleAttributeSignal($this, signal, bindAttr, attributeName);
                break;
            case "array":
                handleArraySignal($this, signal, bindAttr);
                break;
            case "text":
            case "expression":
                handleSignalBinding({ host: $this, type, signal, bindAttr });
                break;
        }
    }
}

function handleAttributeSignal($this, sig, bindAttr, attributeName) {
    const el = $this.shadowRoot.querySelector(`[${bindAttr}]`);
    if (!el) return;
    el.removeAttribute(bindAttr);

    bindSignalToElement($this, sig, (value) => {
        const stringValue = String(value);
        if (el.getAttribute(attributeName) !== stringValue) {
            el.setAttribute(attributeName, stringValue);
        }
    });
}

function handleArraySignal($this, sig, bindAttr) {
    const [startNode, endNode] = findCommentPlaceholders(
        $this.shadowRoot,
        bindAttr
    );
    if (!startNode || !endNode) return;

    bindSignalToElement($this, sig, (newValue) => {
        const oldItems = startNode.__oldItems || [];
        const newItems = Array.isArray(newValue) ? newValue : [];
        reconcileArrays(startNode, endNode, oldItems, newItems, $this);
        startNode.__oldItems = [...newItems];
    });
}
