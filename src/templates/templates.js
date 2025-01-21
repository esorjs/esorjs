import { removeChildNodesBetween, findCommentPlaceholders } from "../utils/dom";
import { evalExpr, isTemplateObject } from "./engine";
import { reconcileArrays } from "../utils/ArrayDiff";

/**
 * Encargada de inyectar un placeholder (startNode-endNode)
 * y vincularlo a un signal. Cuando el signal cambie, se llama renderer().
 */
export function bindPlaceholderSignal(host, { signal, bindAttr, renderer }) {
    const [startNode, endNode] = findCommentPlaceholders(
        host.shadowRoot,
        bindAttr
    );
    if (!startNode || !endNode) return;
    host._bindSignalToElement(signal, (newVal) =>
        renderer(startNode, endNode, newVal)
    );
}

/**
 * handleSignalBinding: gestiona las inyecciones de tipo "text" o "expression",
 * delegando la parte de renderizado en renderEvaluated().
 */
export function handleSignalBinding({ host, type, signal, bindAttr }) {
    bindPlaceholderSignal(host, {
        signal,
        bindAttr,
        renderer: (startNode, endNode, newVal) => {
            const evaluated =
                type === "expression" ? evalExpr(() => newVal) : newVal;
            if (evaluated == null) return;
            renderEvaluated(host, startNode, endNode, evaluated);
        },
    });
}

/**
 * Función auxiliar que evalúa qué tipo de contenido se está insertando:
 * - template-array (usa ArrayDiff)
 * - templateObject (clona fragment)
 * - nodo de texto
 * También se encarga de limpiar el rango y de enlazar eventos si procede.
 */
function renderEvaluated(host, startNode, endNode, evaluated) {
    if (evaluated.type === "template-array") {
        reconcileArrays(
            startNode,
            endNode,
            startNode.__oldItems || [],
            evaluated.templates,
            host
        );
        return;
    }
    const node = isTemplateObject(evaluated)
        ? evaluated.template.cloneNode(true)
        : document.createTextNode(String(evaluated));

    removeChildNodesBetween(startNode, endNode);
    endNode.parentNode.insertBefore(node, endNode);

    // Si es un template clonable, bindear eventos de nuevo contenido
    if (isTemplateObject(evaluated))
        host._bindEventsInRange(startNode, endNode);
}

/**
 * specialAttr: detecta si un atributo está "reservado" para uso
 * reactivo (props) en el framework.
 */
export function specialAttr(name) {
    return (
        name &&
        !name.startsWith("data-") &&
        !name.startsWith("@") &&
        name !== "ref" &&
        /^[a-zA-Z][\w\-_:]*$/.test(name)
    );
}
