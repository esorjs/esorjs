import { effect } from "../hooks/reactivity";
import { markedFragment, markNode } from "../utils/dom";
import { reconcile } from "./reconcile";

const templCache = new WeakMap();
const MARKER = "\ufeff"; // Invisible marker for processing

/**
 * Creates a <template> element from an HTML string.
 *
 * @param {string} htmlContent - The HTML string.
 * @returns {HTMLTemplateElement} The generated template.
 */
function createTemplate(htmlContent) {
  const template = document.createElement("template");
  template.innerHTML = htmlContent;
  return template;
}

/**
 * Assigns attributes, events, or content to a node, as appropriate.
 *
 * @param {Node} node - The node to process.
 * @param {string|null} attr - The attribute name (or null for content).
 * @param {any} value - The value to assign.
 */
const render = (node, attr, value) => {
  if (attr) {
    node.removeAttribute(attr);
    if (attr === "ref") {
      typeof value === "function"
        ? value(node)
        : value && (value.current = node);
    } else if (
      attr[0] == "o" &&
      attr[1] == "n" &&
      typeof value === "function"
    ) {
      const eventName = attr.slice(2).toLowerCase();
      node.addEventListener(eventName, value);
      node._cleanup = () => node.removeEventListener(eventName, value);
    } else if (attr === "style" && typeof value === "object") {
      effect(() => Object.assign(node.style, value));
    } else {
      typeof value === "function"
        ? effect(() => setAttribute(node, attr, value()))
        : setAttribute(node, attr, value);
    }
    // Render node content
  } else setContent(node, value);
};

export function setAttribute(node, attr, value) {
  if (attr === "value" || attr === "checked") node[attr] = value;
  else if (value === false || value === null || value === undefined)
    node.removeAttribute(attr);
  else node.setAttribute(attr, value);
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
function setContent(node, value) {
  const updateContent = (val) => {
    if (typeof val === "boolean") val = "";
    if (Array.isArray(val)) reconcile(val, node);
    else {
      const textNode = document.createTextNode(String(val ?? ""));
      markNode(textNode);
      replaceNodes(node, [textNode]);
    }
  };

  typeof value === "function"
    ? effect(() => updateContent(value()))
    : updateContent(value);
}

/**
 * Replaces all nodes following a marker node with new nodes.
 *
 * @param {Node} MARKERNode - The marker node.
 * @param {Array<Node>} newNodes - The new nodes to insert.
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
    insertFragment(markedFragment(newNodes), parent, MARKERNode.nextSibling);
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
 */
function processTemplate(template, data) {
  const nodes = [];
  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );

  while (walker.nextNode()) nodes.push(walker.currentNode);

  let idx = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.nodeType === Node.ELEMENT_NODE && n.attributes.length) {
      for (const attr of Array.from(n.attributes))
        if (attr.value === MARKER) render(n, attr.name, data[idx++]);
    } else if (n.nodeType === Node.TEXT_NODE && n.nodeValue.includes(MARKER)) {
      if (n.nodeValue === MARKER) {
        const comm = document.createComment("");
        n.parentNode.replaceChild(comm, n);
        render(comm, null, data[idx++]);
      } else {
        const tmp = createTemplate(n.nodeValue.replaceAll(MARKER, "<!>"));
        const children = Array.from(tmp.content.childNodes);
        for (let j = 0; j < children.length; j++) {
          const child = children[j];
          if (child.nodeType === Node.COMMENT_NODE)
            render(child, null, data[idx++]);
        }
        n.parentNode.replaceChild(tmp.content, n);
      }
    }
  }
}

/**
 * Converts an HTML string into an array of nodes.
 *
 * @param {string} htmlContent - The HTML string.
 * @param {Function|null} [fn=null] - Optional function to process the template.
 * @returns {Array<Node>} The array of generated nodes.
 */
function templateToNodes(htmlContent, fn = null) {
  const template = createTemplate(htmlContent);
  if (typeof fn === "function") fn(template);
  return [...template.content.childNodes];
}

/**
 * Builds DOM nodes from a template and interpolation data.
 *
 * @param {Array<string>} tpl - The template parts.
 * @param {...any} data - The data to interpolate.
 * @returns {Array<Node>} The created nodes.
 */
function build(tpl, ...data) {
  if (tpl.length === 1) return templateToNodes(tpl[0]);
  if (!data.length) return templateToNodes(tpl.join(""));

  const combined = tpl.join(MARKER);
  const template = createTemplate(combined);
  processTemplate(template, data);
  return [...template.content.childNodes];
}

/**
 * Main function that creates DOM nodes from a template literal and interpolation data.
 *
 * @param {Array<string>} tpl - Template strings.
 * @param {...any} data - The data to interpolate.
 * @returns {Array<Node>} The created nodes.
 */
function html(tpl, ...data) {
  if (templCache.has(tpl)) return build(templCache.get(tpl), ...data);
  templCache.set(tpl, tpl);
  return build(tpl, ...data);
}

export { html };
