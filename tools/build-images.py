#!/usr/bin/env python3
"""Turn the generated source PNGs into optimised web images.

Reads the originals downloaded by tools/fetch-assets.sh into build/src/
and writes WebP renditions (plus the og:image JPEG) into site/assets/img/.
Run from the repository root: python3 tools/build-images.py
"""
from pathlib import Path

from PIL import Image, ImageOps

SRC = Path("build/src")
OUT = Path("site/assets/img")
OUT.mkdir(parents=True, exist_ok=True)

# name -> (source file, list of target widths)
PLAN = {
    "facade": ("facade.png", [1920, 1280, 720]),
    "suite-lin": ("suite-lin.png", [1200, 720]),
    "suite-pierre": ("suite-pierre.png", [1200, 720]),
    "suite-olivier": ("suite-olivier.png", [1200, 720]),
    "suite-ocre": ("suite-ocre.png", [1200, 720]),
    "suite-ciel": ("suite-ciel.png", [1200, 720]),
    "table": ("table.png", [1600, 900]),
    "environs": ("environs.png", [1920, 1080]),
    "piscine": ("piscine.png", [1600, 900]),
}


def save_webp(img: Image.Image, path: Path, width: int, quality: int = 80) -> None:
    ratio = width / img.width
    resized = img.resize((width, round(img.height * ratio)), Image.LANCZOS)
    resized.save(path, "WEBP", quality=quality, method=6)
    print(f"{path} {resized.size} {path.stat().st_size // 1024} KB")


for name, (src_name, widths) in PLAN.items():
    src = SRC / src_name
    if not src.exists():
        print(f"skip {name}: {src} missing")
        continue
    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    for w in widths:
        save_webp(img, OUT / f"{name}-{w}.webp", w)

# og:image: 1200x630 crop of the facade
facade = SRC / "facade.png"
if facade.exists():
    img = Image.open(facade).convert("RGB")
    og = ImageOps.fit(img, (1200, 630), Image.LANCZOS, centering=(0.5, 0.55))
    og.save(OUT / "og-image.jpg", "JPEG", quality=82, optimize=True, progressive=True)
    print(f"{OUT / 'og-image.jpg'} {og.size} {(OUT / 'og-image.jpg').stat().st_size // 1024} KB")
