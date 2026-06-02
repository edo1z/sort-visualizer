// 各お手本テンプレ sort(a, viz) が正しく並べ替えるか node で検証する。
//   node web/verify-templates.js
const { TEMPLATES } = require("./templates.js");

function makeViz(a) {
  return {
    get n() { return a.length; },
    get: (i) => a[i],
    gt: (i, j) => a[i] > a[j],
    lt: (i, j) => a[i] < a[j],
    ge: (i, j) => a[i] >= a[j],
    le: (i, j) => a[i] <= a[j],
    swap: (i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; },
    set: (i, v) => { a[i] = v; },
  };
}
function compile(src) { return (new Function(src + "\n;return sort;"))(); }
function sortedCopy(d) { return d.slice().sort((x, y) => x - y); }
function eq(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }
function run(fn, data) { const a = data.slice(); fn(a, makeViz(a)); return a; }

const fixtures = [
  [], [1], [2, 1], [5, 3, 8, 1, 9, 2, 7, 4, 6, 0],
  [3, 3, 1, 1, 2, 2], Array.from({ length: 20 }, (_, i) => i),
  Array.from({ length: 20 }, (_, i) => 19 - i),
];

let fail = 0, total = 0;
for (const key of Object.keys(TEMPLATES)) {
  let fn;
  try { fn = compile(TEMPLATES[key]); } catch (e) { console.log(`FAIL ${key}: compile ${e.message}`); fail++; continue; }
  const cases = key === "bogo" ? [[], [1], [3, 1, 2], [2, 1, 3, 0]] : fixtures;
  for (const data of cases) {
    total++;
    let got;
    try { got = run(fn, data); } catch (e) { console.log(`FAIL ${key}: throw ${e.message} on ${JSON.stringify(data)}`); fail++; continue; }
    if (!eq(got, sortedCopy(data))) { fail++; console.log(`FAIL ${key}: ${JSON.stringify(data)} -> ${JSON.stringify(got)}`); }
  }
  if (key !== "bogo") {
    for (let t = 0; t < 30; t++) {
      const n = (Math.random() * 40) | 0;
      const data = Array.from({ length: n }, () => (Math.random() * 100) | 0);
      total++;
      if (!eq(run(fn, data), sortedCopy(data))) { fail++; console.log(`FAIL ${key} random ${JSON.stringify(data)}`); break; }
    }
  }
}
console.log(`${total - fail}/${total} passed`);
process.exit(fail ? 1 : 0);
