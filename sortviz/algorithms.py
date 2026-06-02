"""各ソートアルゴリズムを「配列の途中状態を yield するジェネレータ」として実装する。

規約:
  各ジェネレータは配列 `a` を **その場で（in-place）** 並べ替えながら、
  意味のあるステップごとに `(active, done)` を yield する。
    active : いま注目している（比較・交換・書き込み中の）インデックスの列
    done   : すでに確定（最終位置に収まった）インデックスの集合
  描画側が yield のたびに `a` のスナップショットを撮るので、
  ここでは配列のコピーを返す必要はない。

非比較ソート（counting/radix/bucket）は、計算結果を a に書き戻す過程を yield する。
"""

import random


# ---------------------------------------------------------------- 比較ソート

def bubble(a):
    n = len(a)
    for i in range(n):
        swapped = False
        for j in range(n - 1 - i):
            yield (j, j + 1), set(range(n - i, n))
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
                yield (j, j + 1), set(range(n - i, n))
        if not swapped:
            break
    yield (), set(range(n))


def cocktail(a):
    n = len(a)
    lo, hi, swapped = 0, n - 1, True
    while swapped and lo < hi:
        swapped = False
        for j in range(lo, hi):
            yield (j, j + 1), set()
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
                yield (j, j + 1), set()
        hi -= 1
        for j in range(hi, lo, -1):
            yield (j, j - 1), set()
            if a[j - 1] > a[j]:
                a[j - 1], a[j] = a[j], a[j - 1]
                swapped = True
                yield (j - 1, j), set()
        lo += 1
    yield (), set(range(n))


def comb(a):
    n = len(a)
    gap, shrink, sorted_ = n, 1.3, False
    while not sorted_:
        gap = int(gap / shrink)
        if gap <= 1:
            gap, sorted_ = 1, True
        for i in range(n - gap):
            yield (i, i + gap), set()
            if a[i] > a[i + gap]:
                a[i], a[i + gap] = a[i + gap], a[i]
                sorted_ = False
                yield (i, i + gap), set()
    yield (), set(range(n))


def gnome(a):
    n, i = len(a), 0
    while i < n:
        if i == 0 or a[i - 1] <= a[i]:
            i += 1
        else:
            yield (i, i - 1), set()
            a[i], a[i - 1] = a[i - 1], a[i]
            yield (i, i - 1), set()
            i -= 1
    yield (), set(range(n))


def selection(a):
    n = len(a)
    for i in range(n):
        m = i
        for j in range(i + 1, n):
            yield (j, m), set(range(i))
            if a[j] < a[m]:
                m = j
        a[i], a[m] = a[m], a[i]
        yield (i, m), set(range(i + 1))
    yield (), set(range(n))


def insertion(a):
    n = len(a)
    for i in range(1, n):
        key, j = a[i], i - 1
        while j >= 0 and a[j] > key:
            yield (j, j + 1), set()
            a[j + 1] = a[j]
            j -= 1
            yield (j + 1,), set()
        a[j + 1] = key
        yield (j + 1,), set()
    yield (), set(range(n))


def shell(a):
    n = len(a)
    gap = n // 2
    while gap > 0:
        for i in range(gap, n):
            temp, j = a[i], i
            while j >= gap and a[j - gap] > temp:
                yield (j, j - gap), set()
                a[j] = a[j - gap]
                j -= gap
                yield (j,), set()
            a[j] = temp
            yield (j,), set()
        gap //= 2
    yield (), set(range(n))


def quick(a):
    yield from _quick(a, 0, len(a) - 1)
    yield (), set(range(len(a)))


def _quick(a, lo, hi):
    if lo >= hi:
        return
    pivot, i = a[hi], lo
    for j in range(lo, hi):
        yield (j, hi), set()
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            yield (i, j), set()
            i += 1
    a[i], a[hi] = a[hi], a[i]
    yield (i, hi), set()
    yield from _quick(a, lo, i - 1)
    yield from _quick(a, i + 1, hi)


def merge(a):
    yield from _merge(a, 0, len(a))
    yield (), set(range(len(a)))


def _merge(a, lo, hi):
    if hi - lo <= 1:
        return
    mid = (lo + hi) // 2
    yield from _merge(a, lo, mid)
    yield from _merge(a, mid, hi)
    left, right = a[lo:mid], a[mid:hi]
    i = j = 0
    k = lo
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            a[k] = left[i]
            i += 1
        else:
            a[k] = right[j]
            j += 1
        yield (k,), set()
        k += 1
    while i < len(left):
        a[k] = left[i]
        i += 1
        yield (k,), set()
        k += 1
    while j < len(right):
        a[k] = right[j]
        j += 1
        yield (k,), set()
        k += 1


