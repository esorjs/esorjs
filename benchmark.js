const { performance } = require('perf_hooks');

const start1 = performance.now();
let count1 = 0;
for (let i = 0; i < 10000000; i++) {
    const attrName = i % 2 === 0 ? "value" : "class";
    if (["value", "checked", "selected"].includes(attrName)) {
        count1++;
    }
}
const end1 = performance.now();

const start2 = performance.now();
let count2 = 0;
for (let i = 0; i < 10000000; i++) {
    const attrName = i % 2 === 0 ? "value" : "class";
    if (attrName === "value" || attrName === "checked" || attrName === "selected") {
        count2++;
    }
}
const end2 = performance.now();

console.log(`Array.includes: ${end1 - start1}ms`);
console.log(`Boolean OR: ${end2 - start2}ms`);
