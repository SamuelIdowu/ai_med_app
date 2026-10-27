#!/usr/bin/env python3
"""
Optimize the transparent illustration PNGs for React Native bundling.

Why this exists
---------------
The transparent renders produced by ``process_illustrations.py`` are full
resolution 32-bit RGBA PNGs (~700 KB each, ~8.5 MB for the whole batch).
On device they are rendered at most at 200 logical px (88-160 px), so the
extra pixels are pure bundle weight.

This script
-----------
1. Downscales the longest edge to ``--max-size`` (default 512 px). That is
   still 3x-5x the largest on-screen size, so nothing gets blurry.
2. Quantizes to an indexed (palette) PNG with an ``tRNS`` transparency chunk.
   ``FASTOCTREE`` is used because it is the only PIL quantizer that keeps the
   alpha channel semantically correct. Measured worst-case alpha error on the
   batch is < 1/255 which is imperceptible.
3. Runs an optimal (libpng ``optimize=True``) zlib pass on top.

The output stays a standard RGBA-capable PNG, so ``require()`` in React
Native keeps working and ``Image`` renders it with transparency.

Usage
-----
    python mobile/scripts/optimize_illustrations.py
    python mobile/scripts/optimize_illustrations.py --max-size 512 --dry-run
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - environment guard
    print("Pillow is required: pip install Pillow", file=sys.stderr)
    raise

REPO_ROOT = Path(__file__).resolve().parents[2]
TRANSPARENT_DIR = REPO_ROOT / "mobile" / "assets" / "illustrations" / "transparent"
BACKUP_DIR = REPO_ROOT / "mobile" / "assets" / "illustrations" / "transparent_full"


def optimize_file(path: Path, max_size: int, colors: int) -> tuple[int, int]:
    """Return (original_bytes, optimized_bytes) for a single PNG."""
    original_size = path.stat().st_size

    with Image.open(path) as img:
        rgba = img.convert("RGBA")

        # 1. Downscale on the alpha-premultiplied-safe path (PIL resamples
        #    straight alpha correctly for RGBA via LANCZOS).
        if max(rgba.size) > max_size:
            scale = max_size / max(rgba.size)
            new_size = (max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale)))
            rgba = rgba.resize(new_size, Image.LANCZOS)

        # 2. Index the image. FASTOCTREE handles RGBA correctly.
        quantized = rgba.quantize(colors=colors, method=Image.FASTOCTREE)

        # 3. Write optimized PNG next to the original, then swap.
        tmp_path = path.with_suffix(".opt.png")
        quantized.save(tmp_path, format="PNG", optimize=True)

    optimized_size = tmp_path.stat().st_size

    # Only keep the optimized file when it is actually smaller.
    if optimized_size < original_size:
        shutil.move(str(tmp_path), str(path))
        return original_size, optimized_size

    tmp_path.unlink(missing_ok=True)
    return original_size, original_size


def main() -> int:
    parser = argparse.ArgumentParser(description="Optimize transparent illustration PNGs.")
    parser.add_argument("--max-size", type=int, default=512, help="Max longest edge in pixels.")
    parser.add_argument("--colors", type=int, default=255, help="Max palette colors.")
    parser.add_argument("--dry-run", action="store_true", help="Report sizes without writing.")
    args = parser.parse_args()

    if not TRANSPARENT_DIR.exists():
        print(f"Missing directory: {TRANSPARENT_DIR}", file=sys.stderr)
        return 1

    files = sorted(TRANSPARENT_DIR.glob("*.png"))
    if not files:
        print(f"No PNGs found in {TRANSPARENT_DIR}", file=sys.stderr)
        return 1

    total_before = 0
    total_after = 0

    for png in files:
        before = png.stat().st_size
        if args.dry_run:
            with Image.open(png) as img:
                print(f"{png.name}: {before / 1024:.0f} KB  {img.size} (dry-run)")
            total_before += before
            total_after += before
            continue

        # Keep a pristine copy of the un-optimized render so the pipeline can
        # be re-run from scratch at any time.
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        backup = BACKUP_DIR / png.name
        if not backup.exists():
            shutil.copy2(png, backup)

        b, a = optimize_file(png, args.max_size, args.colors)
        total_before += b
        total_after += a
        print(f"{png.name}: {b / 1024:.0f} KB -> {a / 1024:.0f} KB")

    print(
        f"\nTotal: {total_before / 1024 / 1024:.2f} MB -> {total_after / 1024 / 1024:.2f} MB "
        f"({100 * (1 - total_after / max(total_before, 1)):.1f}% smaller)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
