"""Build the 1200x630 Open Graph image: sky background + text + pixel portrait.

Fonts (OFL) are expected in tools/fonts/:
  LibreBaskerville-Italic.ttf, Geist[wght].ttf
Download hints:
  https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville-Italic.ttf
  https://raw.githubusercontent.com/google/fonts/main/ofl/geist/Geist%5Bwght%5D.ttf
"""

import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(BASE, "assets", "img")
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

INK = (28, 33, 29)
MUTED = (96, 101, 97)
ACCENT = (14, 165, 233)
W, H = 1200, 630


def font(name, size, fallback):
    path = os.path.join(FONTS, name)
    if os.path.isfile(path):
        return ImageFont.truetype(path, size)
    return ImageFont.truetype(fallback, size)


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255
    )
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


sky = Image.open(os.path.join(IMG, "generated", "sky.png")).convert("RGB")
scale = max(W / sky.width, H / sky.height)
sky = sky.resize((round(sky.width * scale), round(sky.height * scale)), Image.LANCZOS)
left = (sky.width - W) // 2
canvas = sky.crop((left, 0, left + W, H))

veil = Image.new("RGBA", (W, H), (248, 249, 248, 0))
vd = ImageDraw.Draw(veil)
for x in range(W):
    a = max(0, int(215 - (x / W) * 215))
    vd.line([(x, 0), (x, H)], fill=(248, 249, 248, a))
canvas = Image.alpha_composite(canvas.convert("RGBA"), veil).convert("RGB")

d = ImageDraw.Draw(canvas)
f_serif = font("LibreBaskerville-Italic[wght].ttf", 76, r"C:\Windows\Fonts\georgiai.ttf")
f_sans = font("Geist[wght].ttf", 31, r"C:\Windows\Fonts\segoeui.ttf")
f_small = font("Geist[wght].ttf", 24, r"C:\Windows\Fonts\segoeui.ttf")

d.text((80, 158), "Praditya Farell", font=f_serif, fill=INK)
d.text((84, 268), "Artificial Intelligence @ Purdue", font=f_sans, fill=INK)
d.text((84, 318), "Local-first AI tools \u00b7 OpenVoice \u00b7 Ripple", font=f_small, fill=MUTED)
d.text((84, 532), "pfarell.dev", font=f_small, fill=ACCENT)

portrait = Image.open(os.path.join(IMG, "portrait-pixel.png")).convert("RGB")
portrait = portrait.resize((340, 340), Image.NEAREST)
card = Image.new("RGBA", (388, 388), (0, 0, 0, 0))
frame = rounded(Image.new("RGBA", (388, 388), (255, 255, 255, 255)), 40)
card.paste(frame, (0, 0), frame)
card.paste(portrait, (24, 24))
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
shadow.paste(card, (756, 128), card)
shadow = shadow.filter(ImageFilter.GaussianBlur(22))
canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")
canvas.paste(card, (756, 121), card)

out = os.path.join(IMG, "og.png")
canvas.save(out)
print("saved", out, canvas.size, os.path.getsize(out), "bytes")
