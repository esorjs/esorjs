import { sanitizeHtml } from "../utils/parser.js";
import { effect } from "../hooks/reactivity.js";
// getCurrentContext will be removed from direct use here. componentInstance will be passed.
import { createFragment, joinTruthy } from "../utils/dom.js";
import { reconcile } from "./reconcile.js";

const templCache = new WeakMap();
const MARKER = "\ufeff"; // Invisible marker for processing

/**
 * Assigns attributes, events, or content to a node, as appropriate.
 *
 * @param {Node} node - The node to process.
 * @param {string|null} attr - The attribute name (or null for content).
 * @param {any} value - The value to assign.
 */
const render = (node, attr, value, componentInstance) => { // Added componentInstance
    if (attr) {
        node.removeAttribute(attr);
        if (attr === "ref") {
            typeof value === "function"
                ? value(node)
                : value && (value.current = node);
        } else if (
            attr[0] === "o" && // Use strict equality
            attr[1] === "n" &&
            typeof value === "function"
        ) {
            const eventName = attr.slice(2).toLowerCase();
            // componentInstance is now passed as an argument
            if (componentInstance && componentInstance.onEffect) {
                componentInstance.onEffect(() => {
                    node.addEventListener(eventName, value);
                    return () => {
                        node.removeEventListener(eventName, value);
                    };
                });
            } else {
                node.addEventListener(eventName, value);
                node._cleanup = () => node.removeEventListener(eventName, value);
            }
        } else if (attr === "style") {
            // componentInstance is now passed as an argument
            if (typeof value === "function") { // Reactive style object from a signal
                if (componentInstance && componentInstance.onEffect) {
                    componentInstance.onEffect(() => effect(() => {
                        Object.assign(node.style, value());
                    }));
                } else {
                    effect(() => {
                        Object.assign(node.style, value());
                    });
                }
            } else if (typeof value === "object" && value !== null) { // Static style object
                Object.assign(node.style, value);
            } else { // Style as string
                setAttribute(node, attr, value);
            }
        } else { // Other attributes
            // componentInstance is now passed as an argument
            if (typeof value === "function") { // Reactive attribute
                if (componentInstance && componentInstance.onEffect) {
                    componentInstance.onEffect(() => effect(() => {
                        setAttribute(node, attr, value());
                    }));
                } else {
                    effect(() => {
                        setAttribute(node, attr, value());
                    });
                }
            } else { // Static attribute
                setAttribute(node, attr, value);
            }
        }
        // Render node content
    } else setContent(node, value, componentInstance); // Pass componentInstance
};

/**
 * Sets an attribute on a node.
 *
 * If the attribute is "value" or "checked", sets the property directly.
 * If the value is null, undefined, or false, removes the attribute.
 * Otherwise, sets the attribute with the given value.
 *
 * @param {Node} node - The node to update.
 * @param {string} attr - The attribute name.
 * @param {any} value - The value to assign.
 */
export function setAttribute(node, attr, value) {
    if (attr === "value" || attr === "checked") node[attr] = value;
    else if (value === false || value === null || value === undefined)
        node.removeAttribute(attr);
    else
        node.setAttribute(
            attr,
            typeof value === "object" ? joinTruthy(value) : value
        );
}

/**
 * Replaces all nodes following a marker node with new nodes.
 *
 * @param {Node} markerNode - The marker node.
 * @param {Array<Node>} newNodes - The new nodes to insert.
 */
function replaceNodes(markerNode, newNodes) {
    const parent = markerNode.parentNode;
    let next = markerNode.nextSibling;

    // Remove all nodes until the next marker
    while (next && next._marker) {
        next._cleanup?.();
        parent.removeChild(next);
        next = markerNode.nextSibling;
    }

    if (newNodes?.length) {
        insertFragment(
            createFragment(newNodes, { mark: true }),
            parent,
            markerNode.nextSibling
        );
    }
}

/**
 * Updates the content of a node.
 *
 * If the value is an array, the reconciliation algorithm is used.
 * Otherwise, a text node is created.
 *
 * @param {Node} node - The node to update.
 * @param {any} value - The new value.
 */
