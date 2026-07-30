from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "natalia"
OUT_PATH = OUT_DIR / "natalia-atlas.png"
WALK_SHEET = ROOT / "personajes" / "Natalia-walk.png"
RUN_SHEET = ROOT / "personajes" / "Natalia-run.png"
JUMP_SOURCE_IMAGE = ROOT / "personajes" / "sprite-max-px-frames-25-rows-5-cols-5 (3).png"

SHEET_COLS = 5
SHEET_ROWS = 5
SHEET_CELL_W = 256
SHEET_CELL_H = 256

JUMP_FRAME_SOURCES = [
    ("jump0", (470, 720, 670, 992)),
    ("jump1", (664, 720, 842, 959)),
    ("jump2", (820, 720, 1065, 965)),
]

CELL_W = 520
CELL_H = 640
ATLAS_COLS = SHEET_COLS * SHEET_ROWS
BODY_H = 620
JUMP_BODY_H = 430
DETECT_ALPHA = 20
EDGE_DILATE = 2


def trim_to_alpha(image):
    bbox = image.getchannel("A").point(lambda p: 255 if p > 0 else 0).getbbox()
    if bbox is None:
        raise RuntimeError("Empty frame after cleanup")
    return image.crop(bbox)


def clear_transparent_pixels(image):
    cleaned = image.copy()
    pixels = cleaned.load()
    for y in range(cleaned.height):
        for x in range(cleaned.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                pixels[x, y] = (r, g, b, a)
    return cleaned


def keep_main_component(image):
    width, height = image.size
    alpha = image.getchannel("A").load()
    visited = bytearray(width * height)
    best = []

    for y in range(height):
        row = y * width
        for x in range(width):
            idx = row + x
            if visited[idx] or alpha[x, y] <= DETECT_ALPHA:
                continue

            component = []
            queue = deque([(x, y)])
            visited[idx] = 1
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if visited[nidx] or alpha[nx, ny] <= DETECT_ALPHA:
                        continue
                    visited[nidx] = 1
                    queue.append((nx, ny))

            if len(component) > len(best):
                best = component

    if not best:
        raise RuntimeError("No visible component found")

    keep = bytearray(width * height)
    for x, y in best:
        keep[y * width + x] = 1

    for _ in range(EDGE_DILATE):
        expanded = bytearray(keep)
        for y in range(height):
            for x in range(width):
                if not keep[y * width + x]:
                    continue
                if x > 0:
                    expanded[y * width + x - 1] = 1
                if x + 1 < width:
                    expanded[y * width + x + 1] = 1
                if y > 0:
                    expanded[(y - 1) * width + x] = 1
                if y + 1 < height:
                    expanded[(y + 1) * width + x] = 1
        keep = expanded

    cleaned = image.copy()
    pixels = cleaned.load()
    for y in range(height):
        for x in range(width):
            if keep[y * width + x]:
                continue
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)

    return trim_to_alpha(cleaned)


def extract_grid_sheet(path, prefix):
    source = Image.open(path).convert("RGBA")
    frames = []
    expected_size = (SHEET_COLS * SHEET_CELL_W, SHEET_ROWS * SHEET_CELL_H)
    if source.size != expected_size:
        raise RuntimeError(f"{path.name} must be {expected_size[0]}x{expected_size[1]}, got {source.size}")

    for row in range(SHEET_ROWS):
        for col in range(SHEET_COLS):
            index = row * SHEET_COLS + col
            cell = source.crop((
                col * SHEET_CELL_W,
                row * SHEET_CELL_H,
                (col + 1) * SHEET_CELL_W,
                (row + 1) * SHEET_CELL_H,
            ))
            frames.append((f"{prefix}{index}", trim_to_alpha(clear_transparent_pixels(cell))))
    return frames


def extract_jump_frames():
    source = Image.open(JUMP_SOURCE_IMAGE).convert("RGBA")
    frames = []
    for name, box in JUMP_FRAME_SOURCES:
        frame = keep_main_component(source.crop(box))
        frames.append((name, frame))
    return frames


def paste_normalized_row(atlas, frames, atlas_row, body_h):
    max_frame_h = max(frame.height for _, frame in frames)
    scale = body_h / max_frame_h
    normalized_sizes = []

    for index, (name, frame) in enumerate(frames):
        width = round(frame.width * scale)
        height = round(frame.height * scale)
        if width > CELL_W or height > CELL_H:
            raise RuntimeError(f"{name} does not fit in {CELL_W}x{CELL_H}: {width}x{height}")

        normalized = clear_transparent_pixels(frame).resize((width, height), Image.Resampling.LANCZOS)
        x = index * CELL_W + (CELL_W - width) // 2
        y = atlas_row * CELL_H + CELL_H - height
        atlas.alpha_composite(normalized, (x, y))
        normalized_sizes.append(f"{name}:{width}x{height}")

    return normalized_sizes


def build_atlas():
    walk_frames = extract_grid_sheet(WALK_SHEET, "walk")
    run_frames = extract_grid_sheet(RUN_SHEET, "run")
    jump_frames = extract_jump_frames()
    atlas = Image.new("RGBA", (CELL_W * ATLAS_COLS, CELL_H * 3), (0, 0, 0, 0))

    walk_sizes = paste_normalized_row(atlas, walk_frames, 0, BODY_H)
    run_sizes = paste_normalized_row(atlas, run_frames, 1, BODY_H)
    jump_sizes = paste_normalized_row(atlas, jump_frames, 2, JUMP_BODY_H)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT_PATH)
    print(f"Wrote {OUT_PATH.relative_to(ROOT)}")
    print(f"Walk source: {WALK_SHEET.relative_to(ROOT)}")
    print(f"Run source: {RUN_SHEET.relative_to(ROOT)}")
    print(f"Jump source: {JUMP_SOURCE_IMAGE.relative_to(ROOT)}")
    print(f"Sheet cells: {SHEET_COLS}x{SHEET_ROWS} of {SHEET_CELL_W}x{SHEET_CELL_H}")
    print(f"Atlas cells: {CELL_W}x{CELL_H}, {ATLAS_COLS} columns x 3 rows")
    print("Walk frames:", ", ".join(name for name, _ in walk_frames))
    print("Run frames:", ", ".join(name for name, _ in run_frames))
    print("Jump frames:", ", ".join(name for name, _ in jump_frames))
    print("Normalized walk sizes:", ", ".join(walk_sizes))
    print("Normalized run sizes:", ", ".join(run_sizes))
    print("Normalized jump sizes:", ", ".join(jump_sizes))


if __name__ == "__main__":
    build_atlas()
