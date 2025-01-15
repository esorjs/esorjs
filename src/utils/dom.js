export function valuesChanged(val1, val2) {
    return !Object.is(val1, val2);
}

export function removeChildNodesBetween(startNode, endNode) {
    let node = startNode.nextSibling;
    while (node && node !== endNode) {
        const next = node.nextSibling;
        node.parentNode.removeChild(node);
        node = next;
    }
}

export function findCommentPlaceholders(root, bindAttr) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    let startNode = null;
    let endNode = null;
    let foundStart = false;

    while (walker.nextNode()) {
        const { nodeValue } = walker.currentNode;
        if (!foundStart && nodeValue === bindAttr) {
            startNode = walker.currentNode;
            foundStart = true;
        } else if (foundStart && nodeValue === `//${bindAttr}`) {
            endNode = walker.currentNode;
            break;
        }
    }

    return [startNode, endNode];
}

export function insertContentBefore(parent, content, endNode) {
    if (isTemplateObject(content))
        parent.insertBefore(content.template.cloneNode(true), endNode);
    else parent.insertBefore(document.createTextNode(String(content)), endNode);
}
