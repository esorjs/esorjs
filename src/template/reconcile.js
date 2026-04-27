import { renderTemplate } from "./render.js";

// Pool de contenedores para reducir garbage collection
const containerPool = [];
const MAX_POOL_SIZE = 50;  // Incrementado de 10 a 50 para mejor eficiencia
const getContainer = () => containerPool.pop() || document.createElement("div");
const releaseContainer = (c) => {
    c.textContent = "";
    c.innerHTML = "";  // Limpieza más completa
    if (containerPool.length < MAX_POOL_SIZE) containerPool.push(c);
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
        if (child._key !== undefined) oldNodesMap.set(child._key, child);
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
        if (currentNode !== expectedNode) parent.insertBefore(expectedNode, currentNode || null);
    }
}

/**
 * Checks if two nodes are of the same type for reconciliation purposes.
 * @param {Node} a - First node
 * @param {Node} b - Second node
 * @returns {boolean} True if nodes can be patched
 * @private
 */
function isSameNodeType(a, b) {
    return a.nodeType === b.nodeType &&
           (a.nodeType !== 1 || a.tagName === b.tagName);
}

/**
 * Optimized children patching with heuristics for common cases.
 * @param {Node} parent - Parent DOM node
 * @param {NodeList} oldChildren - Current children
 * @param {NodeList} newChildren - New children to reconcile
 * @private
 */
function patchChildren(parent, oldChildren, newChildren) {
    const oldLen = oldChildren.length;
    const newLen = newChildren.length;

    const minLen = Math.min(oldLen, newLen);

    // Optimized sequential patching avoiding live NodeList index shifts
    for (let i = 0; i < minLen; i++) {
        patchNode(oldChildren[i], newChildren[i]);
    }

    if (newLen > oldLen) {
        const fragment = document.createDocumentFragment();
        for (let i = minLen; i < newLen; i++) {
            fragment.appendChild(newChildren[i].cloneNode(true));
        }
        parent.appendChild(fragment);
    } else if (oldLen > newLen) {
        for (let i = oldLen - 1; i >= minLen; i--) {
            const child = oldChildren[i];
            child._cleanup?.();
            parent.removeChild(child);
        }
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

        for (let i = oldAttrs.length - 1; i >= 0; i--) {
            const name = oldAttrs[i].name;
            if (!newNode.hasAttribute(name)) {
                oldNode.removeAttribute(name);
            }
        }

        for (let i = 0; i < newAttrs.length; i++) {
            const attr = newAttrs[i];
            const name = attr.name;
            const value = attr.value;
            if (name === "value" || name === "checked") {
                if (oldNode[name] !== value) oldNode[name] = value;
            } else {
                if (oldNode.getAttribute(name) !== value) oldNode.setAttribute(name, value);
            }
        }

        // Update children using optimized patching
        patchChildren(oldNode, oldNode.childNodes, newNode.childNodes);
    } else if (oldType === 3 && newType === 3) {
        // Text nodes
        if (oldNode.textContent !== newNode.textContent) oldNode.textContent = newNode.textContent;
    } else {
        oldNode.replaceWith(newNode.cloneNode(true));
    }
}

export { reconcileArray };
