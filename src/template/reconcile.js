import { renderTemplate } from "./render.js";

/**
 * Reconciles the children of a parent DOM node with an array of new templates.
 *
 * This function updates the DOM by matching existing keyed nodes with new templates,
 * applying necessary patches, and adding or removing nodes as needed. Existing nodes
 * are reused and updated if they match a template by key, otherwise new nodes are created.
 * Unused nodes are removed from the DOM.
 *
 * @param {Node} parent - The parent DOM node whose children will be reconciled.
 * @param {Array} newTemplates - An array of template objects, each containing a `_key`
 *     property for node matching, and other properties necessary for rendering.
 */
function reconcileArray(parent, newTemplates) {
    const oldNodesMap = new Map();
    for (const child of parent.children) {
        if (child._key !== undefined) oldNodesMap.set(child._key, child);
    }

    const newNodes = [];
    for (const template of newTemplates) {
        const key = template._key;
        let oldNode = oldNodesMap.get(key);

        const tempContainer = document.createElement("div");
        renderTemplate(tempContainer, template);
        const newNode = tempContainer.firstElementChild;

        if (oldNode && newNode) {
            patchNode(oldNode, newNode);
            newNodes.push(oldNode);
            oldNodesMap.delete(key);
        } else if (newNode) {
            newNode._key = key;
            newNodes.push(newNode);
        }
    }

    for (const node of oldNodesMap.values()) {
        node._cleanup?.();
        parent.removeChild(node);
    }

    for (let i = 0; i < newNodes.length; i++) {
        const expectedNode = newNodes[i];
        const currentNode = parent.children[i];
        if (currentNode !== expectedNode)
            parent.insertBefore(expectedNode, currentNode || null);
    }
}

/**
 * Patches an existing DOM node with a new node.
 *
 * This function compares two nodes and updates the old node to match the new node.
 * If both nodes are element nodes with the same tag name, it synchronizes their
 * attributes and children. If they are text nodes, it updates the text content.
 * If the nodes are of different types or have different tag names, the old node
 * is replaced with a clone of the new node.
 *
 * @param {Node} oldNode - The node to be updated.
 * @param {Node} newNode - The node with new properties to update the old node.
 */
function patchNode(oldNode, newNode) {
    if (
        oldNode.nodeType === Node.ELEMENT_NODE &&
        newNode.nodeType === Node.ELEMENT_NODE
    ) {
        if (oldNode.tagName !== newNode.tagName) {
            oldNode.replaceWith(newNode.cloneNode(true));
            return;
        }

        // Update attributes
        const oldAttrs = new Map();
        for (const { name, value } of oldNode.attributes)
            oldAttrs.set(name, value);

        for (const { name, value } of newNode.attributes) {
            if (name === "value" || name === "checked") {
                if (oldNode[name] !== value) oldNode[name] = value;
            } else if (oldNode.getAttribute(name) !== value) {
                oldNode.setAttribute(name, value);
            }
            oldAttrs.delete(name);
        }

        for (const name of oldAttrs.keys()) oldNode.removeAttribute(name);

        // Update children
        const oldChildren = Array.from(oldNode.childNodes);
        const newChildren = Array.from(newNode.childNodes);
        const maxLen = Math.max(oldChildren.length, newChildren.length);

        for (let i = 0; i < maxLen; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];

            if (!oldChild) oldNode.appendChild(newChild.cloneNode(true));
            else if (!newChild) {
                oldChild._cleanup?.();
                oldNode.removeChild(oldChild);
            } else patchNode(oldChild, newChild);
        }
    } else if (
        oldNode.nodeType === Node.TEXT_NODE &&
        newNode.nodeType === Node.TEXT_NODE
    ) {
        if (oldNode.textContent !== newNode.textContent)
            oldNode.textContent = newNode.textContent;
    } else oldNode.replaceWith(newNode.cloneNode(true));
}

export { reconcileArray };