def heap(a):
    n = len(a)
    for start in range(n // 2 - 1, -1, -1):
        yield from _sift(a, start, n)
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0]
        yield (0, end), set(range(end, n))
        yield from _sift(a, 0, end)
    yield (), set(range(n))


def _sift(a, root, end):
    while True:
        child = 2 * root + 1
        if child >= end:
            break
        if child + 1 < end and a[child + 1] > a[child]:
            child += 1
        yield (root, child), set()
        if a[root] < a[child]:
            a[root], a[child] = a[child], a[root]
            yield (root, child), set()
            root = child
        else:
            break


def timsort(a):
    """簡略版 Timsort（min-run の挿入ソート → ボトムアップ・マージ）。

    本物の CPython の Timsort は run 検出・galloping・マージ不変条件など
    さらに高度。ここは「挿入ソート＋マージのハイブリッド」という骨子を可視化する版。
    """
    n = len(a)
    MINRUN = 8
    for lo in range(0, n, MINRUN):
        hi = min(lo + MINRUN, n)
        for i in range(lo + 1, hi):
            key, j = a[i], i - 1
            while j >= lo and a[j] > key:
                yield (j, j + 1), set()
                a[j + 1] = a[j]
                j -= 1
                yield (j + 1,), set()
            a[j + 1] = key
            yield (j + 1,), set()
    size = MINRUN
    while size < n:
        for lo in range(0, n, size * 2):
            mid, hi = min(lo + size, n), min(lo + size * 2, n)
            if mid >= hi:
                continue
            left, right = a[lo:mid], a[mid:hi]
            i = j = 0
            k = lo
            while i < len(left) and j < len(right):
                if left[i] <= right[j]:
                    a[k] = left[i]
                    i += 1
                else:
                    a[k] = right[j]
                    j += 1
                yield (k,), set()
                k += 1
            while i < len(left):
                a[k] = left[i]
                i += 1
                yield (k,), set()
                k += 1
            while j < len(right):
                a[k] = right[j]
                j += 1
                yield (k,), set()
                k += 1
        size *= 2
    yield (), set(range(n))


# ------------------------------------------------------------ 非比較ソート

def counting(a):
    n = len(a)
    if n == 0:
        return
    mx = max(a)
    count = [0] * (mx + 1)
    for v in a:
        count[v] += 1
    out = 0
    for v in range(mx + 1):
        while count[v] > 0:
            a[out] = v
            yield (out,), set(range(out))
            out += 1
            count[v] -= 1
    yield (), set(range(n))


def radix(a):
    n = len(a)
    if n == 0:
        return
    mx, exp = max(a), 1
    while mx // exp > 0:
        output = [0] * n
        count = [0] * 10
        for v in a:
            count[(v // exp) % 10] += 1
        for i in range(1, 10):
            count[i] += count[i - 1]
        for i in range(n - 1, -1, -1):
            d = (a[i] // exp) % 10
            count[d] -= 1
            output[count[d]] = a[i]
        for i in range(n):
            a[i] = output[i]
            yield (i,), set()
        exp *= 10
    yield (), set(range(n))


def bucket(a):
    n = len(a)
    if n == 0:
        return
    mx = max(a)
    buckets = [[] for _ in range(n)]
    for v in a:
        idx = min(int(v / (mx + 1) * n), n - 1)
        buckets[idx].append(v)
    k = 0
    for b in buckets:
        b.sort()
        for v in b:
            a[k] = v
            yield (k,), set(range(k))
            k += 1
    yield (), set(range(n))


# --------------------------------------------------------------------- ネタ

def bogo(a):
    n = len(a)
    rng = random.Random(3)

    def is_sorted(x):
        return all(x[i] <= x[i + 1] for i in range(len(x) - 1))

    tries = 0
    while not is_sorted(a) and tries < 3000:
        yield tuple(range(n)), set()
        rng.shuffle(a)
        tries += 1
    yield (), set(range(n))


ALGOS = {
    "timsort": timsort,
    "quick": quick,
    "merge": merge,
    "heap": heap,
    "insertion": insertion,
    "counting": counting,
    "radix": radix,
    "bucket": bucket,
    "shell": shell,
    "selection": selection,
    "bubble": bubble,
    "cocktail": cocktail,
    "comb": comb,
    "gnome": gnome,
    "bogo": bogo,
}
