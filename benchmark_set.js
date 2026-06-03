const set = new Set();
for (let i = 0; i < 10000; i++) set.add(() => {});

console.time('for...of');
for (let j = 0; j < 1000; j++) {
  for (const fn of set) fn();
}
console.timeEnd('for...of');

const invoke = fn => fn();
console.time('forEach');
for (let j = 0; j < 1000; j++) {
  set.forEach(invoke);
}
console.timeEnd('forEach');
