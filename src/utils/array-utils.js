 export const $array = {
    rotate: (arr) => {
        if (!arr || arr.length < 2) return arr;
        const copy = [...arr];
        copy.unshift(copy.pop());
        return copy;
    },
    addLast: (arr, item) => [...arr, item],
    removeLast: (arr) => arr.slice(0, -1),
    addFirst: (arr, item) => [item, ...arr],
    removeFirst: (arr) => arr.slice(1),
    replace: (arr, index, newItem) => {
        const copy = [...arr];
        copy[index] = newItem;
        return copy;
    }
};