function setContent(node, value, componentInstance) { // Added componentInstance
    const updateContent = (val) => {
        if (val === true || val === false) val = "";
        if (Array.isArray(val)) reconcile(val, node);
        else {
            const textValue = val == null ? "" : String(val);
            const textNode = document.createTextNode(sanitizeHtml(textValue));
            replaceNodes(node, [textNode]);
        }
    };
    // componentInstance is now passed as an argument
    if (componentInstance && componentInstance.onEffect && typeof value === "function") {
        componentInstance.onEffect(() => effect(() => updateContent(value())));
    } else if (typeof value === "function") {
        effect(() => updateContent(value()));
    } else { // Non-reactive
        updateContent(value);
    }
}

/**
 * Inserts a fragment into the DOM.
 *
 * @param {DocumentFragment} fragment - The fragment to insert.
 * @param {Node} parent - The parent node.
 * @param {Node|null} refNode - Reference node for insertion.
 */
function insertFragment(fragment, parent, refNode = null) {
    if (!fragment || !parent) return;
    refNode && refNode.parentNode === parent
        ? parent.insertBefore(fragment, refNode)
        : parent.appendChild(fragment);
}

/**
 * Processes an HTML template and replaces markers with provided values.
 *
 * @param {HTMLTemplateElement} template - The template to process.
 * @param {Array<any>} data - The values to replace in the template.
 * @param {object} componentInstance - The component instance for context.
 */
function processTemplate(template, data, componentInstance) { // Added componentInstance
    const nodes = [];
    const walker = document.createTreeWalker(template.content, 1 | 4);
    while (walker.nextNode()) nodes.push(walker.currentNode);

    let idx = 0;
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.nodeType === 1 && n.attributes.length) {
            for (const attr of Array.from(n.attributes))
                if (attr.value === MARKER) render(n, attr.name, data[idx++], componentInstance); // Pass componentInstance
        } else if (n.nodeType === 3 && n.nodeValue.includes(MARKER)) {
            if (n.nodeValue === MARKER) {
                const comm = document.createComment("");
                n.parentNode.replaceChild(comm, n);
                render(comm, null, data[idx++], componentInstance); // Pass componentInstance
            } else {
                const tmp = createNodes(n.nodeValue.replaceAll(MARKER, "<!>"));
                const children = Array.from(tmp.content.childNodes);
                for (let j = 0; j < children.length; j++) {
                    const child = children[j];
                    if (child.nodeType === 8) render(child, null, data[idx++], componentInstance); // Pass componentInstance
                }
                n.parentNode.replaceChild(tmp.content, n);
            }
        }
    }
}

/**
 * Parses an HTML string into a template element or an array of nodes.
 *
 * @param {string} html - The HTML string to parse.
 * @param {Object} [options={}] - Options for output type.
 * @param {"template"|"nodes"} [options.as="template"] - Whether to return a template or nodes.
 * @returns {HTMLTemplateElement|Array<Node>} - The parsed template or array of nodes.
 */
const createNodes = (html, opts) => {
    const t = document.createElement("template");
    t.innerHTML = html;
    return opts?.as === "nodes" ? [...t.content.childNodes] : t;
};

/**
 * Main function that creates DOM nodes from a template literal and interpolation data.
 *
 * @param {Array<string>} tpl - Template strings.
 * @param {object} componentInstance - The component instance.
 * @param {Array<string>} tpl - Template strings.
 * @param {...any} data - The data to interpolate.
 * @returns {Array<Node>} The created nodes.
 */
// Renamed from 'html' to avoid conflict with user-facing 'this.html' or global 'html'
// This function is intended for internal use by the mechanism that sets up `this.html`
export function generateNodesFromTemplate(componentInstance, tpl, ...data) {
    const cachedTpl = templCache.get(tpl) || (templCache.set(tpl, tpl), tpl);

    if (!data.length) {
        return cachedTpl.length === 1
            ? createNodes(cachedTpl[0], { as: "nodes" })
            : createNodes(cachedTpl.join(""), { as: "nodes" });
    }

    const template = createNodes(cachedTpl.join(MARKER));
    processTemplate(template, data, componentInstance); // Pass componentInstance
    return [...template.content.childNodes];
}

// The global 'html' export is removed. Users should use 'this.html' attached by 'createLifecycle'.
// export { html }; // This line is removed.
