import { effect } from "../hooks/reactivity.js";
import { markedFragment, markNode } from "../utils/dom.js";
import { reconcile } from "./reconcile.js";
import { tryCatch } from "../utils/error.js";

const templCache = new WeakMap(); // Template cache
const MARKER = "\ufeff\ufeff"; // Invisible marker for processing

/**
 * Inserts a fragment into the DOM
 * @ @param {DocumentFragment} fragment - Fragment to insert
 * @param {Node} parent - Parent Node
 * @param {Node} [node=null] - Reference Node
 * @private
 */
function insertFragment(fragment, parent, node = null) {
    if (!fragment || !parent) return;

    node && node.parentNode === parent
        ? parent.insertBefore(fragment, node)
        : parent.appendChild(fragment);
}

/**
 * Applies a reference to a node
 * @param {Node} node - Target node
 * @param {Function|Object} value - Reference to apply
 * @private
 */
function setRef(node, value) {
    if (typeof value === "function") value(node);
    else if (value && typeof value === "object" && "current" in value)
        value.current = node;
}

/**
 * Applies an event to a node
 * @param {Node} node - Target node
 * @param {string} attr - Event attribute name (e.g. "onclick")
 * @param {Function} value - Event handler
 * @private
 */
function setEvent(node, attr, value) {
    const eventName = attr.slice(2).toLowerCase();
    node.addEventListener(eventName, value);
    node._cleanup = () => node.removeEventListener(eventName, value);
}

/**
 * Applies inline styles to a DOM node.
 *
 * Iterates over the style object and sets each style property on the node's
 * style attribute.
 *
 * @param {Node} node - The target node to apply styles to.
 * @param {Object} value - An object containing CSS style properties and values.
 * @private
 */
function setStyle(node, value) {
    Object.assign(node.style, value);
}

/**
 * Applies an attribute to a node.
 * If the attribute is "value" or "checked", it sets the corresponding property on the node.
 * If the value is false, the attribute is removed from the node.
 * Otherwise, the attribute is set with the provided value.
 *
 * @param {Node} node - The target node.
 * @param {string} attr - The name of the attribute.
 * @param {any} value - The value to apply.
 * @private
 */

export function setAttribute(node, attr, value) {
    if (attr === "value" || attr === "checked") node[attr] = value;
    else if (value === false || value === null || value === undefined)
        node.removeAttribute(attr);
    else node.setAttribute(attr, value);
}

/**
 * Applies an effect to a node, so that when the node is disconnected, the effect is cleaned up.
 * @param {Node} node - The target node.
 * @param {Function} fn - The effect function to apply.
 * @returns {Function} The cleanup function for the effect.
 * @private
 */
function setEffect(node, fn) {
    const existingCleanup = node._cleanup;
    if (existingCleanup) existingCleanup();
    const cleanup = effect(fn);
    node._cleanup = cleanup;
    return cleanup;
}

/**
 * Replaces all nodes after MARKERNode with the new nodes.
 * @param {Node} MARKERNode - The marker node which marks the insertion point.
 * @param {Array<Node>} newNodes - The new nodes to insert.
 * @private
 */
function replaceNodes(MARKERNode, newNodes) {
    const parent = MARKERNode.parentNode;
    let next = MARKERNode.nextSibling;

    while (next && next.__nodeGroups) {
        if (next._cleanup) next._cleanup();
        parent.removeChild(next);
        next = MARKERNode.nextSibling;
    }

    if (newNodes?.length) {
        insertFragment(
            markedFragment(newNodes),
            parent,
            MARKERNode.nextSibling
        );
    }
}

/**
 * Updates the content of a node with a new value.
 *
 * If the new value is an array, it is treated as a list of nodes and the
 * reconciliation algorithm is used to update the content.
 *
 * If the new value is any other type, it is converted to a string and set
 * as the text content of a new text node, which is then inserted into the
 * document.
 *
 * If the new value is a function, it is called and the return value is used
 * as the new content.
 *
 * @param {Node} node - The target node.
 * @param {any} value - The new value to set as the content of the node.
 * @private
 */
function applyContent(node, value) {
    const updateContent = (val) => {
        tryCatch(() => {
            if (Array.isArray(val)) reconcile(val, node);
            else {
                const textNode = document.createTextNode(String(val ?? ""));
                markNode(textNode);
                replaceNodes(node, [textNode]);
            }
        }, "html.updateContent");
    };

    typeof value === "function"
        ? setEffect(node, () => updateContent(value()))
        : updateContent(value);
}

/**
 * Renders a node by applying an attribute or content.
 * If an attribute is provided, it removes the existing attribute, and depending
 * on its prefix, applies a reference, an event, or a regular attribute.
 * For reactive values, it applies an effect to update the attribute.
 * Otherwise, it updates the content of the node.
 *
 * @param {Node} node - The target node to render.
 * @param {string|null} attr - The attribute to process or null for content.
 * @param {any} value - The value to apply to the node.
 * @private
 */

