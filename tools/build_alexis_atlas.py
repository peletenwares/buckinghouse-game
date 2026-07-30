from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "personajes" / "02-personaje-alexis-03.png"
OUTPUT = ROOT / "assets" / "alexis" / "alexis-kick-atlas.png"

# The source sheet is not a uniform grid: the ball and soft edges make some
# silhouettes touch. These ranges isolate the five Alexis poses in order.
FRAME_RANGES = [
    (0, 230),
    (230, 485),
    (485, 800),
    (760, 1168),
    (1168, 1425),
]

ALPHA_THRESHOLD = 8
PAD = 4
CELL_W = 320
CELL_H = 360
BODY_H = 320
BASELINE = CELL_H - 2
MIN_COMPONENT_PIXELS = 80
LOW_ALPHA_CUTOFF = 8


def alpha_bbox(img, x0, x1):
    alpha = img.getchannel("A")
    pix = alpha.load()
    xs = []
    ys = []
    for y in range(img.height):
        for x in range(max(0, x0), min(img.width, x1)):
            if pix[x, y] > ALPHA_THRESHOLD:
                xs.append(x)
                ys.append(y)
    if not xs:
        raise RuntimeError(f"No visible pixels in range {x0}-{x1}")

    return (
        max(0, x0, min(xs) - PAD),
        max(0, min(ys) - PAD),
        min(img.width, x1, max(xs) + 1 + PAD),
        min(img.height, max(ys) + 1 + PAD),
    )


def remove_small_components(img):
    alpha = img.getchannel("A")
    pix = alpha.load()
    width, height = img.size
    seen = bytearray(width * height)
    transparent = (0, 0, 0, 0)

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if seen[idx] or pix[x, y] <= ALPHA_THRESHOLD:
                continue
            queue = [(x, y)]
            seen[idx] = 1
            pixels = []
            for qx, qy in queue:
                pixels.append((qx, qy))
                for nx, ny in ((qx + 1, qy), (qx - 1, qy), (qx, qy + 1), (qx, qy - 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        nidx = ny * width + nx
                        if not seen[nidx] and pix[nx, ny] > ALPHA_THRESHOLD:
                            seen[nidx] = 1
                            queue.append((nx, ny))
            if len(pixels) < MIN_COMPONENT_PIXELS:
                for px, py in pixels:
                    img.putpixel((px, py), transparent)


def drop_low_alpha(img):
    pix = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pix[x, y]
            if 0 < a <= LOW_ALPHA_CUTOFF:
                pix[x, y] = (0, 0, 0, 0)


def main():
    src = Image.open(SOURCE).convert("RGBA")
    atlas = Image.new("RGBA", (CELL_W * len(FRAME_RANGES), CELL_H), (0, 0, 0, 0))
    info = []

    for i, (x0, x1) in enumerate(FRAME_RANGES):
        box = alpha_bbox(src, x0, x1)
        frame = src.crop(box)
        remove_small_components(frame)
        scale = BODY_H / frame.height
        draw_w = round(frame.width * scale)
        draw_h = BODY_H
        if draw_w > CELL_W:
            scale = CELL_W / frame.width
            draw_w = CELL_W
            draw_h = round(frame.height * scale)
        frame = frame.resize((draw_w, draw_h), Image.Resampling.LANCZOS)
        drop_low_alpha(frame)
        dx = i * CELL_W + (CELL_W - draw_w) // 2
        dy = BASELINE - draw_h
        atlas.alpha_composite(frame, (dx, dy))
        info.append((i, box, draw_w, draw_h, dx - i * CELL_W, dy))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT)
    print(f"Wrote {OUTPUT}")
    print(f"cell={CELL_W}x{CELL_H} frames={len(FRAME_RANGES)} body={BODY_H} baseline={BASELINE}")
    for i, box, draw_w, draw_h, dx, dy in info:
        print(f"frame {i}: source={box} normalized={draw_w}x{draw_h} offset=({dx},{dy})")


if __name__ == "__main__":
    main()
