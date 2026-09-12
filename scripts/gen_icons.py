#!/usr/bin/env python3
"""Generates the extension's PNG icons from scratch with Pillow.

Orange rounded square with a bold white "a" — an original mark (not traced
from Allegro's own logo file), evoking the Allegro brand color/initial per
the user's request rather than a copy of their actual lettermark.
"""
import os

from PIL import Image, ImageDraw, ImageFont

SIZES = [16, 32, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

BG = (255, 90, 0, 255)  # Allegro-style orange
FG = (255, 255, 255, 255)

FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Black.ttf"


def draw_icon(size: int) -> Image.Image:
    scale = 8
    big = size * scale
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Chrome Web Store asks square 128 px icons to keep the actual artwork at
    # 96 px, leaving 16 px of transparent padding on every side. Toolbar sizes
    # stay full-bleed so they remain legible at 16–48 px.
    artwork = big * 0.75 if size == 128 else big
    inset = (big - artwork) / 2
    radius = artwork * 0.22
    draw.rounded_rectangle(
        [inset, inset, big - inset - 1, big - inset - 1],
        radius=radius,
        fill=BG,
    )

    font = ImageFont.truetype(FONT_PATH, int(artwork * 0.68))
    glyph = "a"
    bbox = draw.textbbox((0, 0), glyph, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (big - w) / 2 - bbox[0]
    y = (big - h) / 2 - bbox[1]
    draw.text((x, y), glyph, font=font, fill=FG)

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
