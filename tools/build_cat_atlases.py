from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "cats"

CAT_SOURCES = {
    "sultan": ROOT / "Gatos" / "04-personaje-gato-sultan-sprites-02.png",
    "pipi": ROOT / "Gatos" / "05-personaje-gato-pipi-sprites.png",
    "mia": ROOT / "Gatos" / "06-personaje-gato-mia-02-sprites.png",
    "chichi": ROOT / "Gatos" / "07-personaje-gato-chichi-02-sprites.png",
    "vito": ROOT / "Gatos" / "08-personaje-gato-vito.sprites.png",
    "luna": ROOT / "Gatos" / "09-personaje-gato-luna-03-sprites.png",
    "blanqui": ROOT / "Gatos" / "10-personaje-gato-blanqui-03-sprites.png",
}

WALK_FRAME_COUNT = 6
CELL_W = 520
CELL_H = 220
BODY_H = 180
ALPHA_CUTOFF = 20
EDGE_DILATE = 2

MANUAL_WALK_BOXES = {}

LUNA_WALK_ROW_Y = 77
LUNA_WALK_MASKS = [
    [(75, 183), (75, 100), (100, 28), (180, 0), (282, 3),
     (358, 18), (385, 52), (350, 76), (305, 112), (300, 183)],
    [(330, 183), (333, 118), (353, 58), (405, 12), (480, 0),
     (560, 18), (590, 52), (557, 76), (517, 110), (513, 183)],
    [(555, 183), (558, 118), (578, 58), (630, 12), (705, 0),
     (785, 18), (815, 52), (782, 76), (742, 110), (738, 183)],
    [(780, 183), (783, 118), (803, 58), (855, 12), (930, 0),
     (1010, 18), (1040, 52), (1007, 76), (967, 110), (963, 183)],
    [(1005, 183), (1008, 118), (1028, 58), (1080, 12), (1155, 0),
     (1235, 18), (1265, 52), (1232, 76), (1192, 110), (1188, 183)],
    [(1195, 183), (1200, 112), (1230, 55), (1300, 10), (1390, 0),
     (1450, 20), (1475, 58), (1445, 88), (1410, 122), (1405, 183)],
]


def alpha_bbox(image, cutoff=0):
    return image.getchannel("A").point(lambda p: 255 if p > cutoff else 0).getbbox()


def row_intervals(alpha):
    width, height = alpha.size
    pix = alpha.load()
    flags = [any(pix[x, y] > ALPHA_CUTOFF for x in range(width)) for y in range(height)]
    rows = []
    start = None
    gap = 0
    for y, has_pixels in enumerate(flags):
        if has_pixels:
            if start is None:
                start = y
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= 24:
                end = y - gap + 1
                if end - start >= 80:
                    rows.append((start, end))
                start = None
                gap = 0
    if start is not None:
        rows.append((start, height))
    if not rows:
        raise RuntimeError("Expected at least 1 sprite row, found none")
    return rows


def transparent_bounds(row):
    bbox = alpha_bbox(row, ALPHA_CUTOFF)
    if bbox is None:
        raise RuntimeError("Empty sprite row")
    return bbox


def keep_component_near_center(image):
    width, height = image.size
    alpha = image.getchannel("A").load()
    visited = bytearray(width * height)
    components = []

    for y in range(height):
        row = y * width
        for x in range(width):
            idx = row + x
            if visited[idx] or alpha[x, y] <= ALPHA_CUTOFF:
                continue
            queue = deque([(x, y)])
            visited[idx] = 1
            points = []
            while queue:
                cx, cy = queue.popleft()
                points.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if visited[nidx] or alpha[nx, ny] <= ALPHA_CUTOFF:
                        continue
                    visited[nidx] = 1
                    queue.append((nx, ny))

            if len(points) >= 450:
                xs = [p[0] for p in points]
                ys = [p[1] for p in points]
                components.append({
                    "points": points,
                    "area": len(points),
                    "bbox": (min(xs), min(ys), max(xs) + 1, max(ys) + 1),
                })

    if not components:
        return trim_to_alpha(image)

    center_x = width * 0.5
    center_y = height * 0.55

    def score(component):
        x0, y0, x1, y1 = component["bbox"]
        cx = (x0 + x1) * 0.5
        cy = (y0 + y1) * 0.5
        distance = abs(cx - center_x) * 0.8 + abs(cy - center_y) * 0.25
        return component["area"] - distance * 80

    chosen = max(components, key=score)
    keep = bytearray(width * height)
    for x, y in chosen["points"]:
        keep[y * width + x] = 1

    for _ in range(EDGE_DILATE):
        expanded = bytearray(keep)
        for y in range(height):
            row = y * width
            for x in range(width):
                idx = row + x
                if not keep[idx]:
                    continue
                if x > 0:
                    expanded[idx - 1] = 1
                if x + 1 < width:
                    expanded[idx + 1] = 1
                if y > 0:
                    expanded[idx - width] = 1
                if y + 1 < height:
                    expanded[idx + width] = 1
        keep = expanded

    cleaned = image.copy()
    pixels = cleaned.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            if keep[row + x]:
                continue
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)
    return trim_to_alpha(cleaned)


