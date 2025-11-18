import { renderTemplate } from "./render.js";

// Pool de contenedores para reducir garbage collection
const containerPool = [];
const getContainer = () => containerPool.pop() || document.createElement("div");
const releaseContainer = (c) => {
    c.textContent = "";
    containerPool.length < 10 && containerPool.push(c);
};

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
    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        child._key !== undefined && oldNodesMap.set(child._key, child);
    }

    const newNodes = [];
    for (let i = 0; i < newTemplates.length; i++) {
        const template = newTemplates[i];
        const key = template._key;
        const oldNode = oldNodesMap.get(key);

        const tempContainer = getContainer();
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

        releaseContainer(tempContainer);
    }

    for (const node of oldNodesMap.values()) {
        node._cleanup?.();
        parent.removeChild(node);
    }

    for (let i = 0; i < newNodes.length; i++) {
        const expectedNode = newNodes[i];
        const currentNode = children[i];
        currentNode !== expectedNode &&
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
    const oldType = oldNode.nodeType;
    const newType = newNode.nodeType;

    if (oldType === 1 && newType === 1) {
        // Element nodes
        if (oldNode.tagName !== newNode.tagName) {
            oldNode.replaceWith(newNode.cloneNode(true));
            return;
        }

        // Update attributes
        const oldAttrs = oldNode.attributes;
        const newAttrs = newNode.attributes;
        const toRemove = [];

        for (let i = oldAttrs.length - 1; i >= 0; i--) {
            const { name } = oldAttrs[i];
            !newNode.hasAttribute(name) && toRemove.push(name);
        }

        for (let i = 0; i < newAttrs.length; i++) {
            const { name, value } = newAttrs[i];
            if (name === "value" || name === "checked") {
                oldNode[name] !== value && (oldNode[name] = value);
            } else {
                oldNode.getAttribute(name) !== value &&
                    oldNode.setAttribute(name, value);
            }
        }

        for (let i = 0; i < toRemove.length; i++) {
            oldNode.removeAttribute(toRemove[i]);
        }

        // Update children
        const oldChildren = oldNode.childNodes;
        const newChildren = newNode.childNodes;
        const oldLen = oldChildren.length;
        const newLen = newChildren.length;
        const maxLen = Math.max(oldLen, newLen);

        for (let i = 0; i < maxLen; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];

            if (!oldChild) {
                oldNode.appendChild(newChild.cloneNode(true));
            } else if (!newChild) {
                oldChild._cleanup?.();
                oldNode.removeChild(oldChild);
            } else {
                patchNode(oldChild, newChild);
            }
        }
    } else if (oldType === 3 && newType === 3) {
        // Text nodes
        oldNode.textContent !== newNode.textContent &&
            (oldNode.textContent = newNode.textContent);
    } else {
        oldNode.replaceWith(newNode.cloneNode(true));
    }
}

export { reconcileArray };
