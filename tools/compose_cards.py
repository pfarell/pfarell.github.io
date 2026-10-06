import os

from PIL import Image, ImageDraw, ImageFilter

BASE = r"C:\Users\radit\Documents\Rocky\portfolio-farell\assets\img"
P = os.path.join(BASE, "projects")


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255
    )
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def with_shadow(img, blur=16, alpha=64, dy=12, radius=24):
    pad = blur * 3
    shadow = Image.new("RGBA", (img.size[0] + pad * 2, img.size[1] + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", img.size, (0, 0, 0, alpha))
    sh.putalpha(rounded(sh, radius).getchannel("A"))
    shadow.paste(sh, (pad, pad + dy), sh)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    shadow.paste(img, (pad, pad), img)
    return shadow


def fit(img, w, h=None):
    if h is None:
        h = round(img.size[1] * w / img.size[0])
    return img.resize((w, h), Image.LANCZOS)


def load(path, mode="RGB"):
    return Image.open(os.path.join(P, path)).convert(mode)


def linear_bg(size, top, bottom):
    w, h = size
    bg = Image.new("RGB", size, top)
    d = ImageDraw.Draw(bg)
    for y in range(h):
        t = y / max(h - 1, 1)
        color = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (w, y)], fill=color)
    return bg


# --- OpenVoice card: dark brand canvas with the real launch title card and pill ---
canvas = Image.new("RGB", (1200, 800), (11, 11, 15))
hero = rounded(fit(load("openvoice-hero.png"), 780), 28)
hs = with_shadow(hero, dy=16)
canvas.paste(hs, (600 - hs.size[0] // 2, 108 - 48), hs)
pill = rounded(fit(load("openvoice-pill.png"), 330), 22)
ps = with_shadow(pill, dy=10)
canvas.paste(ps, (600 - ps.size[0] // 2, 520 - 48), ps)
icon = rounded(fit(load("openvoice-icon.png", "RGBA"), 96), 24)
canvas.paste(icon, (64, 64), icon)
canvas.save(os.path.join(P, "card-openvoice.png"))
canvas.save(os.path.join(P, "card-openvoice.webp"), quality=88)

# --- Ripple card: soft map-blue canvas with the real app screens ---
canvas = linear_bg((1200, 800), (238, 243, 249), (219, 230, 241))
assistant = rounded(fit(load("ripple-assistant.png"), 880), 26)
ash = with_shadow(assistant, dy=14)
canvas.paste(ash, (36 - 48, 140 - 48), ash)
mobile = rounded(fit(load("ripple-mobile.png"), 218), 22)
msh = with_shadow(mobile, dy=12)
canvas.paste(msh, (974 - 48, 170 - 48), msh)
lake = rounded(fit(load("ripple-lake3d.png"), 360), 20)
lsh = with_shadow(lake, dy=10)
canvas.paste(lsh, (700 - 48, 560 - 48), lsh)
canvas.save(os.path.join(P, "card-ripple.png"))
canvas.save(os.path.join(P, "card-ripple.webp"), quality=88)

for name in ("card-openvoice.png", "card-openvoice.webp", "card-ripple.png", "card-ripple.webp"):
    path = os.path.join(P, name)
    im = Image.open(path)
    print(name, im.size, os.path.getsize(path))
