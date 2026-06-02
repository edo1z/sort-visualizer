"""全ソートの GIF を生成し、メタ情報から README.md を組み立てる。

    uv run python generate.py
"""

import random
from pathlib import Path

from sortviz.algorithms import ALGOS
from sortviz.meta import META, ORDER
from sortviz.render import render_gif

ROOT = Path(__file__).parent
ASSETS = ROOT / "assets"
N = 40            # バー本数（bogo だけ別途小さく）
DURATION_MS = 110  # 1フレームの表示時間(ms)。大きいほどゆっくり。速くするなら小さく
MAX_FRAMES = 120   # 1つのGIFの最大フレーム数。少ないほど飛ばし気味＝短く速い


def make_values(key):
    if key == "bogo":
        rng = random.Random(7)
        v = list(range(1, 7))
        rng.shuffle(v)
        return v
    rng = random.Random(42)
    v = list(range(1, N + 1))
    rng.shuffle(v)
    return v


def yes_no(b):
    return "✅" if b else "❌"


def build_readme():
    lines = []
    lines.append("# sort-visualizer\n")
    lines.append(
        "代表的なソートアルゴリズムを Python で実装し、**並び替わる様子を GIF にして**"
        "一覧にした図鑑。各アルゴリズムの概要・仕組み・計算量・使いどころ・メリデメを添えている。\n"
    )
    lines.append(
        "> 設計: 各アルゴリズムは「配列の途中状態を `yield` するジェネレータ」、"
        "描画は共通ハーネス。新しいソートはジェネレータを1つ書くだけで GIF と README に載る。\n"
    )
    lines.append("色分け: 🟦 通常 / 🟥 いま注目中（比較・交換）/ 🟩 確定\n")

    # ---- 一覧比較表
    lines.append("## 一覧（よく使われる順）\n")
    lines.append("| # | アルゴリズム | 最良 | 平均 | 最悪 | メモリ | 安定 | in-place | 分類 |")
    lines.append("|---|---|---|---|---|---|:--:|:--:|---|")
    for i, key in enumerate(ORDER, 1):
        m = META[key]
        anchor = key
        lines.append(
            f"| {i} | [{m['name']}](#{anchor}) | {m['best']} | {m['avg']} | {m['worst']} "
            f"| {m['space']} | {yes_no(m['stable'])} | {yes_no(m['in_place'])} | {m['category']} |"
        )
    lines.append("")

    # ---- 個別セクション
    for i, key in enumerate(ORDER, 1):
        m = META[key]
        lines.append(f'<a id="{key}"></a>')
        lines.append(f"## {i}. {m['name']}\n")
        lines.append(f"![{key}](assets/{key}.gif)\n")
        lines.append(f"**分類**: {m['category']}\n")
        lines.append(f"**概要**: {m['desc']}\n")
        if m.get("note"):
            lines.append(f"{m['note']}\n")
        lines.append(
            f"**計算量**: 最良 `{m['best']}` / 平均 `{m['avg']}` / 最悪 `{m['worst']}` "
            f"／ メモリ `{m['space']}` ／ 安定 {yes_no(m['stable'])} ／ in-place {yes_no(m['in_place'])}\n"
        )
        lines.append(f"**どういうときに使うか**: {m['when']}\n")
        lines.append("**メリット**")
        for p in m["pros"]:
            lines.append(f"- {p}")
        lines.append("")
        lines.append("**デメリット**")
        for c in m["cons"]:
            lines.append(f"- {c}")
        lines.append("")
        lines.append("[▲ 一覧へ戻る](#一覧よく使われる順)\n")

    lines.append("---\n")
    lines.append("## 再生成\n")
    lines.append("```bash\nuv sync\nuv run python generate.py   # GIF と README を再生成\n```\n")
    return "\n".join(lines)


def build_gallery():
    """ローカル確認用の単一HTML。ブラウザで開けば全GIFが動いて一覧できる。"""
    cards = []
    for i, key in enumerate(ORDER, 1):
        m = META[key]
        pros = "".join(f"<li>{p}</li>" for p in m["pros"])
        cons = "".join(f"<li>{c}</li>" for c in m["cons"])
        note = f'<p class="note">{m["note"]}</p>' if m.get("note") else ""
        cards.append(f"""
    <section class="card">
      <h2>{i}. {m['name']}</h2>
      <img src="assets/{key}.gif" alt="{key}" loading="lazy">
      <p class="cat">{m['category']}</p>
      <p>{m['desc']}</p>{note}
      <p class="cx">最良 <code>{m['best']}</code> / 平均 <code>{m['avg']}</code>
         / 最悪 <code>{m['worst']}</code> / メモリ <code>{m['space']}</code>
         / 安定 {yes_no(m['stable'])} / in-place {yes_no(m['in_place'])}</p>
      <p class="when"><b>使いどころ:</b> {m['when']}</p>
      <div class="pc">
        <div><b>メリット</b><ul>{pros}</ul></div>
        <div><b>デメリット</b><ul>{cons}</ul></div>
      </div>
    </section>""")
    return f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>sort-visualizer</title>
<style>
  body {{ font-family: system-ui, sans-serif; margin: 0; background:#0f1115; color:#e6e6e6; }}
  header {{ padding: 24px 20px; border-bottom:1px solid #2a2d35; }}
  h1 {{ margin:0 0 6px; }} header p {{ margin:0; color:#9aa0ab; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:18px; padding:20px; }}
  .card {{ background:#171a21; border:1px solid #2a2d35; border-radius:12px; padding:16px; }}
  .card h2 {{ margin:0 0 10px; font-size:1.1rem; }}
  .card img {{ width:100%; border-radius:8px; background:#fafafc; }}
  .cat {{ color:#7aa2f7; font-size:.85rem; margin:8px 0 4px; }}
  .cx {{ color:#9aa0ab; font-size:.82rem; }} .cx code {{ color:#e0af68; }}
  .note {{ color:#9aa0ab; font-size:.8rem; }}
  .when {{ font-size:.9rem; }}
  .pc {{ display:flex; gap:14px; font-size:.85rem; }} .pc ul {{ margin:4px 0; padding-left:18px; }}
  code {{ background:#0f1115; padding:1px 5px; border-radius:4px; }}
</style></head><body>
<header>
  <h1>sort-visualizer</h1>
  <p>ソートアルゴリズム図鑑 — 🟦通常 / 🟥注目中 / 🟩確定 ・ よく使われる順</p>
</header>
<div class="grid">{''.join(cards)}
</div></body></html>"""


def main():
    ASSETS.mkdir(exist_ok=True)
    for key in ORDER:
        values = make_values(key)
        out = ASSETS / f"{key}.gif"
        n_frames = render_gif(ALGOS[key], values, out,
                              duration=DURATION_MS, max_frames=MAX_FRAMES)
        print(f"  {key:10s} -> {out.name}  ({n_frames} frames)")
    # README.md は手書きの最小版を使う（自動生成しない）。
    # 主役はインタラクティブな index.html。GIF はおまけ素材。
    (ROOT / "gallery.html").write_text(build_gallery(), encoding="utf-8")
    print("gallery.html written  (GIFの静的一覧。おまけ)")


if __name__ == "__main__":
    main()
