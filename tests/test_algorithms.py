"""全アルゴリズムが「実際に正しく並べ替える」ことを検証する。

ジェネレータを最後まで回した後の配列が、Python 標準の sorted() と一致するか。
ネタの bogo も小さい入力なら最終的に整列する（確率1で停止する範囲で確認）。
"""

import random

import pytest

from sortviz.algorithms import ALGOS

COMPARISON = [k for k in ALGOS if k != "bogo"]


def run(key, data):
    a = list(data)
    for _ in ALGOS[key](a):  # ジェネレータを最後まで消費（in-place で a が並ぶ）
        pass
    return a


@pytest.mark.parametrize("key", COMPARISON)
@pytest.mark.parametrize(
    "data",
    [
        [],
        [1],
        [2, 1],
        [5, 3, 8, 1, 9, 2, 7, 4, 6, 0],
        [3, 3, 1, 1, 2, 2],            # 重複
        list(range(20)),               # 整列済み
        list(range(20, 0, -1)),        # 逆順
    ],
)
def test_sorts_correctly(key, data):
    assert run(key, data) == sorted(data)


@pytest.mark.parametrize("key", COMPARISON)
def test_random_inputs(key):
    rng = random.Random(123)
    for _ in range(20):
        data = [rng.randint(0, 50) for _ in range(rng.randint(0, 30))]
        assert run(key, data) == sorted(data)


def test_bogo_eventually_sorts_small_input():
    # 小さい入力なら確率的に必ず整列して停止する
    assert run("bogo", [3, 1, 2, 5, 4]) == [1, 2, 3, 4, 5]
