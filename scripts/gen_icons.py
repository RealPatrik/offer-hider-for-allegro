#!/usr/bin/env python3
"""Generates the extension's PNG icons from scratch with Pillow.

Simple flat mark: a dark rounded square with a light eye-slash glyph,
matching the hide icon used in the content-script UI.
"""
import math
import os

from PIL import Image, ImageDraw

SIZES = [16, 32, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

BG = (30, 32, 36, 255)
FG = (255, 255, 255, 255)


def draw_icon(size: int) -> Image.Image:
    scale = 8
    big = size * scale
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = big * 0.22
    draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=BG)

    cx, cy = big / 2, big / 2
    r = big * 0.30
    stroke = max(2, round(big * 0.052))

    # Eye arc: two bezier-ish arcs approximated via arc() for the lids.
    bbox = [cx - r, cy - r * 0.62, cx + r, cy + r * 0.62]
    draw.arc(bbox, start=200, end=340, fill=FG, width=stroke)
    draw.arc(bbox, start=20, end=160, fill=FG, width=stroke)

    # Slash through the eye.
    dx = r * 1.05
    dy = r * 1.05
    draw.line(
        [(cx - dx, cy - dy * 0.55), (cx + dx, cy + dy * 0.55)],
        fill=FG,
        width=stroke,
    )

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        icon = draw_icon(size)
        path = os.path.join(OUT_DIR, f"{size}.png")
        icon.save(path)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
