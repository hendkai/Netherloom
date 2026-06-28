#!/usr/bin/env python3
"""Bake pet-specific, full-canvas gear layers used by the browser renderer."""

from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ITEMS = ROOT / "src/assets/sprites/items"
OUTPUT = ROOT / "public/pet-variants"
LEGACY_OUTPUT = ROOT / "src/assets/sprites/pet-variants"
CANVAS = 224

DEFAULT = {
    "headwear": (50, 28, 0.36, 0),
    "eyewear": (50, 45, 0.34, 0),
    "neckwear": (50, 59, 0.34, 0),
    "pendant": (50, 65, 0.24, 0),
    "back": (67, 51, 0.34, 0),
    "sleep": (66, 24, 0.30, 0),
}

# These layouts are authoring data only. The app ships the resulting images
# and performs no coordinate-based item placement in the browser.
LAYOUTS = {
    "axolotl": {"headwear": (49, 29, .34, 0), "eyewear": (49, 45, .31, 0), "neckwear": (50, 58, .30, 0), "pendant": (50, 65, .21, 0), "back": (67, 54, .31, 0)},
    "bat": {"headwear": (50, 30, .32, 0), "eyewear": (50, 45, .27, 0), "neckwear": (50, 57, .27, 0), "pendant": (50, 64, .20, 0), "back": (69, 50, .28, 0)},
    "bee": {"headwear": (31, 35, .30, -5), "eyewear": (31, 50, .27, 0), "neckwear": (42, 59, .26, -8), "pendant": (43, 65, .19, 0), "back": (69, 36, .30, 0), "sleep": (42, 21, .27, 0)},
    "capybara": {"headwear": (37, 30, .31, -5), "eyewear": (34, 42, .25, 0), "neckwear": (45, 54, .31, 0), "pendant": (45, 62, .21, 0), "back": (64, 47, .34, 0), "sleep": (46, 18, .28, 0)},
    "cat": {"headwear": (42, 29, .32, 0), "eyewear": (42, 43, .29, 0), "neckwear": (43, 57, .28, 0), "pendant": (43, 64, .20, 0), "back": (67, 52, .30, 0)},
    "chameleon": {"headwear": (23, 36, .25, -7), "eyewear": (22, 45, .20, 0), "neckwear": (33, 54, .24, -10), "pendant": (36, 61, .18, 0), "back": (59, 48, .29, 0), "sleep": (34, 24, .24, 0)},
    "crab": {"headwear": (50, 30, .30, 0), "eyewear": (50, 32, .31, 0), "neckwear": (50, 60, .32, 0), "pendant": (50, 67, .20, 0), "back": (50, 49, .31, 0), "sleep": (66, 20, .27, 0)},
    "deer": {"headwear": (36, 31, .28, -6), "eyewear": (35, 40, .22, 0), "neckwear": (41, 52, .25, -10), "pendant": (43, 59, .18, 0), "back": (61, 49, .30, 0), "sleep": (47, 19, .25, 0)},
    "dragon": {"headwear": (35, 34, .30, -4), "eyewear": (35, 47, .26, 0), "neckwear": (42, 58, .27, 0), "pendant": (43, 65, .19, 0), "back": (66, 48, .32, 0)},
    "fox": {"headwear": (38, 29, .32, 0), "eyewear": (38, 43, .29, 0), "neckwear": (39, 57, .28, 0), "pendant": (40, 64, .20, 0), "back": (67, 53, .31, 0)},
    "frog": {"headwear": (50, 31, .34, 0), "eyewear": (50, 43, .33, 0), "neckwear": (50, 59, .30, 0), "pendant": (50, 65, .21, 0), "back": (68, 54, .31, 0)},
    "gecko": {"headwear": (23, 38, .25, -7), "eyewear": (22, 47, .21, 0), "neckwear": (34, 55, .24, -9), "pendant": (36, 62, .18, 0), "back": (58, 50, .29, 0), "sleep": (34, 25, .24, 0)},
    "ghost": {"headwear": (50, 31, .34, 0), "eyewear": (50, 48, .30, 0), "neckwear": (50, 61, .29, 0), "pendant": (50, 67, .21, 0), "back": (66, 52, .30, 0)},
    "moth": {"headwear": (50, 35, .24, 0), "eyewear": (50, 44, .20, 0), "neckwear": (50, 53, .22, 0), "pendant": (50, 59, .16, 0), "back": (50, 47, .34, 0), "sleep": (62, 24, .23, 0)},
    "mushroom": {"headwear": (50, 14, .36, 0), "eyewear": (50, 52, .28, 0), "neckwear": (50, 65, .27, 0), "pendant": (50, 71, .19, 0), "back": (68, 58, .29, 0), "sleep": (65, 17, .27, 0)},
    "octopus": {"headwear": (49, 29, .34, 0), "eyewear": (47, 44, .28, 0), "neckwear": (49, 58, .29, 0), "pendant": (49, 64, .20, 0), "back": (65, 49, .30, 0)},
    "owl": {"headwear": (50, 28, .36, 0), "eyewear": (50, 44, .34, 0), "neckwear": (50, 60, .31, 0), "pendant": (50, 67, .21, 0), "back": (68, 50, .30, 0)},
    "penguin": {"headwear": (50, 27, .33, 0), "eyewear": (50, 43, .29, 0), "neckwear": (50, 57, .29, 0), "pendant": (50, 64, .20, 0), "back": (68, 51, .29, 0)},
    "rabbit": {"headwear": (44, 32, .29, 0), "eyewear": (43, 47, .27, 0), "neckwear": (44, 59, .27, 0), "pendant": (44, 65, .19, 0), "back": (65, 54, .28, 0), "sleep": (57, 20, .25, 0)},
    "red-panda": {"headwear": (42, 29, .32, 0), "eyewear": (42, 42, .28, 0), "neckwear": (43, 56, .28, 0), "pendant": (43, 63, .20, 0), "back": (68, 53, .31, 0)},
    "robot": {"headwear": (50, 31, .34, 0), "eyewear": (50, 49, .31, 0), "neckwear": (50, 61, .29, 0), "pendant": (50, 67, .20, 0), "back": (69, 50, .30, 0)},
    "slime": {"headwear": (50, 36, .34, 0), "eyewear": (50, 52, .29, 0), "neckwear": (50, 65, .29, 0), "pendant": (50, 70, .20, 0), "back": (68, 54, .30, 0)},
    "snail": {"headwear": (41, 36, .33, 0), "eyewear": (39, 25, .32, 0), "neckwear": (39, 59, .28, 0), "pendant": (40, 66, .19, 0), "back": (70, 50, .32, 0), "sleep": (57, 18, .27, 0)},
    "turtle": {"headwear": (20, 39, .25, -8), "eyewear": (19, 49, .21, 0), "neckwear": (30, 58, .24, -8), "pendant": (34, 64, .17, 0), "back": (64, 46, .33, 0), "sleep": (31, 26, .23, 0)},
}

