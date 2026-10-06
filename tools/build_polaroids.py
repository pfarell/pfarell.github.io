"""Build the About-page polaroids: real <-> pixel pairs + static pixel cards.

Sources:
  assets/img/portrait-real.jpg / portrait-pixel.png
  C:\\Users\\radit\\Downloads\\mobil.jpeg            (Porsche museum photo)
  assets/img/generated2/{porsche-turbo,indy-dusk,mountains}.png
  assets/img/generated2/batman-pixel.png
  assets/img/generated/scene5-satellite.webp
  assets/img/logos/purdue.svg  (rasterised via headless Chromium)

Output: assets/img/polaroids/<slug>-real.webp + <slug>-pixel.webp (pairs)
        assets/img/polaroids/<slug>.webp                     (statics)
"""

import os

from PIL import Image, ImageEnhance
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")
OUT = os.path.join(IMG, "polaroids")
os.makedirs(OUT, exist_ok=True)

W, H = 384, 480  # 4:5
GRID = 48
COLORS = 24


def cover(img, w=W, h=H):
    s = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    left = (img.width - w) // 2
    top = (img.height - h) // 3
    return img.crop((left, top, left + w, top + h))


def pixelate(img, grid=GRID, colors=COLORS):
    small = img.resize((grid, round(grid * img.height / img.width)), Image.LANCZOS)
    small = ImageEnhance.Color(small).enhance(1.15)
    small = ImageEnhance.Contrast(small).enhance(1.05)
    q = small.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    return q.resize((img.width, img.height), Image.NEAREST)


def save(img, name):
    p = os.path.join(OUT, name)
    img.save(p, quality=92)
    return p


# --- rasterise the Purdue logo on white ---
svg = os.path.join(IMG, "logos", "purdue.svg").replace("\\", "/")
tmp_html = os.path.join(os.environ["TEMP"], "opencode", "purdue_raster.html")
with open(tmp_html, "w", encoding="utf-8") as f:
    f.write(
        "<html><body style='margin:0;background:#ffffff;display:flex;align-items:center;"
        "justify-content:center;width:512px;height:640px'>"
        f"<img src='file:///{svg}' style='width:400px'></body></html>"
    )
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 512, "height": 640}, device_scale_factor=1)
    pg.goto("file:///" + tmp_html.replace("\\", "/"))
    pg.wait_for_timeout(600)
    purdue_path = os.path.join(OUT, "_purdue-src.png")
    pg.screenshot(path=purdue_path)
    b.close()

# --- pairs ---
portrait_real = Image.open(os.path.join(IMG, "portrait-real.jpg")).convert("RGB")
portrait_pix = Image.open(os.path.join(IMG, "portrait-pixel.png")).convert("RGB")
box = cover(portrait_real)
real = box
pixel_from_art = portrait_pix.resize((portrait_pix.width, portrait_pix.height), Image.LANCZOS)
# match the same crop window proportionally
s = max(W / portrait_pix.width, H / portrait_pix.height)
pixel_from_art = pixel_from_art.resize((round(portrait_pix.width * s), round(portrait_pix.height * s)), Image.NEAREST)
left = (pixel_from_art.width - W) // 2
top = (pixel_from_art.height - H) // 3
save(real, "portrait-real.webp")
save(pixel_from_art.crop((left, top, left + W, top + H)), "portrait-pixel.webp")

mobil = Image.open(r"C:\Users\radit\Downloads\mobil.jpeg").convert("RGB")
save(cover(mobil), "porsche-museum-real.webp")
save(pixelate(cover(mobil)), "porsche-museum-pixel.webp")

for slug in ("porsche-turbo", "indy-dusk", "mountains"):
    src = Image.open(os.path.join(IMG, "generated2", slug + ".png")).convert("RGB")
    save(cover(src), slug + "-real.webp")
    save(pixelate(cover(src)), slug + "-pixel.webp")

purdue = Image.open(purdue_path).convert("RGB")
save(cover(purdue), "purdue-real.webp")
save(pixelate(cover(purdue), grid=40, colors=16), "purdue-pixel.webp")

# --- statics ---
batman = Image.open(os.path.join(IMG, "generated2", "batman-pixel.png")).convert("RGB")
batman = cover(batman).resize((W, H), Image.NEAREST)
save(batman, "batman.webp")

satellite = Image.open(os.path.join(IMG, "generated", "scene5-satellite.webp")).convert("RGB")
save(cover(satellite).resize((W, H), Image.NEAREST), "satellite.webp")

os.remove(purdue_path)

print("--- polaroid outputs ---")
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(os.path.join(OUT, f)), "bytes")
