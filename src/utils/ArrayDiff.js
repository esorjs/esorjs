// ============================================
// File: utils/ArrayDiff.js
// ============================================

/**
 * reconcileArrays: dif principal que:
 */
export function reconcileArrays(startNode, endNode, oldItems, newItems, host) {
    if (!Array.isArray(oldItems)) oldItems = [];
   if (!Array.isArray(newItems)) newItems = [];

   // 1) Recoge nodos antiguos (DOM) y construye nodos nuevos
   const parentNode = endNode.parentNode;
   const oldNodes = collectDOMNodesBetween(startNode, endNode);
   const newNodes = newItems.map((item, index) => {
       const key = getItemKey(item, index);
       return createElementFromItem(item, key);
   });

   // 2) Ejecuta reconciliación de nodos
   domdiff(parentNode, oldNodes, newNodes, endNode);

   // 3) Re-bind de eventos en el rango si el framework lo exige
   host._bindEventsInRange(startNode, endNode);

   // 4) Guarda la "versión" de items para usos posteriores
   startNode.__oldItems = [...newItems];
}

/**
* Versión basada en "udomdiff" para reconciliar arrays de nodos.
*
* 1. Separación clara de comparación de prefijos y sufijos.
* 2. Se construye el Map sólo la primera vez que realmente lo necesitamos.
* 3. Mantenemos misma firma, comportamiento y retrocompatibilidad.
*
* @param {Node} parentNode - Contenedor donde se realizan las operaciones
* @param {Node[]} a - Arreglo de nodos "viejos"
* @param {Node[]} b - Arreglo de nodos "nuevos"
* @param {Node|null} after - Nodo de referencia (siguiente) o null
*/
function domdiff(parentNode, a, b, after) {
   let aStart = 0;
   let bStart = 0;
   let aEnd = a.length;
   let bEnd = b.length;

   const reference = (aEnd && a[aEnd - 1].nextSibling) || after;

   while (aStart < aEnd && bStart < bEnd && a[aStart] === b[bStart]) {
       aStart++;
       bStart++;
   }

   while (aEnd > aStart && bEnd > bStart && a[aEnd - 1] === b[bEnd - 1]) {
       aEnd--;
       bEnd--;
   }

   let map = null;

   while (aStart < aEnd || bStart < bEnd) {
       if (aEnd === aStart) {
           const node =
               bEnd < b.length
                   ? bStart
                       ? b[bStart - 1].nextSibling
                       : b[bEnd - bStart]
                   : reference;

           while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
       } else if (bEnd === bStart) {
           while (aStart < aEnd) parentNode.removeChild(a[aStart++]);
       } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
           const temp = a[--aEnd].nextSibling;
           parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
           parentNode.insertBefore(b[--bEnd], temp);
           a[aEnd] = b[bEnd];
       } else {
           if (!map) {
               map = new Map();
               for (let i = bStart; i < bEnd; i++) map.set(b[i], i);
           }

           const index = map.get(a[aStart]);
           if (index != null) {
               if (bStart < index && index < bEnd) {
                   let i = aStart;
                   let sequence = 1;
                   while (++i < aEnd && i < bEnd) {
                       const t = map.get(a[i]);
                       if (t == null || t !== index + sequence) break;
                       sequence++;
                   }

                   if (sequence > index - bStart) {
                       const node = a[aStart];
                       while (bStart < index)
                           parentNode.insertBefore(b[bStart++], node);
                   } else parentNode.replaceChild(b[bStart++], a[aStart++]);
               } else aStart++;
           } else parentNode.removeChild(a[aStart++]);
       }
   }
}

/**
* Recorre el DOM entre startNode y endNode (excluidos)
* y devuelve un array con todos esos nodos.
*/
function collectDOMNodesBetween(startNode, endNode) {
   const result = [];
   let current = startNode.nextSibling;
   while (current && current !== endNode) {
       result.push(current);
       current = current.nextSibling;
   }
   return result;
}

/**
* Obtiene la "key" única para un item, usando item.key o item.id
* (si existen), o en su defecto "index-N".
*/
function getItemKey(item, index) {
   if (item && typeof item === "object") {
       if ("key" in item) return String(item.key);
       if ("id" in item) return String(item.id);
   }
   return `index-${index}`;
}

/**
* Crea el nodo DOM a partir de un item:
* - Si item contiene un "template" (ESOR-style),
*   clona su fragment y, si hay key, la asigna a data-key.
* - Si no, crea un TextNode con el valor toString() del item.
*/
function createElementFromItem(item, key) {
   if (item?.template) {
       const fragment = item.template.cloneNode(true);
       const node =
           fragment.childNodes.length === 1 ? fragment.firstChild : fragment;
       if (node.nodeType === 1 && key) node.setAttribute("data-key", key);
       return node;
   }
   return document.createTextNode(String(item ?? ""));
}
