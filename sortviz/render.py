"""Shared harness that turns a generator's state stream into a GIF.

Neon theme (matches the web app): dark background, cyan->magenta value gradient,
white = active (compare/swap/write), green = sorted.
"""

import colorsys

from PIL import Image, ImageDraw

BG = (11, 18, 38)
ACTIVE = (255, 255, 255)
DONE = (57, 255, 20)


def _bar_color(v, mx):
    # hue 188deg (cyan) -> 320deg (magenta), like the canvas renderer
    h = (188 + (v / mx) * 132) / 360.0
    r, g, b = colorsys.hsv_to_rgb(h, 0.8, 0.95)
    return (round(r * 255), round(g * 255), round(b * 255))


def _draw(snapshot, active, done, width, height, pad):
    n = len(snapshot)
    img = Image.new("RGB", (width, height), BG)
    d = ImageDraw.Draw(img)
    bw = width / n
    mx = max(snapshot) if snapshot else 1
    usable = height - 2 * pad
    for i, v in enumerate(snapshot):
        x0 = round(i * bw)
        x1 = round((i + 1) * bw) - 1
        bh = v / mx * usable
        y0 = height - pad - bh
        if i in done:
            col = DONE
        elif i in active:
            col = ACTIVE
        else:
            col = _bar_color(v, mx)
        d.rectangle([x0, y0, max(x0, x1), height - pad], fill=col)
    return img


def render_gif(gen_factory, values, path, *, width=720, height=400, pad=8,
               max_frames=160, duration=40, hold=18):
    """gen_factory(a) を回して GIF を path に書き出す。

    max_frames を超える状態列は等間隔で間引く（最後のフレームは必ず残す）。
    hold = 最終フレームを何枚分静止させるか。
    """
    a = list(values)
    frames = [(list(a), set(), set())]  # 初期状態
    for active, done in gen_factory(a):
        frames.append((list(a), set(active), set(done)))

    if len(frames) > max_frames:
        last = len(frames) - 1
        step = last / (max_frames - 1)
        keep = sorted({round(i * step) for i in range(max_frames)} | {last})
        frames = [frames[i] for i in keep]

    images = [_draw(snap, active, done, width, height, pad) for snap, active, done in frames]
    images += [images[-1]] * hold

    images[0].save(
        path, save_all=True, append_images=images[1:],
        duration=duration, loop=0, optimize=True, disposal=2,
    )
    return len(frames)
