// Reference sort(a, viz) implementations loaded into the Code editor.
// Comparison sorts use index compares (viz.gt/lt/le); non-comparison sorts use viz.get/set.
const TEMPLATES = {
  bubble: `// Bubble sort: compare neighbors and swap if out of order, sweeping repeatedly
function sort(a, viz) {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (viz.gt(j, j + 1)) { viz.swap(j, j + 1); swapped = true; }
    }
    if (!swapped) break;        // no swaps this pass => already sorted
  }
}`,

  cocktail: `// Cocktail shaker sort: bubble sort that sweeps both directions
function sort(a, viz) {
  let lo = 0, hi = a.length - 1, swapped = true;
  while (swapped && lo < hi) {
    swapped = false;
    for (let j = lo; j < hi; j++) if (viz.gt(j, j + 1)) { viz.swap(j, j + 1); swapped = true; }
    hi--;
    for (let j = hi; j > lo; j--) if (viz.gt(j - 1, j)) { viz.swap(j - 1, j); swapped = true; }
    lo++;
  }
}`,

  comb: `// Comb sort: compare across a large gap that shrinks each pass (improved bubble)
function sort(a, viz) {
  const n = a.length;
  let gap = n, sorted = false;
  while (!sorted) {
    gap = Math.floor(gap / 1.3);
    if (gap <= 1) { gap = 1; sorted = true; }
    for (let i = 0; i + gap < n; i++) {
      if (viz.gt(i, i + gap)) { viz.swap(i, i + gap); sorted = false; }
    }
  }
}`,

  gnome: `// Gnome sort: when out of order, swap and step back one
function sort(a, viz) {
  const n = a.length;
  let i = 0;
  while (i < n) {
    if (i === 0 || viz.le(i - 1, i)) i++;
    else { viz.swap(i - 1, i); i--; }
  }
}`,

  selection: `// Selection sort: pick the min of the unsorted part and move it to the front
function sort(a, viz) {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    let m = i;
    for (let j = i + 1; j < n; j++) if (viz.lt(j, m)) m = j;
    if (m !== i) viz.swap(i, m);
  }
}`,

  insertion: `// Insertion sort: move each element back to its spot via adjacent swaps
function sort(a, viz) {
  const n = a.length;
  for (let i = 1; i < n; i++) {
    for (let j = i; j > 0 && viz.gt(j - 1, j); j--) viz.swap(j - 1, j);
  }
}`,

  shell: `// Shell sort: gapped insertion sort, shrinking the gap each round
function sort(a, viz) {
  const n = a.length;
  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < n; i++) {
      for (let j = i; j >= gap && viz.gt(j - gap, j); j -= gap) viz.swap(j - gap, j);
    }
  }
}`,

  quick: `// Quicksort: partition around the last element as pivot (Lomuto)
function sort(a, viz) {
  function qs(lo, hi) {
    if (lo >= hi) return;
    let i = lo;
    for (let j = lo; j < hi; j++) if (viz.lt(j, hi)) { viz.swap(i, j); i++; }
    viz.swap(i, hi);            // move pivot into place
    qs(lo, i - 1);
    qs(i + 1, hi);
  }
  qs(0, a.length - 1);
}`,

  heap: `// Heap sort: build a max-heap, then extract the max to the end repeatedly
function sort(a, viz) {
  const n = a.length;
  function siftDown(root, end) {
    while (2 * root + 1 < end) {
      let child = 2 * root + 1;
      if (child + 1 < end && viz.lt(child, child + 1)) child++;
      if (viz.lt(root, child)) { viz.swap(root, child); root = child; }
      else break;
    }
  }
  for (let s = (n >> 1) - 1; s >= 0; s--) siftDown(s, n);
  for (let end = n - 1; end > 0; end--) { viz.swap(0, end); siftDown(0, end); }
}`,

  merge: `// Merge sort: split in half, sort each, then merge the two sorted runs
function sort(a, viz) {
  function ms(lo, hi) {
    if (hi - lo <= 1) return;
    const mid = (lo + hi) >> 1;
    ms(lo, mid);
    ms(mid, hi);
    const left = [], right = [];
    for (let i = lo; i < mid; i++) left.push(viz.get(i));
    for (let i = mid; i < hi; i++) right.push(viz.get(i));
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) viz.set(k++, left[i++]);
      else viz.set(k++, right[j++]);
    }
    while (i < left.length) viz.set(k++, left[i++]);
    while (j < right.length) viz.set(k++, right[j++]);
  }
  ms(0, a.length);
}`,

  timsort: `// Simplified Timsort: insertion-sort short runs, then bottom-up merge
function sort(a, viz) {
  const n = a.length, RUN = 8;
  for (let s = 0; s < n; s += RUN) {
    const e = Math.min(s + RUN, n);
    for (let i = s + 1; i < e; i++)
      for (let j = i; j > s && viz.gt(j - 1, j); j--) viz.swap(j - 1, j);
  }
  for (let size = RUN; size < n; size *= 2) {
    for (let lo = 0; lo < n; lo += size * 2) {
      const mid = Math.min(lo + size, n), hi = Math.min(lo + size * 2, n);
      if (mid >= hi) continue;
      const left = [], right = [];
      for (let i = lo; i < mid; i++) left.push(viz.get(i));
      for (let i = mid; i < hi; i++) right.push(viz.get(i));
      let i = 0, j = 0, k = lo;
      while (i < left.length && j < right.length)
        viz.set(k++, left[i] <= right[j] ? left[i++] : right[j++]);
      while (i < left.length) viz.set(k++, left[i++]);
      while (j < right.length) viz.set(k++, right[j++]);
    }
  }
}`,

  counting: `// Counting sort: count each value, then write them back in order (non-comparison)
function sort(a, viz) {
  const n = a.length;
  if (n === 0) return;
  let mx = 0;
  for (let i = 0; i < n; i++) mx = Math.max(mx, viz.get(i));
  const count = new Array(mx + 1).fill(0);
  for (let i = 0; i < n; i++) count[viz.get(i)]++;
  let k = 0;
  for (let v = 0; v <= mx; v++) while (count[v]-- > 0) viz.set(k++, v);
}`,

  radix: `// Radix sort (LSD): stable-sort by each digit from least significant (non-comparison)
function sort(a, viz) {
  const n = a.length;
  if (n === 0) return;
  let mx = 0;
  for (let i = 0; i < n; i++) mx = Math.max(mx, viz.get(i));
  for (let exp = 1; Math.floor(mx / exp) > 0; exp *= 10) {
    const out = new Array(n), cnt = new Array(10).fill(0);
    for (let i = 0; i < n; i++) cnt[Math.floor(viz.get(i) / exp) % 10]++;
    for (let d = 1; d < 10; d++) cnt[d] += cnt[d - 1];
    for (let i = n - 1; i >= 0; i--) { const d = Math.floor(viz.get(i) / exp) % 10; out[--cnt[d]] = viz.get(i); }
    for (let i = 0; i < n; i++) viz.set(i, out[i]);
  }
}`,

  bucket: `// Bucket sort: distribute by range, sort each bucket, then concatenate (non-comparison)
function sort(a, viz) {
  const n = a.length;
  if (n === 0) return;
  let mx = 0;
  for (let i = 0; i < n; i++) mx = Math.max(mx, viz.get(i));
  const buckets = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const v = viz.get(i);
    buckets[Math.min(Math.floor(v / (mx + 1) * n), n - 1)].push(v);
  }
  let k = 0;
  for (const b of buckets) {
    b.sort((x, y) => x - y);
    for (const v of b) viz.set(k++, v);
  }
}`,

  bogo: `// Bogosort (joke): shuffle at random until it happens to be sorted
// NOTE: only finishes for tiny arrays (selecting it shrinks the size to 6)
function sort(a, viz) {
  function isSorted() {
    for (let i = 0; i + 1 < a.length; i++) if (viz.gt(i, i + 1)) return false;
    return true;
  }
  while (!isSorted()) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      viz.swap(i, j);
    }
  }
}`,
};

if (typeof module !== "undefined" && module.exports) module.exports = { TEMPLATES };