# Each item gets its own proportions instead of sharing a square mount box.
ITEM_VARIANTS = {
    "wizard-hat": ("headwear", 1.08, 0, -2, "front"),
    "cap": ("headwear", 1.00, 0, 1, "front"),
    "glasses": ("eyewear", 1.12, 0, 0, "front"),
    "crown": ("headwear", .92, 0, 1, "front"),
    "sprout": ("headwear", .68, 0, -1, "front"),
    "mushroom": ("headwear", .74, 0, 0, "front"),
    "scarf": ("neckwear", 1.12, 0, 1, "front"),
    "golden-bell": ("neckwear", .58, 0, 4, "front"),
    "cyan-crystal": ("pendant", .68, 0, 2, "front"),
    "blue-crystal": ("pendant", .68, 0, 2, "front"),
    "purple-orb": ("pendant", .78, 0, 1, "front"),
    "lens-gem": ("pendant", .72, 0, 1, "front"),
    "portal-orb": ("pendant", .80, 0, 1, "front"),
    "ufo": ("back", 1.18, 0, -2, "back"),
    "relay-antenna": ("back", .90, 0, -3, "back"),
    "sleep-z": ("sleep", .82, 0, 0, "front"),
}


def bake_layer(source: Image.Image, placement: tuple[float, float, float, float], factor: float, dx: float, dy: float) -> Image.Image:
    x_pct, y_pct, scale, rotation = placement
    target = max(1, round(CANVAS * scale * factor))
    ratio = min(target / source.width, target / source.height)
    width = max(1, round(source.width * ratio))
    height = max(1, round(source.height * ratio))
    item = source.resize((width, height), Image.Resampling.NEAREST)
    if rotation:
        item = item.rotate(-rotation, resample=Image.Resampling.NEAREST, expand=True)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    center_x = round(CANVAS * (x_pct + dx) / 100)
    center_y = round(CANVAS * (y_pct + dy) / 100)
    canvas.alpha_composite(item, (center_x - item.width // 2, center_y - item.height // 2))
    return canvas


def main() -> None:
    if LEGACY_OUTPUT.exists():
        shutil.rmtree(LEGACY_OUTPUT)
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)

    count = 0
    for species, overrides in LAYOUTS.items():
        layout = {**DEFAULT, **overrides}
        for variant_key, (mount, factor, dx, dy, side) in ITEM_VARIANTS.items():
            source = Image.open(ITEMS / f"{variant_key}.png").convert("RGBA")
            layer = bake_layer(source, layout[mount], factor, dx, dy)
            destination = OUTPUT / side / species / f"{variant_key}.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            layer.save(destination, optimize=True)
            count += 1

    print(f"Baked {count} pet-specific gear variants in {OUTPUT}")


if __name__ == "__main__":
    main()