const render = (node, attr, value) => {
    if (attr) {
        node.removeAttribute(attr);

        if (attr === "ref") setRef(node, value);
        else if (attr[0] == "o" && attr[1] == "n") setEvent(node, attr, value);
        else if (attr === "className") node.setAttribute("class", value);
        else if (attr === "style" && typeof value === "object")
            setEffect(node, () => setStyle(node, value));
        else {
            // If the value is reactive, apply effect
            typeof value === "function"
                ? setEffect(node, () => setAttribute(node, attr, value()))
                : setAttribute(node, attr, value);
        }
    }
    // Render node content
    else applyContent(node, value);
};

/**
 * Processes the attributes of a node.
 * Iterates over each attribute of the node and, if the attribute's value matches
 * the defined marker, calls the render function to apply the corresponding data value.
 *
 * @param {Node} node - The node whose attributes are to be processed.
 * @param {Array} data - An array of data values for interpolation.
 * @param {number} idx - The current index within the data array.
 * @returns {number} The updated index after processing.
 * @private
 */

function processAttributes(node, data, idx) {
    const attrs = Array.from(node.attributes);
    for (const attr of attrs) {
        if (attr.value === MARKER) render(node, attr.name, data[idx++]);
    }
    return idx;
}

/**
 * Processes a text node.
 * If the node is a marker, it is replaced by a comment and the corresponding data value is rendered.
 * If the node is not a marker, it is converted to a template and any comment nodes it contains are rendered.
 * @param {Node} node - The text node to be processed.
 * @param {Array} data - An array of data values for interpolation.
 * @param {number} idx - The current index within the data array.
 * @returns {number} The updated index after processing.
 * @private
 */
function processTextNode(node, data, idx) {
    if (node.nodeValue === MARKER) {
        const comm = document.createComment("");
        node.replaceWith(comm);
        render(comm, null, data[idx++]);
    } else {
        const tmp = createTemplate(node.nodeValue.replaceAll(MARKER, "<!>"));
        for (const child of Array.from(tmp.content.childNodes)) {
            if (child.nodeType === 8) render(child, null, data[idx++]);
        }
        node.replaceWith(tmp.content);
    }
    return idx;
}

/**
 * Creates an HTML template element from a string of HTML content.
 * @param {string} htmlContent - The HTML content to be converted to a template.
 * @returns {HTMLTemplateElement} The created template element.
 * @private
 */
function createTemplate(htmlContent) {
    const template = document.createElement("template");
    template.innerHTML = htmlContent;
    return template;
}

/**
 * Converts an HTML string into an array of DOM nodes.
 * @param {string} htmlContent - The HTML content to be converted to nodes.
 * @param {Function} [fn=null] - Optional function to process the created template element.
 * @returns {Array<Node>} The array of created nodes.
 * @private
 */
function templateToNodes(htmlContent, fn = null) {
    return tryCatch(
        () => {
            const template = createTemplate(htmlContent);
            if (typeof fn === "function") fn(template);
            return [...template.content.childNodes];
        },
        "html.templateToNodes",
        []
    );
}

/**
 * Collects all nodes from a template content.
 * @param {HTMLTemplateElement} template - Template element to collect nodes from.
 * @returns {Array<Node>} Array of collected nodes.
 * @private
 */
function collectNodes(template) {
    const nodes = [];
    const tw = document.createTreeWalker(template.content, 1 | 4);
    let node;
    while ((node = tw.nextNode())) nodes.push(node);
    return nodes;
}

/**
 * Builds DOM nodes from a template and data.
 * @param {Array<string>} tpl - Template strings
 * @param {...any} data - Data to be interpolated into the template
 * @returns {Array<Node>} Created nodes
 * @private
 */
function build(tpl, ...data) {
    return tryCatch(
        () => {
            if (tpl.length === 1) return templateToNodes(tpl[0]);
            if (!data.length) return templateToNodes(tpl.join(""));

            return templateToNodes(tpl.join(MARKER), (template) => {
                const nodes = collectNodes(template);
                let idx = 0;

                for (const n of nodes) {
                    if (n.nodeType === 1 && n.attributes.length) {
                        idx = processAttributes(n, data, idx);
                    } else if (n.nodeType === 3 && n.nodeValue.includes(MARKER))
                        idx = processTextNode(n, data, idx);
                }

                return nodes;
            });
        },
        "html.build",
        []
    );
}

/**
 * Creates DOM nodes from a template string and optional data
 * @param {Array<string>} tpl - Template strings
 * @param {...any} data - Data to be interpolated into the template
 * @returns {Array<Node>} Created nodes
 */
function html(tpl, ...data) {
    if (templCache.has(tpl)) return build(templCache.get(tpl), ...data);

    templCache.set(tpl, tpl);
    return build(tpl, ...data);
}

export { html };
