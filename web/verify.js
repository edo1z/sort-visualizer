// JS版ソートが正しく並べ替えるかを Node で検証する。
//   node web/verify.js
const { SORTS } = require("./sorts.js");

function run(key, data) {
  const a = data.slice();
  for (const _ of SORTS[key](a)) { /* 消費するだけ */ }
  return a;
}
function sortedCopy(d) { return d.slice().sort((x, y) => x - y); }
function eq(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }

const fixtures = [
  [], [1], [2, 1], [5, 3, 8, 1, 9, 2, 7, 4, 6, 0],
  [3, 3, 1, 1, 2, 2], Array.from({ length: 20 }, (_, i) => i),
  Array.from({ length: 20 }, (_, i) => 19 - i),
];

let fail = 0, total = 0;
for (const key of Object.keys(SORTS)) {
  const cases = key === "bogo" ? [[3, 1, 2, 5, 4], [1], []] : fixtures;
  for (const data of cases) {
    total++;
    const got = run(key, data);
    if (!eq(got, sortedCopy(data))) { fail++; console.log(`FAIL ${key}: ${JSON.stringify(data)} -> ${JSON.stringify(got)}`); }
  }
  // ランダム（bogo以外）
  if (key !== "bogo") {
    for (let t = 0; t < 30; t++) {
      const n = Math.floor(Math.random() * 40);
      const data = Array.from({ length: n }, () => Math.floor(Math.random() * 50));
      total++;
      if (!eq(run(key, data), sortedCopy(data))) { fail++; console.log(`FAIL ${key} random`); break; }
    }
  }
}
console.log(`${total - fail}/${total} passed`);
process.exit(fail ? 1 : 0);
