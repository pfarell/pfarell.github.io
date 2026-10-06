"""Build the pixel-art portrait + real-photo pair from the source photo.

Input : C:\\Users\\radit\\Downloads\\farell-photo.jpg
Output: assets/img/portrait-pixel.png/.webp  (nearest-neighbour pixel art)
        assets/img/portrait-real.jpg/.webp   (clean photo for hover reveal)

Usage:
  C:\\Users\\radit\\ComfyUI\\.venv\\Scripts\\python.exe tools\\make_pixel_art.py
"""

import os
import sys

from PIL import Image, ImageEnhance, ImageOps

SRC = os.environ.get("PORTRAIT_SRC", r"C:\Users\radit\Downloads\farell-photo.jpg")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "img")
GRID = 84        # art resolution (pixels across)
SCALE = 8        # nearest-neighbour upscale factor
COLORS = 28      # palette size


def main() -> int:
    if not os.path.isfile(SRC):
        print("SOURCE MISSING:", SRC)
        return 2
    im = Image.open(SRC)
    im = ImageOps.exif_transpose(im).convert("RGB")

    w, h = im.size
    s = min(w, h)
    left = (w - s) // 2
    top = max(0, int((h - s) * 0.30))
    im = im.crop((left, top, left + s, top + s))

    real = im.resize((1000, 1000), Image.LANCZOS)
    real = ImageEnhance.Color(real).enhance(1.06)
    real = ImageEnhance.Contrast(real).enhance(1.03)
    real.save(os.path.join(OUT, "portrait-real.jpg"), quality=88, subsampling=1)
    real.save(os.path.join(OUT, "portrait-real.webp"), quality=88)

    base = im.resize((GRID, GRID), Image.LANCZOS)
    base = ImageEnhance.Color(base).enhance(1.2)
    base = ImageEnhance.Contrast(base).enhance(1.1)
    base = ImageEnhance.Sharpness(base).enhance(1.4)
    art = base.quantize(colors=COLORS, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    big = art.resize((GRID * SCALE, GRID * SCALE), Image.NEAREST)
    big.save(os.path.join(OUT, "portrait-pixel.png"))
    big.save(os.path.join(OUT, "portrait-pixel.webp"), quality=92)

    print("OK", im.size, "->", GRID, "grid,", COLORS, "colors")
    for name in ("portrait-real.jpg", "portrait-pixel.png"):
        p = os.path.join(OUT, name)
        print(name, Image.open(p).size, os.path.getsize(p), "bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
