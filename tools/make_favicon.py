"""Generate favicons: a dark rounded tile with a green pixel 'F'."""

import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "img")

F = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
]


def draw_icon(size: int) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 4, fill=(28, 33, 29, 255))
    cell = size // 9
    ox = (size - 5 * cell) // 2
    oy = (size - 6 * cell) // 2
    for r, row in enumerate(F):
        for c, v in enumerate(row):
            if v:
                d.rectangle(
                    [ox + c * cell, oy + r * cell, ox + (c + 1) * cell - 1, oy + (r + 1) * cell - 1],
                    fill=(14, 165, 233, 255),
                )
    return im


for size, name in ((64, "favicon.png"), (180, "favicon-180.png")):
    icon = draw_icon(size)
    icon.save(os.path.join(OUT, name))
    print(name, icon.size)
