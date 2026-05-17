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
    // Bolt ⚡: Avoid for...of on live HTMLCollection. Use firstElementChild/nextElementSibling
    let child = parent.firstElementChild;
    while (child) {
        if (child._key !== undefined) oldNodesMap.set(child._key, child);
        child = child.nextElementSibling;
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

    // Bolt ⚡: Avoid indexed access on live HTMLCollection. Use direct pointer traversal
    let currentChild = parent.firstElementChild;
    for (let i = 0; i < newNodes.length; i++) {
        const expectedNode = newNodes[i];
        if (currentChild !== expectedNode) {
            parent.insertBefore(expectedNode, currentChild || null);
            // insertBefore moves expectedNode before currentChild.
            // currentChild remains the same, next expected node will be checked against it.
            // But if currentChild was expectedNode, we'd advance currentChild.
            // Actually, we must track the real DOM position.
            // After insertBefore, the newly inserted node is where currentChild used to be,
            // and currentChild is shifted. So the next actual DOM node is currentChild.
        } else {
            currentChild = currentChild.nextElementSibling;
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
        // Bolt ⚡: Use indexed loop instead of for...of destructuring on NamedNodeMap to avoid memory allocation overhead
        for (let i = 0; i < oldNode.attributes.length; i++) {
            const attr = oldNode.attributes[i];
            oldAttrs.set(attr.name, attr.value);
        }

        for (let i = 0; i < newNode.attributes.length; i++) {
            const attr = newNode.attributes[i];
            if (attr.name === "value" || attr.name === "checked") {
                if (oldNode[attr.name] !== attr.value) oldNode[attr.name] = attr.value;
            } else if (oldNode.getAttribute(attr.name) !== attr.value) {
                oldNode.setAttribute(attr.name, attr.value);
            }
            oldAttrs.delete(attr.name);
        }

        for (const name of oldAttrs.keys()) oldNode.removeAttribute(name);

        // Update children
        // Bolt ⚡: Avoid Array.from() on live NodeLists. Use firstChild/nextSibling traversal to minimize garbage collection
        let oldChild = oldNode.firstChild;
        let newChild = newNode.firstChild;

        while (oldChild || newChild) {
            if (!oldChild) {
                oldNode.appendChild(newChild.cloneNode(true));
                newChild = newChild.nextSibling;
            } else if (!newChild) {
                const nextOld = oldChild.nextSibling;
                oldChild._cleanup?.();
                oldNode.removeChild(oldChild);
                oldChild = nextOld;
            } else {
                const nextOld = oldChild.nextSibling;
                patchNode(oldChild, newChild);
                oldChild = nextOld;
                newChild = newChild.nextSibling;
            }
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
