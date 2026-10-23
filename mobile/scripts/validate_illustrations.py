#!/usr/bin/env python3
"""
Validation report for the generated transparent illustrations.

Image inspection is not available in this environment, so the matte is checked
with numeric measures instead:

  subjectLost   share of clearly-subject pixels (saturated or dark) that ended
                up transparent. Low is good.
  backdropLeak  share of opaque pixels that look exactly like the studio
                backdrop. High means the sweep was not removed.
  borderTouch   share of opaque pixels belonging to a component that reaches
                the frame edge. High means residue is stuck to the border.
  comps         number of separate opaque components. A subject should be a
                single connected blob (a couple is fine for split artwork).
  holeFrac      share of the subject's bounding box that is transparent. A
                high value means the silhouette has been eaten away.
"""

from __future__ import annotations

import glob
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from process_illustrations import remove_background  # noqa: E402

SOURCE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "assets", "illustrations"
)


def report(path: str) -> None:
    source = np.array(Image.open(path).convert("RGB")).astype(int)
    alpha = remove_background(source.astype(np.float32))
    opaque = alpha > 0.5

    saturation = source.max(axis=2) - source.min(axis=2)
    luminance = source.mean(axis=2)

    subject = (saturation > 45) | (source.min(axis=2) < 170)
    backdrop = (saturation < 18) & (luminance > 225)

    subject_lost = (subject & ~opaque).sum() / max(1, subject.sum())

    # Backdrop-looking pixels that sit far from the subject are genuine
    # residue; backdrop-looking pixels right next to the subject are usually
    # a white highlight on the artwork and are harmless.
    distance = ndimage.distance_transform_edt(~opaque)
    backdrop_leak = (opaque & backdrop).sum() / max(1, opaque.sum())
    residue = (opaque & backdrop & (distance > 4)).sum() / max(1, opaque.sum())

    # A soft contact shadow under the subject is grey rather than white, so
    # it needs its own check: grey, unsaturated and close to the backdrop.
    grey = (saturation < 25) & (luminance > 150) & ~backdrop
    shadow = (opaque & grey & (distance > 6)).sum() / max(1, opaque.sum())

    labels, count = ndimage.label(opaque)
    border = set(labels[0, :].tolist())
    border |= set(labels[-1, :].tolist())
    border |= set(labels[:, 0].tolist())
    border |= set(labels[:, -1].tolist())
    border.discard(0)

    sizes = np.bincount(labels.ravel(), minlength=count + 1)
    border_touch = sum(sizes[label] for label in border) / max(1, opaque.sum())

    rows, cols = np.nonzero(opaque)
    if rows.size:
        box_area = (rows.max() - rows.min() + 1) * (cols.max() - cols.min() + 1)
        hole_fraction = 1.0 - opaque.sum() / box_area
    else:
        hole_fraction = 1.0

    print(
        f"{os.path.basename(path)[:44]:<46}"
        f"lost={subject_lost * 100:6.2f}%"
        f"leak={backdrop_leak * 100:6.2f}%"
        f" resid={residue * 100:6.2f}%"
        f" shadow={shadow * 100:6.2f}%"
        f" border={border_touch * 100:6.2f}%"
        f" comps={count:3d}"
        f" holes={hole_fraction * 100:5.1f}%"
    )


def main() -> int:
    for path in sorted(glob.glob(os.path.join(SOURCE_DIR, "*.jpg"))):
        report(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
