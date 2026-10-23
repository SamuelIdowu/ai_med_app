#!/usr/bin/env python3
"""
Illustration asset pipeline for the Laso+ mobile app.

Source renders in `mobile/assets/illustrations/` are 2048x2048 studio JPEGs on a
near-white background. They cannot be used directly in the app because:

  * the white backdrop reads as a bright rectangle on dark surfaces,
  * `resizeMode="cover"` crops the subject away,
  * at small sizes (28px avatars) the subject becomes an illegible fragment.

This script produces derived PNGs that are:

  1. transparent  - the studio backdrop is removed with a border-seeded
     flood fill so interior white highlights survive,
  2. cropped       - tightly framed on the subject's bounding box,
  3. downscaled    - capped at `MAX_EDGE` so the bundle stays reasonable.

Run from the repository root:

    python mobile/scripts/process_illustrations.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = REPO_ROOT / "mobile" / "assets" / "illustrations"
OUTPUT_DIR = REPO_ROOT / "mobile" / "assets" / "illustrations" / "transparent"

MAX_EDGE = 1024
PADDING = 12  # transparent breathing room around the cropped subject

# A pixel counts as "studio backdrop" when it is bright and nearly
# desaturated. The renders use a light grey/white sweep, so this is stable
# across the whole batch while still rejecting the coloured 3D subjects.
LIGHT_MIN = 150          # minimum channel value for a backdrop candidate
MAX_CHROMA = 40          # maximum (max channel - min channel)

# The studio backdrop is a smooth sweep, so it is modelled with a 2D
# polynomial per colour channel. The fit is robust: after every pass the
# pixels that deviate most from the current model are treated as subject and
# excluded, so the model converges on the backdrop alone. A local median
# filter was tried first but it absorbed bright subjects (the white ring, the
# white first-aid kit) into the model and removed them from the matte.
BACKDROP_DEGREE = 3
BACKDROP_PASSES = 6
BACKDROP_KEEP = 0.55  # share of the least-deviating pixels used for the fit

# Matte tuning. `DIFF_LOW` is the difference from the backdrop at which a
# pixel starts to become opaque, `DIFF_HIGH` is where it is fully opaque.
DIFF_LOW = 6.0
DIFF_HIGH = 22.0

MIN_COMPONENT = 256       # discard connected components smaller than this
MAX_HOLE_FRACTION = 0.05  # only fill enclosed holes smaller than this share


def _polynomial_design(height: int, width: int, degree: int) -> np.ndarray:
    """Build the design matrix for a 2D polynomial of the given degree."""
    ys = np.linspace(-1.0, 1.0, height)
    xs = np.linspace(-1.0, 1.0, width)
    grid_y, grid_x = np.meshgrid(ys, xs, indexing="ij")

    columns = [np.ones_like(grid_x)]
    for total in range(1, degree + 1):
        for power_y in range(total + 1):
            power_x = total - power_y
            columns.append((grid_y**power_y) * (grid_x**power_x))

    return np.stack(columns, axis=-1).reshape(-1, len(columns))


def estimate_backdrop(rgb: np.ndarray) -> np.ndarray:
    """Estimate the studio backdrop behind the subject.

    The renders sit on a light studio sweep with a soft vignette. A smooth
    polynomial reproduces that sweep, and the fit is made robust by
    repeatedly discarding the pixels that deviate most from the current
    model. Those deviating pixels are the subject, so the model converges on
    the backdrop alone even when the subject covers most of the frame.
    """
    height, width = rgb.shape[:2]

    # The fit runs on a downscaled copy of the image: the backdrop is smooth,
    # so a small grid reproduces it exactly while keeping the least squares
    # solve fast.
    fit_edge = 192
    scale = min(1.0, fit_edge / max(height, width))
    fit_height = max(8, int(round(height * scale)))
    fit_width = max(8, int(round(width * scale)))

    fit_image = Image.fromarray(rgb.astype(np.uint8), mode="RGB").resize(
        (fit_width, fit_height), Image.BOX
    )
    fit_rgb = np.asarray(fit_image).astype(np.float32)

    design = _polynomial_design(fit_height, fit_width, BACKDROP_DEGREE)

    flat = fit_rgb.reshape(-1, 3)
    weights = np.ones(flat.shape[0], dtype=np.float32)

    backdrop = np.empty_like(flat)
    for _ in range(BACKDROP_PASSES):
        for channel in range(3):
            values = flat[:, channel]
            # Solve the weighted least squares problem for this channel.
            weighted_design = design * weights[:, None]
            solution = np.linalg.lstsq(
                weighted_design, values * weights, rcond=None
            )[0]
            backdrop[:, channel] = design @ solution

        deviation = np.abs(flat - backdrop).max(axis=1)
        # Keep the least-deviating pixels and shrink the weight of the rest
        # so that early passes still contribute some subject information.
        threshold = np.quantile(deviation, BACKDROP_KEEP)
        weights = np.where(deviation <= threshold, 1.0, 0.05).astype(np.float32)

    # Evaluate the fitted polynomial over the full resolution grid.
    full_design = _polynomial_design(height, width, BACKDROP_DEGREE)
    full_backdrop = np.empty((height * width, 3), dtype=np.float32)
    for channel in range(3):
        solution = np.linalg.lstsq(
            design * weights[:, None], flat[:, channel] * weights, rcond=None
        )[0]
        full_backdrop[:, channel] = full_design @ solution

    return full_backdrop.reshape(height, width, 3)


def remove_background(rgb: np.ndarray) -> np.ndarray:
    """Return an alpha channel where the studio backdrop is transparent.

    A pixel is part of the subject when it differs from the locally estimated
    studio backdrop. Because the estimate adapts to its surroundings, bright
    gaps in an open structure (the molecular lattice) are removed while
    genuine white highlights sitting on a solid body stay opaque.
    """
    backdrop = estimate_backdrop(rgb)
    difference = np.abs(rgb - backdrop).max(axis=2)

    alpha = np.clip((difference - DIFF_LOW) / (DIFF_HIGH - DIFF_LOW), 0.0, 1.0)

    # Solid parts of the subject.
    subject = alpha > 0.5

    # Close tiny gaps so the silhouette is contiguous.
    subject = ndimage.binary_closing(subject, structure=np.ones((5, 5)))

    # Drop compression speckle.
    labels, count = ndimage.label(subject)
    if count:
        sizes = ndimage.sum(subject, labels, range(1, count + 1))
        keep = np.zeros(count + 1, dtype=bool)
        keep[1:] = sizes >= MIN_COMPONENT
        subject = keep[labels]

    # Fill only enclosed holes that are small relative to the subject. Big
    # interior gaps are real negative space and must stay transparent.
    filled = ndimage.binary_fill_holes(subject)
    holes = filled & ~subject
    if holes.any():
        hole_labels, hole_count = ndimage.label(holes)
        hole_sizes = ndimage.sum(holes, hole_labels, range(1, hole_count + 1))
        subject_area = float(subject.sum())
        keep_hole = np.zeros(hole_count + 1, dtype=bool)
        keep_hole[1:] = hole_sizes <= MAX_HOLE_FRACTION * max(1.0, subject_area)
        subject = subject | keep_hole[hole_labels]

    # Build a soft matte from the signed distance to the silhouette. The band
    # around the boundary is feathered, the interior is fully opaque.
    inner = ndimage.distance_transform_edt(subject)
    outer = ndimage.distance_transform_edt(~subject)
    distance = inner - outer  # positive inside the subject

    alpha = np.where(subject, np.maximum(alpha, 0.92), alpha)
    alpha = np.clip((distance + 0.5) / 1.6, 0.0, 1.0)
    alpha[subject & (distance > 1.5)] = 1.0

    # Nothing on the outer border of the frame may remain opaque.
    alpha[0, :] = 0.0
    alpha[-1, :] = 0.0
    alpha[:, 0] = 0.0
    alpha[:, -1] = 0.0

    return alpha.astype(np.float32)


def subject_bbox(alpha: np.ndarray) -> tuple[int, int, int, int] | None:
    ys, xs = np.nonzero(alpha > 0.15)
    if ys.size == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def process(source: Path, destination: Path) -> dict:
    image = Image.open(source).convert("RGB")
    rgb = np.asarray(image).astype(np.float32)

    alpha = remove_background(rgb)
    bbox = subject_bbox(alpha)
    if bbox is None:
        raise RuntimeError(f"{source.name}: no subject detected")

    left, top, right, bottom = bbox
    left = max(0, left - PADDING)
    top = max(0, top - PADDING)
    right = min(rgb.shape[1], right + PADDING)
    bottom = min(rgb.shape[0], bottom + PADDING)

    rgba = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
    cropped = Image.fromarray(rgba, mode="RGBA").crop((left, top, right, bottom))

    scale = min(1.0, MAX_EDGE / max(cropped.size))
    if scale < 1.0:
        cropped = cropped.resize(
            (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
            Image.LANCZOS,
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(destination, format="PNG", optimize=True)

    return {
        "source": source.name,
        "output": destination.name,
        "source_size": image.size,
        "output_size": cropped.size,
        "coverage": float((alpha > 0.5).mean()),
    }


def main() -> int:
    if not SOURCE_DIR.exists():
        print(f"error: {SOURCE_DIR} does not exist", file=sys.stderr)
        return 1

    sources = sorted(p for p in SOURCE_DIR.glob("*.jpg"))
    if not sources:
        print(f"error: no .jpg sources in {SOURCE_DIR}", file=sys.stderr)
        return 1

    for source in sources:
        destination = OUTPUT_DIR / (source.stem + ".png")
        try:
            result = process(source, destination)
        except Exception as exc:  # noqa: BLE001 - surface per-file failures
            print(f"FAIL  {source.name}: {exc}", file=sys.stderr)
            continue

        width, height = result["output_size"]
        print(
            f"ok    {result['source'][:44]:<44} -> {result['output'][:44]:<44} "
            f"{result['source_size'][0]}px -> {width}x{height} "
            f"subject={result['coverage'] * 100:.1f}%"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