def row_components(source, row_box):
    x0, y0, x1, y1 = row_box
    row = source.crop(row_box)
    width, height = row.size
    alpha = row.getchannel("A").load()
    visited = bytearray(width * height)
    components = []

    for y in range(height):
        offset = y * width
        for x in range(width):
            idx = offset + x
            if visited[idx] or alpha[x, y] <= ALPHA_CUTOFF:
                continue
            queue = deque([(x, y)])
            visited[idx] = 1
            points = []
            while queue:
                cx, cy = queue.popleft()
                points.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if visited[nidx] or alpha[nx, ny] <= ALPHA_CUTOFF:
                        continue
                    visited[nidx] = 1
                    queue.append((nx, ny))

            if len(points) < 5000:
                continue
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            bbox = (x0 + min(xs), y0 + min(ys), x0 + max(xs) + 1, y0 + max(ys) + 1)
            if bbox[2] - bbox[0] < 90 or bbox[3] - bbox[1] < 70:
                continue
            components.append({"area": len(points), "bbox": bbox, "points": points, "origin": (x0, y0)})

    components.sort(key=lambda item: item["bbox"][0])
    return components


def component_image(source, component):
    x0, y0, x1, y1 = component["bbox"]
    ox, oy = component["origin"]
    pad = 3
    x0p = max(0, x0 - pad)
    y0p = max(0, y0 - pad)
    x1p = min(source.width, x1 + pad)
    y1p = min(source.height, y1 + pad)
    width = x1p - x0p
    height = y1p - y0p
    crop = source.crop((x0p, y0p, x1p, y1p))
    keep = bytearray(width * height)

    for x, y in component["points"]:
        sx = ox + x - x0p
        sy = oy + y - y0p
        if 0 <= sx < width and 0 <= sy < height:
            keep[sy * width + sx] = 1

    for _ in range(EDGE_DILATE):
        expanded = bytearray(keep)
        for y in range(height):
            row = y * width
            for x in range(width):
                idx = row + x
                if not keep[idx]:
                    continue
                if x > 0:
                    expanded[idx - 1] = 1
                if x + 1 < width:
                    expanded[idx + 1] = 1
                if y > 0:
                    expanded[idx - width] = 1
                if y + 1 < height:
                    expanded[idx + width] = 1
        keep = expanded

    pixels = crop.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            if keep[row + x]:
                continue
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)
    return trim_to_alpha(crop)


def trim_to_alpha(image):
    bbox = alpha_bbox(image, 0)
    if bbox is None:
        raise RuntimeError("Empty frame")
    return image.crop(bbox)


def masked_luna_walk_frames(source):
    frames = []
    for polygon in LUNA_WALK_MASKS:
        global_polygon = [(x, y + LUNA_WALK_ROW_Y) for x, y in polygon]
        xs = [x for x, _ in global_polygon]
        ys = [y for _, y in global_polygon]
        pad = 10
        box = (
            max(0, min(xs) - pad),
            max(0, min(ys) - pad),
            min(source.width, max(xs) + pad),
            min(source.height, max(ys) + pad),
        )
        crop = source.crop(box)
        mask = Image.new("L", crop.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.polygon([(x - box[0], y - box[1]) for x, y in global_polygon], fill=255)

        alpha = crop.getchannel("A")
        crop.putalpha(Image.composite(alpha, Image.new("L", crop.size, 0), mask))
        frames.append(trim_to_alpha(crop))
    return frames


def frames_from_row(source, row_box, count):
    x0, y0, x1, y1 = row_box
    row = source.crop(row_box)
    bx0, _, bx1, _ = transparent_bounds(row)
    content_x0 = x0 + bx0
    content_x1 = x0 + bx1
    step = (content_x1 - content_x0) / count
    crop_w = min(source.width, max(260, min(380, step * 1.45)))
    frames = []
    for index in range(count):
        cx = content_x0 + step * (index + 0.5)
        left = round(max(0, min(source.width - crop_w, cx - crop_w / 2)))
        right = round(min(source.width, left + crop_w))
        crop = source.crop((left, y0, right, y1))
        frames.append(keep_component_near_center(crop))
    return frames


def walk_frames(source, cat_id, row_box):
    if cat_id in MANUAL_WALK_BOXES:
        return [trim_to_alpha(source.crop(box)) for box in MANUAL_WALK_BOXES[cat_id]]

    components = row_components(source, row_box)
    if len(components) >= 4:
        return [component_image(source, component) for component in components[:WALK_FRAME_COUNT]]

    return frames_from_row(source, row_box, WALK_FRAME_COUNT)


def build_cat_atlas(cat_id, path):
    source = Image.open(path).convert("RGBA")
    rows = row_intervals(source.getchannel("A"))
    frames = walk_frames(source, cat_id, (0, rows[0][0], source.width, rows[0][1]))

    scale = BODY_H / frames[0].height
    atlas = Image.new("RGBA", (CELL_W * len(frames), CELL_H), (0, 0, 0, 0))
    sizes = []
    for index, frame in enumerate(frames):
        width = round(frame.width * scale)
        height = round(frame.height * scale)
        if width > CELL_W or height > CELL_H:
            raise RuntimeError(f"{cat_id} frame {index} does not fit: {width}x{height}")
        normalized = frame.resize((width, height), Image.Resampling.LANCZOS)
        x = index * CELL_W + (CELL_W - width) // 2
        y = CELL_H - height
        atlas.alpha_composite(normalized, (x, y))
        sizes.append(f"{index}:{width}x{height}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{cat_id}-atlas.png"
    atlas.save(out)
    print(f"{cat_id}: wrote {out.relative_to(ROOT)} ({len(frames)} walk frames, cell {CELL_W}x{CELL_H})")
    print(f"  rows: {rows}")
    print(f"  sizes: {', '.join(sizes)}")


def main():
    for cat_id, path in CAT_SOURCES.items():
        build_cat_atlas(cat_id, path)


if __name__ == "__main__":
    main()
