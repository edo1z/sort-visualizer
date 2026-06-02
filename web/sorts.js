// 各ソートを「配列をその場で並べ替えつつ途中状態を yield するジェネレータ」として実装。
// yield する値: { active:[indices], done:[indices], type:'cmp'|'swap'|'write' }
//   active : いま注目しているインデックス  done : 確定済みインデックス
//   type   : カウンタ用（比較 / 交換 / 書き込み）
// 配列は in-place で変更され、描画側が yield のたびに現在の配列を読む。

function range(lo, hi) { const r = []; for (let i = lo; i < hi; i++) r.push(i); return r; }
function swap(a, i, j) { const t = a[i]; a[i] = a[j]; a[j] = t; }

function* bubble(a) {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    let swapped = false;
    const done = range(n - i, n);
    for (let j = 0; j < n - 1 - i; j++) {
      yield { active: [j, j + 1], done, type: "cmp" };
      if (a[j] > a[j + 1]) { swap(a, j, j + 1); swapped = true; yield { active: [j, j + 1], done, type: "swap" }; }
    }
    if (!swapped) break;
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* cocktail(a) {
  const n = a.length;
  let lo = 0, hi = n - 1, swapped = true;
  while (swapped && lo < hi) {
    swapped = false;
    for (let j = lo; j < hi; j++) {
      yield { active: [j, j + 1], done: [], type: "cmp" };
      if (a[j] > a[j + 1]) { swap(a, j, j + 1); swapped = true; yield { active: [j, j + 1], done: [], type: "swap" }; }
    }
    hi--;
    for (let j = hi; j > lo; j--) {
      yield { active: [j, j - 1], done: [], type: "cmp" };
      if (a[j - 1] > a[j]) { swap(a, j - 1, j); swapped = true; yield { active: [j - 1, j], done: [], type: "swap" }; }
    }
    lo++;
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* comb(a) {
  const n = a.length;
  let gap = n, sorted = false;
  while (!sorted) {
    gap = Math.floor(gap / 1.3);
    if (gap <= 1) { gap = 1; sorted = true; }
    for (let i = 0; i < n - gap; i++) {
      yield { active: [i, i + gap], done: [], type: "cmp" };
      if (a[i] > a[i + gap]) { swap(a, i, i + gap); sorted = false; yield { active: [i, i + gap], done: [], type: "swap" }; }
    }
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* gnome(a) {
  const n = a.length;
  let i = 0;
  while (i < n) {
    if (i === 0 || a[i - 1] <= a[i]) { i++; }
    else {
      yield { active: [i, i - 1], done: [], type: "cmp" };
      swap(a, i, i - 1); yield { active: [i, i - 1], done: [], type: "swap" };
      i--;
    }
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* selection(a) {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    let m = i;
    for (let j = i + 1; j < n; j++) {
      yield { active: [j, m], done: range(0, i), type: "cmp" };
      if (a[j] < a[m]) m = j;
    }
    swap(a, i, m);
    yield { active: [i, m], done: range(0, i + 1), type: "swap" };
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* insertion(a) {
  const n = a.length;
  for (let i = 1; i < n; i++) {
    const key = a[i]; let j = i - 1;
    while (j >= 0 && a[j] > key) {
      yield { active: [j, j + 1], done: [], type: "cmp" };
      a[j + 1] = a[j]; j--; yield { active: [j + 1], done: [], type: "write" };
    }
    a[j + 1] = key; yield { active: [j + 1], done: [], type: "write" };
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* shell(a) {
  const n = a.length;
  let gap = Math.floor(n / 2);
  while (gap > 0) {
    for (let i = gap; i < n; i++) {
      const temp = a[i]; let j = i;
      while (j >= gap && a[j - gap] > temp) {
        yield { active: [j, j - gap], done: [], type: "cmp" };
        a[j] = a[j - gap]; j -= gap; yield { active: [j], done: [], type: "write" };
      }
      a[j] = temp; yield { active: [j], done: [], type: "write" };
    }
    gap = Math.floor(gap / 2);
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* quick(a) {
  yield* quickRec(a, 0, a.length - 1);
  yield { active: [], done: range(0, a.length), type: "write" };
}
function* quickRec(a, lo, hi) {
  if (lo >= hi) return;
  const pivot = a[hi]; let i = lo;
  for (let j = lo; j < hi; j++) {
    yield { active: [j, hi], done: [], type: "cmp" };
    if (a[j] < pivot) { swap(a, i, j); yield { active: [i, j], done: [], type: "swap" }; i++; }
  }
  swap(a, i, hi); yield { active: [i, hi], done: [], type: "swap" };
  yield* quickRec(a, lo, i - 1);
  yield* quickRec(a, i + 1, hi);
}

function* merge(a) {
  yield* mergeRec(a, 0, a.length);
  yield { active: [], done: range(0, a.length), type: "write" };
}
function* mergeRec(a, lo, hi) {
  if (hi - lo <= 1) return;
  const mid = (lo + hi) >> 1;
  yield* mergeRec(a, lo, mid);
  yield* mergeRec(a, mid, hi);
  const left = a.slice(lo, mid), right = a.slice(mid, hi);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) { a[k] = left[i]; i++; } else { a[k] = right[j]; j++; }
    yield { active: [k], done: [], type: "write" }; k++;
  }
  while (i < left.length) { a[k] = left[i]; i++; yield { active: [k], done: [], type: "write" }; k++; }
  while (j < right.length) { a[k] = right[j]; j++; yield { active: [k], done: [], type: "write" }; k++; }
}

function* heap(a) {
  const n = a.length;
  for (let start = (n >> 1) - 1; start >= 0; start--) yield* sift(a, start, n);
  for (let end = n - 1; end > 0; end--) {
    swap(a, 0, end); yield { active: [0, end], done: range(end, n), type: "swap" };
    yield* sift(a, 0, end);
  }
  yield { active: [], done: range(0, n), type: "write" };
}
function* sift(a, root, end) {
  while (true) {
    let child = 2 * root + 1;
    if (child >= end) break;
    if (child + 1 < end && a[child + 1] > a[child]) child++;
    yield { active: [root, child], done: [], type: "cmp" };
    if (a[root] < a[child]) { swap(a, root, child); yield { active: [root, child], done: [], type: "swap" }; root = child; }
    else break;
  }
}

function* timsort(a) {
  const n = a.length, MINRUN = 8;
  for (let lo = 0; lo < n; lo += MINRUN) {
    const hi = Math.min(lo + MINRUN, n);
    for (let i = lo + 1; i < hi; i++) {
      const key = a[i]; let j = i - 1;
      while (j >= lo && a[j] > key) {
        yield { active: [j, j + 1], done: [], type: "cmp" };
        a[j + 1] = a[j]; j--; yield { active: [j + 1], done: [], type: "write" };
      }
      a[j + 1] = key; yield { active: [j + 1], done: [], type: "write" };
    }
  }
  let size = MINRUN;
  while (size < n) {
    for (let lo = 0; lo < n; lo += size * 2) {
      const mid = Math.min(lo + size, n), hi = Math.min(lo + size * 2, n);
      if (mid >= hi) continue;
      const left = a.slice(lo, mid), right = a.slice(mid, hi);
      let i = 0, j = 0, k = lo;
      while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) { a[k] = left[i]; i++; } else { a[k] = right[j]; j++; }
        yield { active: [k], done: [], type: "write" }; k++;
      }
      while (i < left.length) { a[k] = left[i]; i++; yield { active: [k], done: [], type: "write" }; k++; }
      while (j < right.length) { a[k] = right[j]; j++; yield { active: [k], done: [], type: "write" }; k++; }
    }
    size *= 2;
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* counting(a) {
  const n = a.length;
  if (n === 0) return;
  const mx = Math.max(...a);
  const count = new Array(mx + 1).fill(0);
  for (const v of a) count[v]++;
  let out = 0;
  for (let v = 0; v <= mx; v++) {
    while (count[v] > 0) { a[out] = v; yield { active: [out], done: range(0, out), type: "write" }; out++; count[v]--; }
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* radix(a) {
  const n = a.length;
  if (n === 0) return;
  const mx = Math.max(...a); let exp = 1;
  while (Math.floor(mx / exp) > 0) {
    const output = new Array(n).fill(0), count = new Array(10).fill(0);
    for (const v of a) count[Math.floor(v / exp) % 10]++;
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = n - 1; i >= 0; i--) { const d = Math.floor(a[i] / exp) % 10; count[d]--; output[count[d]] = a[i]; }
    for (let i = 0; i < n; i++) { a[i] = output[i]; yield { active: [i], done: [], type: "write" }; }
    exp *= 10;
  }
  yield { active: [], done: range(0, n), type: "write" };
}

function* bucket(a) {
  const n = a.length;
  if (n === 0) return;
  const mx = Math.max(...a);
  const buckets = Array.from({ length: n }, () => []);
  for (const v of a) { const idx = Math.min(Math.floor(v / (mx + 1) * n), n - 1); buckets[idx].push(v); }
  let k = 0;
  for (const b of buckets) {
    b.sort((x, y) => x - y);
    for (const v of b) { a[k] = v; yield { active: [k], done: range(0, k), type: "write" }; k++; }
  }
  yield { active: [], done: range(0, n), type: "write" };
}

// 決定的乱数（bogo を再現可能に）
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function* bogo(a) {
  const n = a.length;
  const rnd = mulberry32(7);
  const isSorted = (x) => { for (let i = 0; i < x.length - 1; i++) if (x[i] > x[i + 1]) return false; return true; };
  let tries = 0;
  while (!isSorted(a) && tries < 100000) {
    yield { active: range(0, n), done: [], type: "cmp" };
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); swap(a, i, j); }
    tries++;
  }
  yield { active: [], done: range(0, n), type: "write" };
}

const SORTS = {
  timsort, quick, merge, heap, insertion,
  counting, radix, bucket,
  shell, selection, bubble, cocktail, comb, gnome, bogo,
};

if (typeof module !== "undefined" && module.exports) module.exports = { SORTS };
