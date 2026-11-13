#!/usr/bin/env python3
"""Build articulated, photo-textured 3D character glTFs (.glb) directly from
images/characters/*-sheet.png using pure Python (PIL + numpy). Zero Blender,
Hunyuan3D, or Mixamo dependencies.

Outputs (Three.js +Y up, -Z forward, -X character left, +X character right):
  public/models/moretti.glb
  public/models/crystal.glb
  public/models/mark.glb
  public/models/victor.glb
  public/models/sterling.glb

Usage:
  python3 tools/characters/build_characters.py
  python3 tools/characters/build_characters.py --mattes-only
  python3 tools/characters/build_characters.py --only=crystal,victor
"""

from __future__ import annotations

import argparse
from collections import deque
from dataclasses import dataclass
import io
import json
import math
from pathlib import Path
import struct
from typing import Iterable

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SHEETS_DIR = ROOT / "images" / "characters"
OUT_DIR = ROOT / "public" / "models"
SCRATCH_MATTE_PATH = (
    Path.home()
    / ".gemini/jetski/brain/v1/default/jetski_remote_agents_3p"
    / "012a7b54-f703-4243-8614-039bea99d4e1/scratch/cast_mattes.png"
)


@dataclass(frozen=True)
class CharacterSpec:
    name: str
    sheet: str
    height: float
    profile_faces: str  # "right" or "left"
    thigh_ratio: float
    shin_ratio: float
    upper_arm_ratio: float
    forearm_ratio: float
    hip_height_ratio: float
    shoulder_height_ratio: float
    head_height_ratio: float
    is_skirt: bool = False
    has_ponytail: bool = False
    has_duty_belt: bool = False
    has_crystal_fx: bool = False


SPECS: dict[str, CharacterSpec] = {
    "moretti": CharacterSpec(
        name="moretti",
        sheet="moretti-sheet.png",
        height=1.82,
        profile_faces="right",
        thigh_ratio=0.247,
        shin_ratio=0.242,
        upper_arm_ratio=0.165,
        forearm_ratio=0.148,
        hip_height_ratio=0.98 / 1.82,
        shoulder_height_ratio=1.50 / 1.82,
        head_height_ratio=1.68 / 1.82,
        has_duty_belt=True,
    ),
    "crystal": CharacterSpec(
        name="crystal",
        sheet="crystal-sheet.png",
        height=1.62,
        profile_faces="left",
        thigh_ratio=0.259,
        shin_ratio=0.247,
        upper_arm_ratio=0.167,
        forearm_ratio=0.148,
        hip_height_ratio=0.93 / 1.62,
        shoulder_height_ratio=1.30 / 1.62,
        head_height_ratio=1.47 / 1.62,
        is_skirt=True,
        has_crystal_fx=True,
    ),
    "mark": CharacterSpec(
        name="mark",
        sheet="mark-sheet.png",
        height=1.88,
        profile_faces="right",
        thigh_ratio=0.245,
        shin_ratio=0.240,
        upper_arm_ratio=0.172,
        forearm_ratio=0.152,
        hip_height_ratio=0.52,
        shoulder_height_ratio=0.815,
        head_height_ratio=0.915,
        has_ponytail=True,
    ),
    "victor": CharacterSpec(
        name="victor",
        sheet="victor-sheet.png",
        height=1.77,
        profile_faces="left",
        thigh_ratio=0.250,
        shin_ratio=0.244,
        upper_arm_ratio=0.166,
        forearm_ratio=0.149,
        hip_height_ratio=0.535,
        shoulder_height_ratio=0.82,
        head_height_ratio=0.918,
    ),
    "sterling": CharacterSpec(
        name="sterling",
        sheet="sterling-sheet.png",
        height=1.74,
        profile_faces="right",
        thigh_ratio=0.242,
        shin_ratio=0.238,
        upper_arm_ratio=0.168,
        forearm_ratio=0.149,
        hip_height_ratio=0.525,
        shoulder_height_ratio=0.815,
        head_height_ratio=0.918,
    ),
}


# ---------------------------------------------------------------------------
# 1. Cyclorama segmentation & turnaround panel splitting
# ---------------------------------------------------------------------------


def smooth_1d(arr: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0 or arr.size == 0:
        return arr.copy()
    k = 2 * radius + 1
    pad = np.pad(arr, (radius, radius), mode="edge")
    cs = np.cumsum(np.insert(pad, 0, 0.0, axis=0), axis=0)
    return (cs[k:] - cs[:-k]) / float(k)


def segment_panel(rgb_u8: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Return foreground mask (H, W bool) and RGB uint8 for a single studio panel.

    Uses per-row border cyclorama estimation + 8-neighbor border flood-fill
    without hard horizontal edge blocking so the studio wall/floor seam wave
    disappears cleanly without punching holes into white sneakers or pale cream
    fabrics.
    """
    h, w, _ = rgb_u8.shape
    arr = rgb_u8.astype(np.float32)

    # Estimate studio background curve per row from outermost clean margins of this panel.
    # Reject foreground elbows/sleeves touching near a panel cut by filtering margin pixels
    # to neutral chroma relative to the panel's outer border reference, then interpolating
    # any occluded margin rows vertically across the cyclorama gradient.
    band = max(3, min(6, w // 48))
    left_strip = arr[:, :band, :]
    right_strip = arr[:, w - band :, :]
    top_corners = np.concatenate([left_strip[: max(8, h // 12)], right_strip[: max(8, h // 12)]], axis=1)
    ref_border = np.median(top_corners.reshape(-1, 3), axis=0)
    ref_lum = float(np.mean(ref_border))

    def clean_side_curve(strip: np.ndarray) -> np.ndarray:
        med = np.median(strip, axis=1)  # (h, 3)
        ch = np.max(med, axis=1) - np.min(med, axis=1)
        lm = np.mean(med, axis=1)
        ok = (ch < 10.5) & (np.abs(lm - ref_lum) < 58.0)
        if ok.sum() < 4:
            ok = ch < 14.0
        ys_all = np.arange(h, dtype=np.float32)
        out = np.empty((h, 3), dtype=np.float32)
        if ok.any():
            for c_idx in range(3):
                vals = np.interp(ys_all, ys_all[ok], med[ok, c_idx])
                out[:, c_idx] = smooth_1d(vals, 10)
        else:
            out[:] = ref_border[None, :]
        return out

    left_med = clean_side_curve(left_strip)
    right_med = clean_side_curve(right_strip)
    row_bg = 0.5 * (left_med + right_med)
    tx = np.linspace(0.0, 1.0, w, dtype=np.float32)[None, :, None]
    bg_field = left_med[:, None, :] * (1.0 - tx) + right_med[:, None, :] * tx
    bg_field = 0.65 * bg_field + 0.35 * row_bg[:, None, :]

    diff = arr - bg_field
    dist = np.sqrt(np.mean(diff * diff, axis=2))
    lum = np.mean(arr, axis=2)
    lum_bg = np.mean(bg_field, axis=2)
    lum_delta = lum - lum_bg
    chroma = np.max(arr, axis=2) - np.min(arr, axis=2)
    chroma_bg = np.max(bg_field, axis=2) - np.min(bg_field, axis=2)
    chroma_d = np.abs(chroma - chroma_bg)

    # Pure neutral studio cyclorama relative to the local row/floor spotlight gradient.
    # Bright white sneakers (lum_delta > +22 above ~186) & cream fabrics stay protected.
    lum_ceil = np.minimum(222.0, np.maximum(188.0, lum_bg + 16.0))
    bg_like = (chroma < 8.5) & (chroma_d < 9.5) & (lum < lum_ceil) & (
        (dist < 16.0) | ((lum_delta > -58.0) & (lum_delta < 28.0))
    )
    floor_zone = np.arange(h)[:, None] > int(h * 0.84)
    floor_ceil = np.minimum(220.0, np.maximum(190.0, lum_bg + 14.0))
    bg_like |= floor_zone & (chroma < 7.0) & (chroma_d < 7.5) & (lum > lum_bg * 0.58) & (lum < floor_ceil)

    # Interior dark solids, coloured garments, and bright white shoes stay blocked
    definitely_fg = (
        (lum < np.minimum(74.0, lum_bg * 0.45))
        | (chroma > 11.0)
        | (chroma_d > 14.0)
        | (dist > 38.0)
        | ((lum > 186.0) & (lum_delta > 20.0))
    )
    passable = bg_like & ~definitely_fg

    # Force panel side edges, top row, and passable bottom floor row as seedable studio background
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        if not definitely_fg[0, x]:
            visited[0, x] = True
            q.append((0, x))
        if not definitely_fg[h - 1, x] and passable[h - 1, x]:
            visited[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if not definitely_fg[y, 0]:
            visited[y, 0] = True
            q.append((y, 0))
        if not definitely_fg[y, w - 1]:
            visited[y, w - 1] = True
            q.append((y, w - 1))

    # 8-neighbor BFS flood fill through passable cyclorama pixels
    pass_list = passable.tolist()
    vis_list = visited.tolist()
    nbrs = ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1))
    while q:
        cy, cx = q.popleft()
        for dy, dx in nbrs:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not vis_list[ny][nx] and pass_list[ny][nx]:
                vis_list[ny][nx] = True
                q.append((ny, nx))

    # Clear closed studio pockets (underarms, waist slits, between thighs, hair loops)
    enclosed_cand = (~np.array(vis_list, dtype=bool)) & passable & (chroma < 8.5) & (dist < 34.0) & (lum < lum_ceil)
    if enclosed_cand.any():
        cand_list = enclosed_cand.tolist()
        seen_c = [[False] * w for _ in range(h)]
        ys_c, xs_c = np.nonzero(enclosed_cand)
        for sy, sx in zip(ys_c.tolist(), xs_c.tolist()):
            if seen_c[sy][sx]:
                continue
            comp: list[tuple[int, int]] = []
            st = [(sy, sx)]
            seen_c[sy][sx] = True
            while st:
                cy, cx = st.pop()
                comp.append((cy, cx))
                for dy, dx in nbrs:
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and cand_list[ny][nx] and not seen_c[ny][nx]:
                        seen_c[ny][nx] = True
                        st.append((ny, nx))
            if len(comp) >= 12:
                for py_i, px_i in comp:
                    vis_list[py_i][px_i] = True

    fg = ~np.array(vis_list, dtype=bool)

    # Remove 1px isolated spurs via neighbor count (twice)
    for _ in range(2):
        p = np.pad(fg.astype(np.int32), 1, mode="constant")
        n8 = (
            p[:-2, :-2] + p[:-2, 1:-1] + p[:-2, 2:]
            + p[1:-1, :-2] + p[1:-1, 2:]
            + p[2:, :-2] + p[2:, 1:-1] + p[2:, 2:]
        )
        fg = fg & (n8 >= 3)

    # Keep only the largest connected foreground component (the figure itself)
    fg = keep_largest_component(fg)
    return fg, rgb_u8


def keep_largest_component(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    m_list = mask.tolist()
    seen = [[False] * w for _ in range(h)]
    best_comp: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            if m_list[y][x] and not seen[y][x]:
                comp: list[tuple[int, int]] = []
                stack = [(y, x)]
                seen[y][x] = True
                while stack:
                    cy, cx = stack.pop()
                    comp.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            if dy == 0 and dx == 0:
                                continue
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and m_list[ny][nx] and not seen[ny][nx]:
                                seen[ny][nx] = True
                                stack.append((ny, nx))
                if len(comp) > len(best_comp):
                    best_comp = comp
    out = np.zeros_like(mask)
    if best_comp:
        ys, xs = zip(*best_comp)
        out[np.array(ys), np.array(xs)] = True
    return out


def split_sheet_panels(sheet_path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Find the two cleanest column dividers separating Front, 3/4, and Profile panels."""
    im = Image.open(sheet_path).convert("RGB")
    arr = np.asarray(im, dtype=np.uint8)
    h, w, _ = arr.shape
    f = arr.astype(np.float32)

    edge_bg = np.median(np.concatenate([f[:, :16, :], f[:, -16:, :]], axis=1), axis=1)
    diff = np.sqrt(np.mean((f - edge_bg[:, None, :]) ** 2, axis=2))
    chroma = np.max(f, axis=2) - np.min(f, axis=2)
    fg_score = np.mean((diff > 18.0) | (chroma > 12.0), axis=0)
    fg_score = smooth_1d(fg_score, 4)

    def find_cut(lo_frac: float, hi_frac: float) -> int:
        a, b = int(w * lo_frac), int(w * hi_frac)
        return a + int(np.argmin(fg_score[a:b]))

    c1 = find_cut(0.26, 0.42)
    c2 = find_cut(0.56, 0.74)
    return arr[:, :c1], arr[:, c1:c2], arr[:, c2:]


def build_dilated_rgba(rgb: np.ndarray, mask: np.ndarray, passes: int = 12) -> np.ndarray:
    """Create RGBA float [0..1] array with foreground colors dilated cleanly outward."""
    h, w, _ = rgb.shape
    out = np.zeros((h, w, 4), dtype=np.float32)
    out[..., :3] = rgb.astype(np.float32) / 255.0
    out[..., 3] = mask.astype(np.float32)

    # Shrink 1px on sample source so residual cyclorama anti-alias rim doesn't dilate outward
    p = np.pad(mask.astype(np.int32), 1, mode="constant")
    eroded = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) == 4
    seed = eroded if eroded.sum() > 200 else mask
    filled = seed.copy()
    col = out[..., :3].copy()
    col[~filled] = 0.0

    fine_passes = min(passes, 14)
    acc = np.empty_like(col)
    cnt = np.empty((h, w), dtype=np.float32)
    for _ in range(fine_passes):
        if filled.all():
            break
        acc.fill(0.0)
        cnt.fill(0.0)
        # Because col[~filled] is already 0, shifting col sums neighbor colors with zero extra allocations
        acc[1:, :] += col[:-1, :]
        acc[:-1, :] += col[1:, :]
        acc[:, 1:] += col[:, :-1]
        acc[:, :-1] += col[:, 1:]
        cnt[1:, :] += filled[:-1, :]
        cnt[:-1, :] += filled[1:, :]
        cnt[:, 1:] += filled[:, :-1]
        cnt[:, :-1] += filled[:, 1:]
        if (fine_passes <= 12):
            acc[1:, 1:] += col[:-1, :-1]
            acc[1:, :-1] += col[:-1, 1:]
            acc[:-1, 1:] += col[1:, :-1]
            acc[:-1, :-1] += col[1:, 1:]
            cnt[1:, 1:] += filled[:-1, :-1]
            cnt[1:, :-1] += filled[:-1, 1:]
            cnt[:-1, 1:] += filled[1:, :-1]
            cnt[:-1, :-1] += filled[1:, 1:]
        upd = (~filled) & (cnt > 0.0)
        if not upd.any():
            break
        col[upd] = acc[upd] / cnt[upd, None]
        filled |= upd

    # If wide margins remain (passes > fine_passes), fill smoothly from 4x coarse dilated mip
    if passes > fine_passes and not filled.all() and h >= 16 and w >= 16:
        sh, sw = max(4, h // 4), max(4, w // 4)
        c_col = col[::4, ::4].copy()
        c_fill = filled[::4, ::4].copy()
        c_acc = np.empty_like(c_col)
        c_cnt = np.empty(c_fill.shape, dtype=np.float32)
        for _ in range(max(12, passes // 2)):
            if c_fill.all():
                break
            c_acc.fill(0.0)
            c_cnt.fill(0.0)
            c_acc[1:, :] += c_col[:-1, :]
            c_acc[:-1, :] += c_col[1:, :]
            c_acc[:, 1:] += c_col[:, :-1]
            c_acc[:, :-1] += c_col[:, 1:]
            c_cnt[1:, :] += c_fill[:-1, :]
            c_cnt[:-1, :] += c_fill[1:, :]
            c_cnt[:, 1:] += c_fill[:, :-1]
            c_cnt[:, :-1] += c_fill[:, 1:]
            c_upd = (~c_fill) & (c_cnt > 0.0)
            if not c_upd.any():
                break
            c_col[c_upd] = c_acc[c_upd] / c_cnt[c_upd, None]
            c_fill |= c_upd
        coarse_u8 = (np.clip(c_col, 0.0, 1.0) * 255.0).astype(np.uint8)
        up_img = Image.fromarray(coarse_u8, "RGB").resize((w, h), Image.Resampling.BILINEAR)
        up_arr = np.asarray(up_img, dtype=np.float32) / 255.0
        miss = ~filled
        col[miss] = up_arr[miss]

    out[..., :3] = col
    return out


# ---------------------------------------------------------------------------
# 2. Silhouette envelope & anatomical landmark analyzer
# ---------------------------------------------------------------------------


@dataclass
class CharacterEnvelope:
    spec: CharacterSpec
    y_top: int
    y_bot: int
    cx: float  # Front figure spine X
    scale_m_per_px: float
    # Sampled across N_SAMPLES heights from h=0 (feet) to h=spec.height (crown)
    heights: np.ndarray
    torso_rx: np.ndarray
    torso_rz_front: np.ndarray
    torso_rz_back: np.ndarray
    head_rx: np.ndarray
    head_rz_front: np.ndarray
    head_rz_back: np.ndarray
    ponytail_rz_back: np.ndarray
    arm_l_cx: np.ndarray
    arm_l_rx: np.ndarray
    arm_r_cx: np.ndarray
    arm_r_rx: np.ndarray
    leg_l_cx: np.ndarray
    leg_l_rx: np.ndarray
    leg_r_cx: np.ndarray
    leg_r_rx: np.ndarray
    skirt_rx: np.ndarray
    skirt_rz: np.ndarray
    # Pixel coordinates in Front panel (for direct limb/torso sampling bounds)
    front_torso_bounds: np.ndarray  # (N, 2) [px_left_in_img, px_right_in_img]
    front_arm_l_bounds: np.ndarray  # px > cx (viewer right = char left)
    front_arm_r_bounds: np.ndarray  # px < cx (viewer left = char right)
    front_leg_l_bounds: np.ndarray
    front_leg_r_bounds: np.ndarray
    # Profile geometry
    prof_top: int
    prof_bot: int
    prof_spine_x: float
    prof_z_bounds: np.ndarray  # (N, 2) [z_front_px, z_back_px]
    # Vertical landmark heights (in meters)
    y_crotch: float
    y_armpit: float
    y_shoulder: float
    y_neck: float
    y_chin: float
    y_eye: float
    y_nose: float
    y_skirt_hem: float
    y_hip_joint: float
    y_knee_joint: float
    # Three-quarter panel
    q3_top: int
    q3_bot: int
    q3_cx: float


N_SAMP = 200


def mask_bounds(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(mask)
    return int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())


def row_runs(mask_row: np.ndarray) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    in_run = False
    start = 0
    for i, v in enumerate(mask_row):
        if v and not in_run:
            in_run = True
            start = i
        elif not v and in_run:
            in_run = False
            runs.append((start, i - 1))
    if in_run:
        runs.append((start, len(mask_row) - 1))
    return runs


def analyze_character(
    spec: CharacterSpec,
    front_rgb: np.ndarray,
    front_mask: np.ndarray,
    q3_rgb: np.ndarray,
    q3_mask: np.ndarray,
    prof_rgb: np.ndarray,
    prof_mask: np.ndarray,
) -> CharacterEnvelope:
    fx0, fx1, fy0, fy1 = mask_bounds(front_mask)
    px0, px1, py0, py1 = mask_bounds(prof_mask)
    qx0, qx1, qy0, qy1 = mask_bounds(q3_mask)

    f_h = max(1, fy1 - fy0)
    p_h = max(1, py1 - py0)
    scale = spec.height / float(f_h)

    # Centerline X: median midpoint across upper torso / pelvis / head (robust against asymmetric pose)
    cx_samples = []
    for frac in (0.10, 0.14, 0.25, 0.55):
        r = fy0 + int(f_h * frac)
        xs = np.nonzero(front_mask[r])[0]
        if xs.size > 0:
            cx_samples.append(0.5 * (xs.min() + xs.max()))
    cx = float(np.median(cx_samples))
    q3_cx = float(0.5 * (qx0 + qx1))

    # Spine Z centerline in Profile panel: median mid-point around knees / lower shin (vertical anchor)
    # Wait: ankle pivot aligns nicely with shoulder/hip plumb line in upright stance!
    ankle_r = py0 + int(p_h * 0.88)
    chest_r = py0 + int(p_h * 0.30)
    ankle_xs = np.nonzero(prof_mask[ankle_r])[0]
    chest_xs = np.nonzero(prof_mask[chest_r])[0]
    if ankle_xs.size and chest_xs.size:
        prof_spine_x = float(0.45 * np.mean(ankle_xs) + 0.55 * np.mean(chest_xs))
    else:
        prof_spine_x = float(0.5 * (px0 + px1))

    heights = np.linspace(0.0, spec.height, N_SAMP)
    sign_z = -1.0 if spec.profile_faces == "right" else 1.0  # nose/toes should map to -Z

    # Find anatomical y landmarks in Front mask
    # 1. Crotch / Skirt hem: scan upward from 0.20*H to 0.56*H checking central gap near cx
    cx_i = int(round(cx))
    y_crotch = spec.height * 0.45
    last_split_h = 0.0
    gap_rows = 0
    for i in range(N_SAMP):
        h_m = heights[i]
        if not (0.14 * spec.height <= h_m <= 0.58 * spec.height):
            continue
        ry = int(round(fy1 - h_m / scale))
        ry = max(fy0, min(fy1, ry))
        center_band = front_mask[ry, max(0, cx_i - 5) : min(front_mask.shape[1], cx_i + 6)]
        if not center_band.all():
            last_split_h = h_m
            gap_rows += 1
    if gap_rows > 5:
        y_crotch = min(spec.height * 0.53, max(spec.height * 0.36, last_split_h))

    # 2. Neck & Chin & Eyes & Nose
    widths_head = np.zeros(N_SAMP)
    for i, h_m in enumerate(heights):
        ry = max(fy0, min(fy1, int(round(fy1 - h_m / scale))))
        runs = row_runs(front_mask[ry])
        # pick run overlapping cx
        for a, b in runs:
            if a <= cx <= b:
                widths_head[i] = (b - a) * 0.5 * scale
                break
    # Neck is minimum width between 0.78*H and 0.90*H
    neck_mask = (heights >= 0.78 * spec.height) & (heights <= 0.895 * spec.height) & (widths_head > 0.02)
    if neck_mask.any():
        ni = int(np.where(neck_mask)[0][np.argmin(widths_head[neck_mask])])
        y_neck = float(heights[ni])
    else:
        y_neck = spec.height * 0.84
    y_chin = min(spec.height * 0.90, y_neck + 0.045)
    y_shoulder = max(0.75 * spec.height, y_neck - 0.055)
    y_armpit = y_shoulder - 0.125
    y_eye = y_chin + 0.52 * (spec.height - y_chin)
    y_nose = y_chin + 0.35 * (spec.height - y_chin)
    y_skirt_hem = y_crotch - 0.01 if spec.is_skirt else 0.0
    y_hip_joint = spec.hip_height_ratio * spec.height
    y_knee_joint = (spec.shin_ratio + 0.02) * spec.height

    # Analyze row-by-row runs to isolate torso, arms, and legs cleanly
    torso_rx = np.full(N_SAMP, 0.14)
    head_rx = np.full(N_SAMP, 0.08)
    arm_l_cx = np.full(N_SAMP, -0.21)
    arm_l_rx = np.full(N_SAMP, 0.05)
    arm_r_cx = np.full(N_SAMP, +0.21)
    arm_r_rx = np.full(N_SAMP, 0.05)
    leg_l_cx = np.full(N_SAMP, -0.09)
    leg_l_rx = np.full(N_SAMP, 0.065)
    leg_r_cx = np.full(N_SAMP, +0.09)
    leg_r_rx = np.full(N_SAMP, 0.065)

    front_torso_bounds = np.zeros((N_SAMP, 2), dtype=np.float32)
    front_arm_l_bounds = np.zeros((N_SAMP, 2), dtype=np.float32)
    front_arm_r_bounds = np.zeros((N_SAMP, 2), dtype=np.float32)
    front_leg_l_bounds = np.zeros((N_SAMP, 2), dtype=np.float32)
    front_leg_r_bounds = np.zeros((N_SAMP, 2), dtype=np.float32)

    for i, h_m in enumerate(heights):
        ry = max(fy0, min(fy1, int(round(fy1 - h_m / scale))))
        runs = row_runs(front_mask[ry])
        if not runs:
            continue

        # Central run containing cx
        center_run = None
        for r0, r1 in runs:
            if r0 - 3 <= cx <= r1 + 3:
                center_run = (r0, r1)
                break

        # Left side runs (viewer right = px > cx -> character LEFT = -X)
        # Right side runs (viewer left = px < cx -> character RIGHT = +X)
        side_l = [
            (r0, r1)
            for (r0, r1) in runs
            if r0 > cx + 8 and (r1 - r0 + 1) >= 6 and (center_run is None or r0 > center_run[1])
        ]
        side_r = [
            (r0, r1)
            for (r0, r1) in runs
            if r1 < cx - 8 and (r1 - r0 + 1) >= 6 and (center_run is None or r1 < center_run[0])
        ]

        if h_m < y_crotch:
            # Legs! Look for left leg (px > cx) and right leg (px < cx)
            xs_l = [x for (a, b) in runs for x in range(a, b + 1) if x > cx]
            xs_r = [x for (a, b) in runs for x in range(a, b + 1) if x <= cx]
            if xs_l:
                lx0, lx1 = min(xs_l), max(xs_l)
                leg_l_cx[i] = -(0.5 * (lx0 + lx1) - cx) * scale
                leg_l_rx[i] = max(0.028, 0.5 * (lx1 - lx0) * scale)
                front_leg_l_bounds[i] = [lx0, lx1]
            if xs_r:
                rx0, rx1 = min(xs_r), max(xs_r)
                leg_r_cx[i] = (cx - 0.5 * (rx0 + rx1)) * scale
                leg_r_rx[i] = max(0.028, 0.5 * (rx1 - rx0) * scale)
                front_leg_r_bounds[i] = [rx0, rx1]

        if center_run is not None:
            cr0, cr1 = center_run
            # When arms merge at waist/chest without a gap (or shoulders above armpit),
            # cap torso radius using waist/ribcage prior and attribute outer portion to arms.
            half_w = 0.5 * (cr1 - cr0) * scale
            if h_m >= y_chin:
                head_rx[i] = max(0.032, min(0.115, half_w))
                front_torso_bounds[i] = [cr0, cr1]
            elif h_m >= y_neck:
                # Neck
                torso_rx[i] = max(0.042, min(0.085, half_w))
                head_rx[i] = torso_rx[i]
                front_torso_bounds[i] = [cx - torso_rx[i] / scale, cx + torso_rx[i] / scale]
            else:
                # Below neck: if there's an armpit gap, center_run IS clean torso!
                if side_l or side_r:
                    torso_rx[i] = max(0.10, min(0.24, half_w))
                    front_torso_bounds[i] = [cr0, cr1]
                else:
                    # Merged arm + torso row (shoulder / upper chest / sometimes wrist touching hip)
                    # Estimate clean torso half-width smoothly
                    torso_rx[i] = np.nan
                    front_torso_bounds[i] = [np.nan, np.nan]

        # Arm bounds if separated from torso
        if side_l and h_m < y_shoulder + 0.02:
            al0, al1 = max(side_l, key=lambda r: r[1] - r[0])
            arm_l_cx[i] = -(0.5 * (al0 + al1) - cx) * scale
            arm_l_rx[i] = max(0.025, 0.5 * (al1 - al0) * scale)
            front_arm_l_bounds[i] = [al0, al1]
        if side_r and h_m < y_shoulder + 0.02:
            ar0, ar1 = max(side_r, key=lambda r: r[1] - r[0])
            arm_r_cx[i] = (cx - 0.5 * (ar0 + ar1)) * scale
            arm_r_rx[i] = max(0.025, 0.5 * (ar1 - ar0) * scale)
            front_arm_r_bounds[i] = [ar0, ar1]

    # Interpolate any NaN torso_rx values (e.g. armpit/upper chest merged with sleeves)
    def interp_array(arr: np.ndarray, default_val: float, smooth_r: int = 3) -> np.ndarray:
        ok = np.isfinite(arr) & (arr > 0.01)
        idx = np.arange(len(arr))
        if not ok.any():
            return np.full_like(arr, default_val)
        res = np.interp(idx, idx[ok], arr[ok])
        return smooth_1d(res, smooth_r)

    # Cap upper-chest merged torso_rx using measured torso width at nipple/chest just below armpit + neck taper
    valid_torso = np.isfinite(torso_rx) & (heights >= y_crotch * 0.92) & (heights < y_armpit)
    if valid_torso.any():
        upper_chest_w = float(np.percentile(torso_rx[valid_torso], 90))
        shoulder_torso_w = min(upper_chest_w * 1.08, spec.height * 0.115)
        for i, h_m in enumerate(heights):
            if np.isnan(torso_rx[i]):
                if y_armpit <= h_m < y_neck:
                    t = (h_m - y_armpit) / max(1e-4, y_neck - y_armpit)
                    torso_rx[i] = upper_chest_w * (1.0 - t) + 0.058 * t if t > 0.6 else (
                        upper_chest_w * (1.0 - t / 0.6) + shoulder_torso_w * (t / 0.6)
                    )
                else:
                    torso_rx[i] = upper_chest_w

    torso_rx = interp_array(torso_rx, 0.155, 3)
    head_rx = interp_array(head_rx, 0.075, 2)
    # Sync front_torso_bounds where interpolated
    for i in range(N_SAMP):
        if not np.isfinite(front_torso_bounds[i, 0]) or front_torso_bounds[i, 1] <= front_torso_bounds[i, 0]:
            px_w = torso_rx[i] / scale
            front_torso_bounds[i] = [cx - px_w, cx + px_w]

    # Sync missing arm centers near shoulder/deltoid and snap merged rows inside the actual silhouette edge
    i_sh = int(np.searchsorted(heights, y_shoulder))
    for arr_cx, arr_rx, arr_b, side in (
        (arm_l_cx, arm_l_rx, front_arm_l_bounds, -1.0),
        (arm_r_cx, arm_r_rx, front_arm_r_bounds, 1.0),
    ):
        has = arr_b[:, 1] > arr_b[:, 0]
        if has.any():
            hi = np.where(has)[0]
            h_hi = int(hi[-1])
            idx = np.arange(N_SAMP)
            arr_cx[:] = np.interp(idx, hi, arr_cx[hi])
            arr_rx[:] = smooth_1d(np.interp(idx, hi, arr_rx[hi]), 2)
            arr_b[:, 0] = np.interp(idx, hi, arr_b[hi, 0])
            arr_b[:, 1] = np.interp(idx, hi, arr_b[hi, 1])

            ref_w = max(8.0, float(np.median(arr_b[hi, 1] - arr_b[hi, 0])))
            # Above hi[0], trace just inside the outer silhouette edge on merged sleeve/deltoid rows,
            # freezing at y_shoulder - 0.012 so upper shoulder caps never drift outside the matte.
            last_valid_bounds = arr_b[int(hi[0])].copy()
            for ii in range(int(hi[0]), N_SAMP):
                if has[ii]:
                    last_valid_bounds = arr_b[ii].copy()
                    continue
                ry = max(fy0, min(fy1, int(round(fy1 - heights[ii] / scale))))
                xs_row = np.nonzero(front_mask[ry])[0]
                if xs_row.size < 12 or heights[ii] > y_shoulder - 0.012:
                    arr_b[ii] = last_valid_bounds
                    continue
                if side < 0:  # char Left -> viewer Right (> cx)
                    outer_x = float(xs_row[-1]) - 2.0
                    inner_x = max(cx + 4.0, outer_x - ref_w)
                    if outer_x - inner_x >= 6.0:
                        arr_b[ii] = [inner_x, outer_x]
                        mid = 0.5 * (inner_x + outer_x)
                        arr_cx[ii] = -(mid - cx) * scale
                        last_valid_bounds = arr_b[ii].copy()
                    else:
                        arr_b[ii] = last_valid_bounds
                else:  # char Right -> viewer Left (< cx)
                    outer_x = float(xs_row[0]) + 2.0
                    inner_x = min(cx - 4.0, outer_x + ref_w)
                    if inner_x - outer_x >= 6.0:
                        arr_b[ii] = [outer_x, inner_x]
                        mid = 0.5 * (outer_x + inner_x)
                        arr_cx[ii] = (cx - mid) * scale
                        last_valid_bounds = arr_b[ii].copy()
                    else:
                        arr_b[ii] = last_valid_bounds

    # Legs interpolation cleanly across crouch/shoes
    for arr_cx, arr_rx, arr_b in (
        (leg_l_cx, leg_l_rx, front_leg_l_bounds),
        (leg_r_cx, leg_r_rx, front_leg_r_bounds),
    ):
        has = arr_b[:, 1] > arr_b[:, 0]
        if has.any():
            hi = np.where(has)[0]
            idx = np.arange(N_SAMP)
            arr_cx[:] = smooth_1d(np.interp(idx, hi, arr_cx[hi]), 2)
            arr_rx[:] = smooth_1d(np.interp(idx, hi, arr_rx[hi]), 2)
            arr_b[:, 0] = np.interp(idx, hi, arr_b[hi, 0])
            arr_b[:, 1] = np.interp(idx, hi, arr_b[hi, 1])

    # Profile panel front/back Z extents per normalized height
    torso_rz_front = np.full(N_SAMP, 0.11)
    torso_rz_back = np.full(N_SAMP, 0.11)
    head_rz_front = np.full(N_SAMP, 0.095)
    head_rz_back = np.full(N_SAMP, 0.105)
    ponytail_rz_back = np.zeros(N_SAMP)
    prof_z_bounds = np.zeros((N_SAMP, 2), dtype=np.float32)

    p_scale = spec.height / float(p_h)
    for i, h_m in enumerate(heights):
        ry = max(py0, min(py1, int(round(py1 - h_m / p_scale))))
        runs = row_runs(prof_mask[ry])
        if not runs:
            continue
        # Main body run is the longest or leftmost/frontmost main column; ponytail on Mark appears behind nape as separate run!
        main_run = max(runs, key=lambda r: r[1] - r[0])
        r0, r1 = main_run
        z0 = sign_z * (r0 - prof_spine_x) * p_scale
        z1 = sign_z * (r1 - prof_spine_x) * p_scale
        zf, zb = min(z0, z1), max(z0, z1)  # negative is front (-Z), positive is back (+Z)
        prof_z_bounds[i] = [r0, r1]
        if h_m >= y_chin:
            head_rz_front[i] = max(0.04, -zf)
            head_rz_back[i] = max(0.04, zb)
        else:
            torso_rz_front[i] = max(0.045, min(0.22, -zf))
            torso_rz_back[i] = max(0.045, min(0.22, zb))

        # Mark's ponytail (or behind-neck detached/protruding tail)
        if spec.has_ponytail and y_shoulder - 0.08 <= h_m <= y_head_center(spec, y_chin):
            back_edge = max(b if sign_z > 0 else -a for a, b in runs)
            ponytail_rz_back[i] = max(0.0, back_edge - max(zb / p_scale, head_rz_back[i] / p_scale)) * p_scale

    torso_rz_front = smooth_1d(torso_rz_front, 3)
    torso_rz_back = smooth_1d(torso_rz_back, 3)
    head_rz_front = smooth_1d(head_rz_front, 2)
    head_rz_back = smooth_1d(head_rz_back, 2)

    skirt_rx = np.where(heights >= y_skirt_hem, torso_rx, 0.22)
    skirt_rz = np.where(heights >= y_skirt_hem, 0.5 * (torso_rz_front + torso_rz_back), 0.14)

    return CharacterEnvelope(
        spec=spec,
        y_top=fy0,
        y_bot=fy1,
        cx=cx,
        scale_m_per_px=scale,
        heights=heights,
        torso_rx=torso_rx,
        torso_rz_front=torso_rz_front,
        torso_rz_back=torso_rz_back,
        head_rx=head_rx,
        head_rz_front=head_rz_front,
        head_rz_back=head_rz_back,
        ponytail_rz_back=ponytail_rz_back,
        arm_l_cx=arm_l_cx,
        arm_l_rx=arm_l_rx,
        arm_r_cx=arm_r_cx,
        arm_r_rx=arm_r_rx,
        leg_l_cx=leg_l_cx,
        leg_l_rx=leg_l_rx,
        leg_r_cx=leg_r_cx,
        leg_r_rx=leg_r_rx,
        skirt_rx=skirt_rx,
        skirt_rz=skirt_rz,
        front_torso_bounds=front_torso_bounds,
        front_arm_l_bounds=front_arm_l_bounds,
        front_arm_r_bounds=front_arm_r_bounds,
        front_leg_l_bounds=front_leg_l_bounds,
        front_leg_r_bounds=front_leg_r_bounds,
        prof_top=py0,
        prof_bot=py1,
        prof_spine_x=prof_spine_x,
        prof_z_bounds=prof_z_bounds,
        y_crotch=y_crotch,
        y_armpit=y_armpit,
        y_shoulder=y_shoulder,
        y_neck=y_neck,
        y_chin=y_chin,
        y_eye=y_eye,
        y_nose=y_nose,
        y_skirt_hem=y_skirt_hem,
        y_hip_joint=y_hip_joint,
        y_knee_joint=y_knee_joint,
        q3_top=qy0,
        q3_bot=qy1,
        q3_cx=q3_cx,
    )


def y_head_center(spec: CharacterSpec, y_chin: float) -> float:
    return 0.5 * (spec.height + y_chin)


# ---------------------------------------------------------------------------
# 3. High-resolution photo texture baking & clean back synthesis
# ---------------------------------------------------------------------------


def bilinear_sample(img: np.ndarray, u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """Sample (H, W, C) image at float coordinates (u=x, v=y)."""
    h, w = img.shape[:2]
    uc = np.clip(u, 0.0, w - 1.001)
    vc = np.clip(v, 0.0, h - 1.001)
    x0 = uc.astype(np.int32)
    y0 = vc.astype(np.int32)
    fx = (uc - x0)[..., None]
    fy = (vc - y0)[..., None]
    return (
        img[y0, x0] * (1.0 - fx) * (1.0 - fy)
        + img[y0, x0 + 1] * fx * (1.0 - fy)
        + img[y0 + 1, x0] * (1.0 - fx) * fy
        + img[y0 + 1, x0 + 1] * fx * fy
    )


def dilate_rgb_uv(tex: np.ndarray, mask: np.ndarray, passes: int = 12) -> np.ndarray:
    """Dilate valid texels outward into UV gutter padding so mipmaps don't bleed black."""
    h, w, _ = tex.shape
    col = tex.copy()
    filled = mask.copy()
    col[~filled] = 0.0
    acc = np.empty_like(col)
    cnt = np.empty((h, w), dtype=np.float32)
    for _ in range(passes):
        if filled.all():
            break
        acc.fill(0.0)
        cnt.fill(0.0)
        acc[1:, :] += col[:-1, :]
        acc[:-1, :] += col[1:, :]
        acc[:, 1:] += col[:, :-1]
        acc[:, :-1] += col[:, 1:]
        cnt[1:, :] += filled[:-1, :]
        cnt[:-1, :] += filled[1:, :]
        cnt[:, 1:] += filled[:, :-1]
        cnt[:, :-1] += filled[:, 1:]
        acc[1:, 1:] += col[:-1, :-1]
        acc[1:, :-1] += col[:-1, 1:]
        acc[:-1, 1:] += col[1:, :-1]
        acc[:-1, :-1] += col[1:, 1:]
        cnt[1:, 1:] += filled[:-1, :-1]
        cnt[1:, :-1] += filled[:-1, 1:]
        cnt[:-1, 1:] += filled[1:, :-1]
        cnt[:-1, :-1] += filled[1:, 1:]
        upd = (~filled) & (cnt > 0.0)
        if not upd.any():
            break
        col[upd] = acc[upd] / cnt[upd, None]
        filled |= upd
    return col


def upscale_sharpen(rgb: np.ndarray, factor: int = 3) -> np.ndarray:
    im = Image.fromarray(rgb, "RGB")
    up = im.resize((im.width * factor, im.height * factor), Image.Resampling.LANCZOS)
    up = up.filter(ImageFilter.UnsharpMask(radius=2.2, percent=85, threshold=2))
    return np.asarray(up, dtype=np.uint8)


def extract_back_cloth_row_swatches(
    front_rgba: np.ndarray,
    prof_rgba: np.ndarray,
    env: CharacterEnvelope,
) -> np.ndarray:
    """For each normalized height row in N_SAMP, build clean un-pocketed back garment colors.

    Samples inner fabric away from front center plackets/buttons/buckles and
    blends with the rear silhouette columns of the Profile panel so backs match
    shirt/trouser/dress/jacket fabrics without mirrored lapels, buttons, or faces.
    """
    swatches = np.zeros((N_SAMP, 32, 3), dtype=np.float32)
    scale = env.scale_m_per_px
    p_scale = env.spec.height / float(max(1, env.prof_bot - env.prof_top))
    sign_z = -1.0 if env.spec.profile_faces == "right" else 1.0

    for i, h_m in enumerate(env.heights):
        fy = max(env.y_top, min(env.y_bot, int(round(env.y_bot - h_m / scale))))
        py = max(env.prof_top, min(env.prof_bot, int(round(env.prof_bot - h_m / p_scale))))

        # Clean Front off-center fabric columns (around +/- 55%..80% of torso half-width to avoid zipper/buttons/buckle)
        tx0, tx1 = env.front_torso_bounds[i]
        tw = max(4.0, (tx1 - tx0) * 0.5)
        samples = []
        for s_frac in (-0.72, -0.58, 0.58, 0.72):
            fx = int(round(env.cx + s_frac * tw))
            fx = max(0, min(front_rgba.shape[1] - 1, fx))
            if front_rgba[fy, fx, 3] > 0.5:
                samples.append(front_rgba[fy, fx, :3])

        # Clean Profile rear columns (3..10 px inside rear silhouette edge)
        pr0, pr1 = env.prof_z_bounds[i]
        if sign_z < 0:  # profile faces right -> back is at smaller x (pr0)
            rear_cols = np.linspace(pr0 + 4, min(pr1 - 3, pr0 + 18), 8)
        else:  # profile faces left -> back is at larger x (pr1)
            rear_cols = np.linspace(pr1 - 4, max(pr0 + 3, pr1 - 18), 8)
        rear_cols = np.clip(np.round(rear_cols).astype(np.int32), 0, prof_rgba.shape[1] - 1)
        p_cols = prof_rgba[py, rear_cols, :3]

        base = np.mean(samples, axis=0) if samples else np.mean(p_cols, axis=0)
        p_mid = np.median(p_cols, axis=0)
        # Subtle back center seam / fold modulation + shoulder shading
        u_arr = np.linspace(-1.0, 1.0, 32, dtype=np.float32)
        fold = 1.0 - 0.08 * np.exp(-((u_arr / 0.14) ** 2)) - 0.04 * (u_arr ** 2)
        row_col = (0.42 * base + 0.58 * p_mid)[None, :] * fold[:, None]
        # Blend outer sides gently toward rear profile edge color
        edge_w = np.clip(np.abs(u_arr) - 0.45, 0.0, 0.55)[:, None] / 0.55
        row_col = row_col * (1.0 - 0.5 * edge_w) + p_mid[None, :] * (0.5 * edge_w)
        swatches[i] = np.clip(row_col, 0.0, 1.0)
    return swatches


def generate_face_texture(
    front_rgb: np.ndarray,
    front_mask: np.ndarray,
    prof_rgb: np.ndarray,
    prof_mask: np.ndarray,
    q3_rgb: np.ndarray,
    q3_mask: np.ndarray,
    env: CharacterEnvelope,
    size: int = 512,
) -> tuple[Image.Image, np.ndarray]:
    """Bake 512x512 photo-sharp face+head+hair texture (RGB)."""
    h_lo = max(env.y_shoulder - 0.02, env.y_neck - 0.06)
    h_hi = env.spec.height
    p_scale = env.spec.height / float(max(1, env.prof_bot - env.prof_top))

    # Crop each panel around the head/neck/upper-shoulder region before 3x upscaling (~7x faster)
    fy_min = max(0, int(math.floor(env.y_bot - h_hi / env.scale_m_per_px)) - 12)
    fy_max = min(front_rgb.shape[0], int(math.ceil(env.y_bot - h_lo / env.scale_m_per_px)) + 20)
    f_up = upscale_sharpen(front_rgb[fy_min:fy_max], 3)
    f_mask_up = np.repeat(np.repeat(front_mask[fy_min:fy_max], 3, axis=0), 3, axis=1)
    f4_rgba = build_dilated_rgba(f_up, f_mask_up, passes=48)

    py_min = max(0, int(math.floor(env.prof_bot - h_hi / p_scale)) - 12)
    py_max = min(prof_rgb.shape[0], int(math.ceil(env.prof_bot - h_lo / p_scale)) + 20)
    p_up = upscale_sharpen(prof_rgb[py_min:py_max], 3)
    p_mask_up = np.repeat(np.repeat(prof_mask[py_min:py_max], 3, axis=0), 3, axis=1)
    p4_rgba = build_dilated_rgba(p_up, p_mask_up, passes=48)

    tex = np.zeros((size, size, 3), dtype=np.float32)

    # Hair crown base color for clean crown cap
    hair_ys = np.arange(env.y_top, env.y_top + max(6, int(0.055 / env.scale_m_per_px)))
    hair_samples = front_rgb[np.clip(hair_ys, 0, front_rgb.shape[0] - 1)]
    hair_m = front_mask[np.clip(hair_ys, 0, front_rgb.shape[0] - 1)]
    hair_col = (
        np.median(hair_samples[hair_m], axis=0).astype(np.float32) / 255.0
        if hair_m.any()
        else np.array([0.22, 0.18, 0.15], dtype=np.float32)
    )

    sign_z = -1.0 if env.spec.profile_faces == "right" else 1.0

    vv = np.linspace(0.0, 1.0, size, dtype=np.float32)[:, None]
    uu = np.linspace(0.0, 1.0, size, dtype=np.float32)[None, :]
    hs = h_hi - vv * (h_hi - h_lo)
    thetas = face_u_to_theta(uu)  # [-pi, pi], 0 front (-Z), +pi/2 Left (-X), -pi/2 Right (+X)

    rxs = np.interp(hs[:, 0], env.heights, env.head_rx)
    rzf = np.interp(hs[:, 0], env.heights, env.head_rz_front)
    rzb = np.interp(hs[:, 0], env.heights, env.head_rz_back)
    rzs = np.where(np.cos(thetas) >= 0.0, rzf[:, None], rzb[:, None])
    xs = -rxs[:, None] * np.sin(thetas)
    zs = -rzs * np.cos(thetas)

    # Map Front: px_f within cropped f4_rgba
    px_f = (env.cx - (xs * 0.94) / env.scale_m_per_px) * 3.0
    py_f = ((env.y_bot - hs / env.scale_m_per_px) - fy_min) * 3.0
    cf_s = bilinear_sample(f4_rgba, px_f, py_f)
    hs_1d = hs[:, 0]
    hair_band = (hs_1d >= env.y_eye + 0.005)[:, None, None]
    cf = np.where(hair_band, cf_s[..., :3] * cf_s[..., 3:4] + hair_col[None, None, :] * (1.0 - cf_s[..., 3:4]), cf_s[..., :3])

    # Map Profile: z = sign_z * (px - prof_spine_x) * p_scale => px = prof_spine_x + sign_z * (z / p_scale)
    px_p = (env.prof_spine_x + sign_z * (zs * 0.94) / p_scale) * 3.0
    py_p = ((env.prof_bot - hs / p_scale) - py_min) * 3.0
    cp_s = bilinear_sample(p4_rgba, px_p, py_p)
    cp = np.where(hair_band, cp_s[..., :3] * cp_s[..., 3:4] + hair_col[None, None, :] * (1.0 - cp_s[..., 3:4]), cp_s[..., :3])

    cos_t = np.cos(thetas)
    sin_t = np.sin(thetas)
    # Keep full front face (cheeks/jaw/beard) from Front photo without early side seam!
    wf = np.clip((cos_t + 0.12) / 0.85, 0.0, 1.0) ** 1.15
    on_prof_side = (sin_t <= 0.08) if env.spec.profile_faces == "right" else (sin_t >= -0.08)
    wb = np.clip((-cos_t - 0.15) / 0.65, 0.0, 1.0) ** 1.3

    # Opposite cheek/ear: blend inward front edge with matching profile ear/hair (never mirror Victor's neck tattoo)
    px_f_opp = (env.cx - np.sign(xs) * np.minimum(np.abs(xs), rxs[:, None] * 0.88) / env.scale_m_per_px) * 3.0
    cf_opp_s = bilinear_sample(f4_rgba, px_f_opp, py_f)
    cf_opp = np.where(hair_band, cf_opp_s[..., :3] * cf_opp_s[..., 3:4] + hair_col[None, None, :] * (1.0 - cf_opp_s[..., 3:4]), cf_opp_s[..., :3])
    col_opp = 0.55 * cf_opp + 0.45 * cp
    if env.spec.name == "victor":
        right_neck = (sin_t < -0.15) & (hs < env.y_chin + 0.02)
        col_opp = np.where(right_neck[:, :, None], cf_opp, col_opp)

    # Rear of skull + nape hair: + sign_z * rzb maps to rear edge of Profile panel!
    nape_px = (env.prof_spine_x + sign_z * (rzb[:, None] * 0.72) / p_scale) * 3.0
    cb_s = bilinear_sample(p4_rgba, nape_px, py_p)
    c_back_prof = cb_s[..., :3] * cb_s[..., 3:4] + hair_col[None, None, :] * (1.0 - cb_s[..., 3:4])
    strand_noise = np.sin(uu * 310.0) * 0.025 + np.sin(uu * 730.0 + vv * 14.0) * 0.015
    back_hair_shade = np.clip(c_back_prof + strand_noise[:, :, None], 0.0, 1.0)
    c_back = np.where(
        (hs_1d > env.spec.height - 0.055)[:, None, None],
        0.4 * back_hair_shade + 0.6 * hair_col[None, None, :],
        back_hair_shade,
    )

    side_col = np.where(on_prof_side[:, :, None], cp, col_opp)
    ws = np.clip(np.abs(sin_t) - 0.52, 0.0, 1.0) ** 1.35 * (1.0 - wb * 0.55)
    w_tot = wf + ws + wb + 1e-6
    tex = (cf * wf[:, :, None] + side_col * ws[:, :, None] + c_back * wb[:, :, None]) / w_tot[:, :, None]
    crown_w = (np.clip((hs_1d - (env.spec.height - 0.045)) / 0.040, 0.0, 1.0) ** 1.25)[:, None, None]
    tex = tex * (1.0 - crown_w * 0.85) + hair_col[None, None, :] * (crown_w * 0.85)

    # Crystal specific postmortem realism: gently close eyelids at true iris row and add subtle left-temple contusion
    if env.spec.has_crystal_fx:
        # Left temple contusion subtly tinted under left fringe (theta ~ +0.75..+1.15 rad = left temple -X, -Z)
        t_dist = ((thetas - 0.88) / 0.24) ** 2 + ((hs - (env.y_eye + 0.012)) / 0.022) ** 2
        bruise_w = np.clip(1.0 - t_dist, 0.0, 1.0) ** 1.5 * 0.48
        bruise_col = np.array([0.33, 0.23, 0.26], dtype=np.float32)
        tex = tex * (1.0 - bruise_w[:, :, None]) + bruise_col[None, None, :] * bruise_w[:, :, None]

        # Locate Crystal's actual pupils vertically inside tex (between v=0.38 and v=0.62)
        u_mid = size // 2
        eye_search_y0, eye_search_y1 = int(size * 0.36), int(size * 0.60)
        ex_l0, ex_l1 = u_mid - int(0.08 * size), u_mid - int(0.03 * size)
        ex_r0, ex_r1 = u_mid + int(0.03 * size), u_mid + int(0.08 * size)
        lum_patch_l = tex[eye_search_y0:eye_search_y1, ex_l0:ex_l1].mean(axis=(1, 2))
        lum_patch_r = tex[eye_search_y0:eye_search_y1, ex_r0:ex_r1].mean(axis=(1, 2))
        eye_row = eye_search_y0 + int(np.argmin(lum_patch_l + lum_patch_r))
        # Cheek / lower-lid skin reference just below the lower lashes (always clean skin, never fringe)
        cheek_row0 = min(size - 8, eye_row + int(0.022 * size))
        for side_s in (-1, 1):
            ec = u_mid + int(side_s * 0.056 * size)
            ew = int(0.028 * size)
            eh = int(0.014 * size)
            y0, y1 = max(2, eye_row - eh), min(size - 3, eye_row + eh)
            x0, x1 = max(2, ec - ew), min(size - 3, ec + ew)
            lid_patch = np.median(tex[cheek_row0 : cheek_row0 + 5, x0:x1], axis=0, keepdims=True)
            yy = np.linspace(-1.0, 1.0, y1 - y0)[:, None, None]
            xx = np.linspace(-1.0, 1.0, x1 - x0)[None, :, None]
            eye_mask = np.clip(1.0 - (xx * xx + yy * yy * 1.4), 0.0, 1.0) ** 0.75
            tex[y0:y1, x0:x1] = tex[y0:y1, x0:x1] * (1.0 - 0.88 * eye_mask) + lid_patch * (0.88 * eye_mask)
            lash_curve = np.exp(-(((yy - (0.35 - 0.22 * (1.0 - xx * xx))) / 0.24) ** 2)) * np.clip(1.0 - xx * xx, 0.0, 1.0)
            lash_col = np.array([0.28, 0.22, 0.18], dtype=np.float32)
            tex[y0:y1, x0:x1] = tex[y0:y1, x0:x1] * (1.0 - 0.55 * lash_curve) + lash_col[None, None, :] * (0.55 * lash_curve)

    tex_u8 = (np.clip(tex, 0.0, 1.0) * 255.0).astype(np.uint8)
    return Image.fromarray(tex_u8, "RGB"), hair_col


def face_u_to_theta(u: np.ndarray) -> np.ndarray:
    """Inverse of theta -> u mapping where central 56% maps [-pi/2, +pi/2] for high face resolution."""
    u0 = np.clip(u, 0.0, 1.0)
    front_span = 0.56
    a = 0.5 - front_span * 0.5
    b = 0.5 + front_span * 0.5
    half_pi = math.pi * 0.5
    out = np.empty_like(u0)
    in_front = (u0 >= a) & (u0 <= b)
    in_left_back = u0 > b
    in_right_back = u0 < a
    out[in_front] = ((u0[in_front] - 0.5) / (front_span * 0.5)) * half_pi
    out[in_left_back] = half_pi + ((u0[in_left_back] - b) / (1.0 - b)) * half_pi
    out[in_right_back] = -math.pi + (u0[in_right_back] / a) * half_pi
    return out


def face_theta_to_u(theta: np.ndarray) -> np.ndarray:
    """Map theta in [-pi, pi] (0=front, +pi/2=left, -pi/2=right) to u in [0, 1]."""
    front_span = 0.56
    a = 0.5 - front_span * 0.5
    b = 0.5 + front_span * 0.5
    half_pi = math.pi * 0.5
    t = np.arctan2(np.sin(theta), np.cos(theta))
    u = np.empty_like(t)
    in_f = np.abs(t) <= half_pi
    in_lb = t > half_pi
    in_rb = t < -half_pi
    u[in_f] = 0.5 + (t[in_f] / half_pi) * (front_span * 0.5)
    u[in_lb] = b + ((t[in_lb] - half_pi) / half_pi) * (1.0 - b)
    u[in_rb] = ((t[in_rb] + math.pi) / half_pi) * a
    return u


def generate_body_atlas(
    front_rgb: np.ndarray,
    front_mask: np.ndarray,
    prof_rgb: np.ndarray,
    prof_mask: np.ndarray,
    env: CharacterEnvelope,
    size: int = 1024,
) -> Image.Image:
    """Bake a single clean UV-chart-packed body atlas (1024x1024):
    Chart regions [u0, u1, v0, v1] where v=0 is PNG TOP and v=1 is PNG BOTTOM:
      - Torso/Skirt/Pelvis : u [0.01..0.47], v [0.01..0.55]
      - Arm Left  (-X)     : u [0.50..0.73], v [0.01..0.55]
      - Arm Right (+X)     : u [0.76..0.99], v [0.01..0.55]
      - Leg Left  (-X)     : u [0.01..0.48], v [0.58..0.99]
      - Leg Right (+X)     : u [0.52..0.99], v [0.58..0.99]
    """
    f_rgba = build_dilated_rgba(front_rgb, front_mask, passes=24)
    p_rgba = build_dilated_rgba(prof_rgb, prof_mask, passes=24)
    back_swatches = extract_back_cloth_row_swatches(f_rgba, p_rgba, env)

    tex = np.zeros((size, size, 3), dtype=np.float32)
    mask_written = np.zeros((size, size), dtype=bool)
    scale = env.scale_m_per_px
    p_scale = env.spec.height / float(max(1, env.prof_bot - env.prof_top))
    sign_z = -1.0 if env.spec.profile_faces == "right" else 1.0

    def px_rect(u0: float, u1: float, v0: float, v1: float) -> tuple[int, int, int, int]:
        return (
            int(round(u0 * (size - 1))),
            int(round(u1 * (size - 1))),
            int(round(v0 * (size - 1))),
            int(round(v1 * (size - 1))),
        )

    # ---- 1. TORSO CHART ----
    tx0, tx1, ty0, ty1 = px_rect(0.01, 0.47, 0.01, 0.55)
    tw = tx1 - tx0 + 1
    th = ty1 - ty0 + 1
    t_h_lo = max(0.0, env.y_skirt_hem if env.spec.is_skirt else env.y_crotch - 0.06)
    t_h_hi = env.y_neck + 0.03
    uu_t = np.linspace(0.0, 1.0, tw, dtype=np.float32)[None, :]
    vv_t = np.linspace(0.0, 1.0, th, dtype=np.float32)[:, None]
    hs_t = t_h_hi - vv_t * (t_h_hi - t_h_lo)
    # theta: 0 at front (-Z), +pi/2 left (-X), -pi/2 right (+X), +-pi back (+Z)
    th_t = (uu_t - 0.5) * (2.0 * math.pi)
    ih_t = np.clip(np.round((hs_t[:, 0] / env.spec.height) * (N_SAMP - 1)).astype(np.int32), 0, N_SAMP - 1)
    # Sample front torso strictly within front_torso_bounds (clamped 4% inside edge)
    b0_t = env.front_torso_bounds[ih_t, 0]
    b1_t = env.front_torso_bounds[ih_t, 1]
    tmid = 0.5 * (b0_t + b1_t)
    thalf = np.maximum(3.0, 0.5 * (b1_t - b0_t) * 0.90)
    # In Front image, px > cx is left (-X, sin_t > 0) -> x_local = -sin(th_t) -> px = tmid + sin(th_t) * thalf
    fpx_t = tmid[:, None] + np.sin(th_t) * thalf[:, None]
    fpy_t = env.y_bot - hs_t / scale
    cf_t = bilinear_sample(f_rgba, fpx_t, fpy_t)[..., :3]

    # Sample Profile torso strictly inside prof_z_bounds
    pb0_t = env.prof_z_bounds[ih_t, 0]
    pb1_t = env.prof_z_bounds[ih_t, 1]
    pmid = 0.5 * (pb0_t + pb1_t)
    phalf = np.maximum(3.0, 0.5 * (pb1_t - pb0_t) * 0.88)
    # cos(th_t) = +1 front, -1 back. If faces right (sign_z=-1), front is max X (pmid + phalf)
    ppx_t = pmid[:, None] - sign_z * np.cos(th_t) * phalf[:, None]
    ppy_t = env.prof_bot - hs_t / p_scale
    cp_t = bilinear_sample(p_rgba, ppx_t, ppy_t)[..., :3]

    # Clean back swatches
    u_sw = np.linspace(0.0, 31.0, tw, dtype=np.float32)[None, :]
    cb_t = np.zeros((th, tw, 3), dtype=np.float32)
    for r_idx in range(th):
        row_sw = back_swatches[ih_t[r_idx]]
        sw_idx = np.clip(np.round(u_sw[0]).astype(np.int32), 0, 31)
        cb_t[r_idx] = row_sw[sw_idx]

    cos_t = np.cos(th_t)
    sin_t = np.sin(th_t)
    wf = np.clip((cos_t - 0.08) / 0.92, 0.0, 1.0) ** 1.3
    ws = np.clip(np.abs(sin_t) - 0.15, 0.0, 1.0) ** 1.2 * (1.0 - np.clip((-cos_t) / 0.85, 0.0, 1.0) * 0.45)
    wb = np.clip((-cos_t - 0.05) / 0.75, 0.0, 1.0) ** 1.25
    # On Moretti's chest/waist belt pouches & Victor/Crystal asymmetry, keep Front/Profile dominant where appropriate
    w_sum = wf + ws + wb + 1e-6
    tex[ty0 : ty1 + 1, tx0 : tx1 + 1] = (
        cf_t * wf[:, :, None] + cp_t * ws[:, :, None] + cb_t * wb[:, :, None]
    ) / w_sum[:, :, None]
    mask_written[ty0 : ty1 + 1, tx0 : tx1 + 1] = True

    # ---- 2. ARMS L & R ----
    arm_hi = env.y_shoulder + 0.02
    arm_lo = max(0.28 * env.spec.height, env.y_crotch - 0.12)
    for side_tag, (u0, u1), b_arr in (
        ("l", (0.50, 0.73), env.front_arm_l_bounds),
        ("r", (0.76, 0.99), env.front_arm_r_bounds),
    ):
        ax0, ax1, ay0, ay1 = px_rect(u0, u1, 0.01, 0.55)
        aw, ah = ax1 - ax0 + 1, ay1 - ay0 + 1
        uu_a = np.linspace(0.0, 1.0, aw, dtype=np.float32)[None, :]
        vv_a = np.linspace(0.0, 1.0, ah, dtype=np.float32)[:, None]
        hs_a = arm_hi - vv_a * (arm_hi - arm_lo)
        # Clamp sample vertical lookup below the trapezius/shoulder slope so upper arm UV caps stay on sleeve fabric
        hs_samp = np.minimum(hs_a, env.y_shoulder - 0.015)
        ih_a = np.clip(np.round((hs_samp[:, 0] / env.spec.height) * (N_SAMP - 1)).astype(np.int32), 0, N_SAMP - 1)
        th_a = (uu_a - 0.5) * (2.0 * math.pi)
        ab0 = b_arr[ih_a, 0]
        ab1 = b_arr[ih_a, 1]
        amid = 0.5 * (ab0 + ab1)
        ahalf = np.maximum(2.0, 0.5 * (ab1 - ab0) * 0.78)
        fpx_a = amid[:, None] + np.sin(th_a) * ahalf[:, None]
        fpy_a = env.y_bot - hs_samp / scale
        cf_rgba = bilinear_sample(f_rgba, fpx_a, fpy_a)
        # Clean inner sleeve/skin sample from center 30% of the arm column (prevents grey armpit/rib leak on back of arm!)
        fpx_center = amid[:, None] + np.sin(th_a) * (ahalf[:, None] * 0.35)
        cc_rgba = bilinear_sample(f_rgba, fpx_center, fpy_a)
        # Safe interior torso/shoulder sleeve fallback in case of silhouette edge gap
        t_edge_x = env.cx + (1.0 if side_tag == "l" else -1.0) * (env.torso_rx[ih_a] * 0.85 / scale)
        cs_safe = bilinear_sample(f_rgba, t_edge_x[:, None], fpy_a)[..., :3]
        cc_a = np.where(cc_rgba[..., 3:4] > 0.25, cc_rgba[..., :3], cs_safe) * 0.92
        alpha_f = np.clip(cf_rgba[..., 3], 0.0, 1.0)
        cf_a = cf_rgba[..., :3] * alpha_f[:, :, None] + cc_a * (1.0 - alpha_f)[:, :, None]
        # Outer profile match for forearm/bicep if visible on matching profile side
        is_prof_arm = (side_tag == "r" and env.spec.profile_faces == "right") or (
            side_tag == "l" and env.spec.profile_faces == "left"
        )
        if is_prof_arm:
            pb0_a = env.prof_z_bounds[ih_a, 0]
            pb1_a = env.prof_z_bounds[ih_a, 1]
            pamid = 0.5 * (pb0_a + pb1_a)
            ppx_a = pamid[:, None] - sign_z * np.cos(th_a) * np.maximum(3.0, (pb1_a - pb0_a) * 0.16)[:, None]
            ppy_a = env.prof_bot - hs_samp / p_scale
            cp_rgba = bilinear_sample(p_rgba, ppx_a, ppy_a)
            alpha_p = np.clip(cp_rgba[..., 3], 0.0, 1.0)
            cp_a = cp_rgba[..., :3] * alpha_p[:, :, None] + cc_a * (1.0 - alpha_p)[:, :, None]
            w_out = np.clip((np.sin(th_a) * (-1.0 if side_tag == "r" else 1.0) - 0.1), 0.0, 1.0)
            w_fr = np.clip((np.cos(th_a) + 0.35) / 1.35, 0.0, 1.0)
            arm_col = (cf_a * w_fr[:, :, None] + cp_a * w_out[:, :, None] + cc_a * (1.0 - w_fr * 0.6)[:, :, None]) / (
                w_fr + w_out + (1.0 - w_fr * 0.6) + 1e-6
            )[:, :, None]
        else:
            w_fr = np.clip((np.cos(th_a) + 0.45) / 1.45, 0.0, 1.0)
            arm_col = cf_a * w_fr[:, :, None] + cc_a * (1.0 - w_fr)[:, :, None]

        # Crystal dependent postmortem lividity on lower forearms & hands (< 0.48*H)
        if env.spec.has_crystal_fx:
            livid_w = np.clip((env.spec.height * 0.52 - hs_a) / 0.14, 0.0, 1.0) * 0.34
            livid_tint = np.array([0.46, 0.39, 0.43], dtype=np.float32)
            arm_col = arm_col * (1.0 - livid_w[:, :, None]) + livid_tint[None, None, :] * livid_w[:, :, None]

        tex[ay0 : ay1 + 1, ax0 : ax1 + 1] = arm_col
        mask_written[ay0 : ay1 + 1, ax0 : ax1 + 1] = True

    # ---- 3. LEGS L & R (THIGH + SHIN + SHOE) ----
    leg_hi = env.y_crotch + 0.03
    leg_lo = 0.0
    for side_tag, (u0, u1), b_arr in (
        ("l", (0.01, 0.48), env.front_leg_l_bounds),
        ("r", (0.52, 0.99), env.front_leg_r_bounds),
    ):
        lx0, lx1, ly0, ly1 = px_rect(u0, u1, 0.58, 0.99)
        lw, lh = lx1 - lx0 + 1, ly1 - ly0 + 1
        uu_l = np.linspace(0.0, 1.0, lw, dtype=np.float32)[None, :]
        vv_l = np.linspace(0.0, 1.0, lh, dtype=np.float32)[:, None]
        hs_l = leg_hi - vv_l * (leg_hi - leg_lo)
        ih_l = np.clip(np.round((hs_l[:, 0] / env.spec.height) * (N_SAMP - 1)).astype(np.int32), 0, N_SAMP - 1)
        th_l = (uu_l - 0.5) * (2.0 * math.pi)
        lb0 = b_arr[ih_l, 0]
        lb1 = b_arr[ih_l, 1]
        lmid = 0.5 * (lb0 + lb1)
        lhalf = np.maximum(2.0, 0.5 * (lb1 - lb0) * 0.78)
        fpx_l = lmid[:, None] + np.sin(th_l) * lhalf[:, None]
        fpy_l = env.y_bot - hs_l / scale
        cf_l = bilinear_sample(f_rgba, fpx_l, fpy_l)[..., :3]

        # Profile leg projection for outer sides & sneaker/boot sides
        pb0_l = env.prof_z_bounds[ih_l, 0]
        pb1_l = env.prof_z_bounds[ih_l, 1]
        plmid = 0.5 * (pb0_l + pb1_l)
        plhalf = np.maximum(3.0, 0.5 * (pb1_l - pb0_l) * 0.80)
        ppx_l = plmid[:, None] - sign_z * np.cos(th_l) * plhalf[:, None]
        ppy_l = env.prof_bot - hs_l / p_scale
        cp_l = bilinear_sample(p_rgba, ppx_l, ppy_l)[..., :3]

        # Inner / rear trouser or bare calf swatch from center of that leg
        fpx_l_mid = lmid[:, None] + np.sin(th_l) * (lhalf[:, None] * 0.35)
        cb_l = bilinear_sample(f_rgba, fpx_l_mid, fpy_l)[..., :3] * 0.88

        w_f = np.clip((np.cos(th_l) + 0.15) / 1.15, 0.0, 1.0) ** 1.3
        w_s = np.clip(np.abs(np.sin(th_l)) - 0.10, 0.0, 1.0) ** 1.1
        w_b = np.clip((-np.cos(th_l) + 0.1) / 1.1, 0.0, 1.0) ** 1.2
        w_sum_l = w_f + w_s + w_b + 1e-6
        leg_col = (cf_l * w_f[:, :, None] + cp_l * w_s[:, :, None] + cb_l * w_b[:, :, None]) / w_sum_l[:, :, None]

        tex[ly0 : ly1 + 1, lx0 : lx1 + 1] = leg_col
        mask_written[ly0 : ly1 + 1, lx0 : lx1 + 1] = True

    tex = dilate_rgb_uv(tex, mask_written, passes=10)
    tex_u8 = (np.clip(tex, 0.0, 1.0) * 255.0).astype(np.uint8)
    return Image.fromarray(tex_u8, "RGB")


# ---------------------------------------------------------------------------
# 4. Smooth anatomical loft mesh builder (Three.js +Y up, -Z fwd, -X left)
# ---------------------------------------------------------------------------


@dataclass
class MeshData:
    positions: np.ndarray  # (V, 3) float32
    normals: np.ndarray    # (V, 3) float32
    uvs: np.ndarray        # (V, 2) float32
    indices: np.ndarray    # (F*3,) uint32 or uint16
    material_idx: int


def compute_smooth_normals(pos: np.ndarray, tris: np.ndarray) -> np.ndarray:
    norm = np.zeros_like(pos, dtype=np.float64)
    v0 = pos[tris[:, 0]]
    v1 = pos[tris[:, 1]]
    v2 = pos[tris[:, 2]]
    fn = np.cross(v1 - v0, v2 - v0)
    for k in range(3):
        np.add.at(norm, tris[:, k], fn)
    mag = np.linalg.norm(norm, axis=1, keepdims=True)
    norm /= np.maximum(mag, 1e-9)
    return norm.astype(np.float32)


def make_sphere_part(
    cx: float,
    cy: float,
    cz: float,
    rx: float,
    ry: float,
    rz: float,
    uv_point: tuple[float, float],
    material_idx: int = 0,
    n_seg: int = 16,
    n_rings: int = 10,
) -> MeshData:
    verts = []
    uvs = []
    for ir in range(n_rings + 1):
        phi = math.pi * (ir / float(n_rings))
        sp = math.sin(phi)
        cp = math.cos(phi)
        for isg in range(n_seg + 1):
            th = (isg / float(n_seg)) * 2.0 * math.pi
            x = cx - rx * sp * math.sin(th)
            y = cy + ry * cp
            z = cz - rz * sp * math.cos(th)
            verts.append([x, y, z])
            uvs.append([uv_point[0], uv_point[1]])
    tris = []
    stride = n_seg + 1
    for ir in range(n_rings):
        for isg in range(n_seg):
            a = ir * stride + isg
            b = a + 1
            c = a + stride
            d = c + 1
            tris.append([a, b, c])
            tris.append([b, d, c])
    p_arr = np.array(verts, dtype=np.float32)
    t_arr = np.array(tris, dtype=np.int32)
    return MeshData(
        positions=p_arr,
        normals=compute_smooth_normals(p_arr, t_arr),
        uvs=np.array(uvs, dtype=np.float32),
        indices=t_arr.ravel().astype(np.uint32),
        material_idx=material_idx,
    )


def make_torso_mesh(env: CharacterEnvelope, mat_idx: int) -> MeshData:
    """High-resolution anatomical loft for torso + pelvis / skirt in chest/hips space."""
    spec = env.spec
    hip_y = env.y_hip_joint
    h_lo = env.y_skirt_hem if spec.is_skirt else max(0.0, env.y_crotch - 0.05)
    h_hi = env.y_neck + 0.02

    n_rings = 40
    n_seg = 48
    hs = np.linspace(h_lo, h_hi, n_rings + 1)
    rxs = np.interp(hs, env.heights, env.torso_rx)
    rzf = np.interp(hs, env.heights, env.torso_rz_front)
    rzb = np.interp(hs, env.heights, env.torso_rz_back)
    if spec.is_skirt:
        skirt_zone = hs < env.y_crotch + 0.07
        rxs = np.where(skirt_zone, np.interp(hs, env.heights, env.skirt_rx), rxs)
        # Taper softly over waist & flare naturally over knees
        rzf = np.where(skirt_zone, rzf * 0.85 + 0.02, rzf)
        rzb = np.where(skirt_zone, rzb * 0.85 + 0.02, rzb)

    t_h_lo = max(0.0, env.y_skirt_hem if spec.is_skirt else env.y_crotch - 0.06)
    t_h_hi = env.y_neck + 0.03

    verts: list[list[float]] = []
    uvs: list[list[float]] = []

    # Bottom cap center (pelvis / skirt inside shadow)
    for ir, h_m in enumerate(hs):
        rx = float(rxs[ir])
        zf = float(rzf[ir])
        zb = float(rzb[ir])
        # Subtle shoulder cap taper near top of collarbone
        cap_s = 1.0
        if ir == 0:
            cap_s = 0.08 if not spec.is_skirt else 0.72
        elif ir == n_rings:
            cap_s = 0.35
        v_coord = 0.01 + ((t_h_hi - h_m) / max(1e-4, t_h_hi - t_h_lo)) * 0.54
        for isg in range(n_seg + 1):
            u_frac = isg / float(n_seg)
            th = (u_frac - 0.5) * (2.0 * math.pi)
            # Super-ellipse subtle anatomical chest/shoulder rounding (p=2.25)
            ct = math.cos(th)
            st = math.sin(th)
            denom = (abs(st) ** 2.25 + abs(ct) ** 2.25) ** (1.0 / 2.25)
            s_norm = st / max(1e-6, denom)
            c_norm = ct / max(1e-6, denom)
            rz = zf if ct >= 0.0 else zb
            # Belt / pouch subtle contour bump on Moretti around hip_y
            belt_bump = 0.0
            if spec.has_duty_belt and abs(h_m - (hip_y + 0.01)) < 0.038:
                belt_bump = 0.011
                # Two pouches on left hip (+theta around 1.1..1.9 rad), one on right (-1.5 rad)
                if (0.95 < th < 2.05) or (-1.85 < th < -1.15):
                    belt_bump = 0.024
            x = -(rx * cap_s + belt_bump) * s_norm
            z = -(rz * cap_s + belt_bump) * c_norm
            y = h_m - hip_y
            verts.append([x, y, z])
            uvs.append([0.01 + u_frac * 0.46, float(np.clip(v_coord, 0.01, 0.55))])

    tris: list[list[int]] = []
    stride = n_seg + 1
    for ir in range(n_rings):
        for isg in range(n_seg):
            a = ir * stride + isg
            b = a + 1
            c = a + stride
            d = c + 1
            # Winding: ascending ir goes +y; increasing isg goes +theta (front -> left -> back -> right)
            # From outside looking at front (-Z), +x right -> +theta goes toward -X (viewer RIGHT!), wait:
            # theta=0 (front -Z) -> theta=+pi/2 (-X) is RIGHTWARD on front face wait no!
            # Looking at character front (-Z facing viewer at -Z looking toward +Z):
            # -X is to viewer's RIGHT, +X is to viewer's LEFT. +Y is UP.
            # So (b - a) points toward -X; (c - a) points toward +Y. Cross(-X, +Y) = (-1,0,0)x(0,1,0) = (0,0,-1) = OUTWARD (-Z)!
            tris.append([a, b, c])
            tris.append([b, d, c])

    p_arr = np.array(verts, dtype=np.float32)
    t_arr = np.array(tris, dtype=np.int32)
    return MeshData(
        positions=p_arr,
        normals=compute_smooth_normals(p_arr, t_arr),
        uvs=np.array(uvs, dtype=np.float32),
        indices=t_arr.ravel().astype(np.uint32),
        material_idx=mat_idx,
    )


def make_head_mesh(env: CharacterEnvelope, mat_idx: int) -> MeshData:
    """High-resolution sculpted head+neck mesh with nose, brow, cheek, and jaw relief."""
    spec = env.spec
    head_y = spec.head_height_ratio * spec.height
    h_lo = max(env.y_shoulder, env.y_neck - 0.03)
    h_hi = spec.height
    uv_lo = max(env.y_shoulder - 0.02, env.y_neck - 0.06)

    n_rings = 42
    n_seg = 52
    hs = np.linspace(h_lo, h_hi, n_rings + 1)
    rxs = np.interp(hs, env.heights, env.head_rx)
    rzf = np.interp(hs, env.heights, env.head_rz_front)
    rzb = np.interp(hs, env.heights, env.head_rz_back)
    # Blend neck smoothly into torso radius below chin
    neck_rx = np.interp(hs, env.heights, env.torso_rx)
    neck_w = np.clip((env.y_chin - hs) / max(1e-4, env.y_chin - h_lo), 0.0, 1.0)
    rxs = rxs * (1.0 - neck_w) + np.minimum(rxs, neck_rx) * neck_w

    verts: list[list[float]] = []
    uvs: list[list[float]] = []
    head_h = max(0.08, spec.height - env.y_chin)

    for ir, h_m in enumerate(hs):
        rx = float(rxs[ir])
        zf = float(rzf[ir])
        zb = float(rzb[ir])
        cap_s = 1.0
        if ir == n_rings:
            cap_s = 0.02
        elif ir == n_rings - 1:
            cap_s = 0.42
        elif ir == n_rings - 2:
            cap_s = 0.72
        v_coord = (h_hi - h_m) / max(1e-4, h_hi - uv_lo)
        # Normalized vertical face coords
        f_t = (h_m - env.y_chin) / head_h  # 0 at chin, ~0.52 eyes, 1 at crown

        for isg in range(n_seg + 1):
            u_frac = isg / float(n_seg)
            th = (u_frac - 0.5) * (2.0 * math.pi)
            ct = math.cos(th)
            st = math.sin(th)
            rz = zf if ct >= 0.0 else zb

            # Subtle skull / jaw super-ellipse
            denom = (abs(st) ** 2.1 + abs(ct) ** 2.1) ** (1.0 / 2.1)
            sn = st / max(1e-6, denom)
            cn = ct / max(1e-6, denom)

            # Anatomical face sculpting in front hemisphere
            relief_z = 0.0
            if 0.0 <= f_t <= 0.85 and ct > 0.3:
                # Nose bridge & tip protrusion (f_t in [0.24..0.55], |th| < 0.25)
                nose_v = math.exp(-(((f_t - 0.34) / 0.12) ** 2))
                nose_h = math.exp(-((th / 0.14) ** 2))
                nose_bump = 0.015 * nose_v * nose_h
                # Orbital eye socket slight recess (f_t ~ 0.52, th ~ +/-0.34)
                orbit_v = math.exp(-(((f_t - 0.52) / 0.07) ** 2))
                orbit_h = math.exp(-(((abs(th) - 0.34) / 0.14) ** 2))
                orbit_dip = -0.0045 * orbit_v * orbit_h
                # Cheekbones & chin protrusion
                cheek = 0.004 * math.exp(-(((f_t - 0.38) / 0.10) ** 2)) * math.exp(-(((abs(th) - 0.48) / 0.18) ** 2))
                chin = 0.005 * math.exp(-(((f_t - 0.08) / 0.07) ** 2)) * math.exp(-((th / 0.28) ** 2))
                relief_z = nose_bump + orbit_dip + cheek + chin

            # Subtle ear protrusion at sides (|sin(th)| > 0.9, f_t in 0.3..0.55)
            ear_x = 0.0
            if 0.28 <= f_t <= 0.56 and abs(st) > 0.90:
                ear_x = 0.008 * math.exp(-(((f_t - 0.42) / 0.09) ** 2)) * ((abs(st) - 0.90) / 0.10)

            x = -(rx * cap_s + ear_x) * sn
            z = -(rz * cap_s + relief_z) * cn
            y = h_m - head_y
            verts.append([x, y, z])
            u_map = float(face_theta_to_u(np.array([th]))[0])
            uvs.append([u_map, float(np.clip(v_coord, 0.002, 0.998))])

    tris: list[list[int]] = []
    stride = n_seg + 1
    for ir in range(n_rings):
        for isg in range(n_seg):
            a = ir * stride + isg
            b = a + 1
            c = a + stride
            d = c + 1
            tris.append([a, b, c])
            tris.append([b, d, c])

    p_arr = np.array(verts, dtype=np.float32)
    t_arr = np.array(tris, dtype=np.int32)
    return MeshData(
        positions=p_arr,
        normals=compute_smooth_normals(p_arr, t_arr),
        uvs=np.array(uvs, dtype=np.float32),
        indices=t_arr.ravel().astype(np.uint32),
        material_idx=mat_idx,
    )


def make_ponytail_mesh(env: CharacterEnvelope, mat_idx: int) -> MeshData:
    """Sculpted Mark ponytail hanging behind nape."""
    head_y = env.spec.head_height_ratio * env.spec.height
    len_m = 0.21
    n_rings = 14
    n_seg = 12
    verts: list[list[float]] = []
    uvs: list[list[float]] = []
    for ir in range(n_rings + 1):
        t = ir / float(n_rings)
        y = -0.02 - t * len_m
        # Swells mid-ponytail, tapers to tip
        rad = 0.020 * math.sin(min(1.0, t * 1.15) * math.pi * 0.85) + 0.008 * (1.0 - t)
        if ir == n_rings:
            rad = 0.002
        zc = 0.115 + t * 0.028
        for isg in range(n_seg + 1):
            th = (isg / float(n_seg)) * 2.0 * math.pi
            x = -rad * math.sin(th)
            z = zc - rad * 1.25 * math.cos(th)
            verts.append([x, y, z])
            # Sample nape hair from face texture back row (u near 0.02/0.98)
            uvs.append([0.04, 0.25 + t * 0.25])
    tris = []
    stride = n_seg + 1
    for ir in range(n_rings):
        for isg in range(n_seg):
            a = ir * stride + isg
            b = a + 1
            c = a + stride
            d = c + 1
            tris.append([a, b, c])
            tris.append([b, d, c])
    p_arr = np.array(verts, dtype=np.float32)
    t_arr = np.array(tris, dtype=np.int32)
    return MeshData(
        positions=p_arr,
        normals=compute_smooth_normals(p_arr, t_arr),
        uvs=np.array(uvs, dtype=np.float32),
        indices=t_arr.ravel().astype(np.uint32),
        material_idx=mat_idx,
    )


def make_crystal_hair_cards(
    front_rgb: np.ndarray,
    front_mask: np.ndarray,
    env: CharacterEnvelope,
    mat_idx: int,
) -> tuple[MeshData, Image.Image]:
    """Soft shoulder-length blonde wave + fringe cards for Crystal (matches Rosie hair clarity)."""
    ts = 512
    # Extract golden-blonde highlight/mid/shadow strand palette from Crystal's hair region
    hy0 = env.y_top
    hy1 = int(round(env.y_bot - (env.y_shoulder - 0.02) / env.scale_m_per_px))
    hair_crop = front_rgb[hy0:hy1]
    hair_m = front_mask[hy0:hy1]
    hx_center = int(round(env.cx))
    # Exclude central face oval to grab pure blonde hair pixels
    yy_c, xx_c = np.mgrid[0 : hair_crop.shape[0], 0 : hair_crop.shape[1]]
    dist_face = ((xx_c - hx_center) / (0.075 / env.scale_m_per_px)) ** 2 + (
        (yy_c - hair_crop.shape[0] * 0.48) / (hair_crop.shape[0] * 0.36)
    ) ** 2
    hair_only = hair_m & (dist_face > 1.0)
    hp = hair_crop[hair_only].astype(np.float32) / 255.0
    if len(hp) > 40:
        lum = hp.mean(axis=1)
        cols = [
            np.median(hp[lum < np.percentile(lum, 30)], axis=0),
            np.median(hp[(lum >= np.percentile(lum, 30)) & (lum <= np.percentile(lum, 70))], axis=0),
            np.median(hp[lum > np.percentile(lum, 70)], axis=0),
        ]
    else:
        cols = [
            np.array([0.46, 0.39, 0.27], dtype=np.float32),
            np.array([0.62, 0.54, 0.38], dtype=np.float32),
            np.array([0.74, 0.66, 0.49], dtype=np.float32),
        ]

    rng = np.random.default_rng(19)
    tex = np.zeros((ts, ts, 4), dtype=np.float32)
    col_w = ts // 3
    for ci, base_c in enumerate(cols):
        x0 = ci * col_w
        for _ in range(75):
            x = rng.uniform(x0 + 4, (ci + 1) * col_w - 4)
            top = int(rng.uniform(0, 24))
            bot = int(ts - rng.uniform(10, 120))
            ys = np.arange(top, bot)
            xs = x + 3.0 * np.sin(ys / rng.uniform(45.0, 95.0) + rng.uniform(0.0, 6.2))
            shade = np.clip(base_c * rng.uniform(0.84, 1.12), 0.0, 1.0)
            xi = np.clip(xs.astype(np.int32), x0, (ci + 1) * col_w - 1)
            alpha = np.clip((bot - ys) / 85.0, 0.0, 1.0)
            tex[ys, xi, :3] = shade
            tex[ys, xi, 3] = np.maximum(tex[ys, xi, 3], alpha)
            xi2 = np.clip(xi + 1, x0, (ci + 1) * col_w - 1)
            tex[ys, xi2, :3] = shade * 0.90
            tex[ys, xi2, 3] = np.maximum(tex[ys, xi2, 3], alpha * 0.72)

    # Smooth horizontal feather per strip
    xx = (np.arange(ts) % col_w) / float(col_w)
    win = np.clip(np.minimum(xx, 1.0 - xx) / 0.16, 0.0, 1.0)
    tex[..., 3] *= win[None, :] * 0.9 + 0.1 * (win[None, :] > 0.5)
    rgb_d = dilate_rgb_uv(tex[..., :3], tex[..., 3] > 0.08, passes=8)
    tex[..., :3] = rgb_d
    hair_img = Image.fromarray((np.clip(tex, 0.0, 1.0) * 255.0).astype(np.uint8), "RGBA")

    # Scatter gentle curved hair cards around crown/sides/back + delicate bangs across forehead
    verts: list[list[float]] = []
    uvs: list[list[float]] = []
    norms: list[list[float]] = []
    tris: list[list[int]] = []

    head_top_local = env.spec.height - env.spec.head_height_ratio * env.spec.height
    # 1. Shoulder-length wave cards from around temple & nape (+pi/2 .. +3pi/2 and sides)
    for idx_card in range(110):
        # Leave central forehead open for face, populate temples/sides/back generously
        if idx_card < 84:
            # Sides & back: angle in [+0.70..2*pi-0.70]
            ang = 0.68 + rng.uniform(0.0, 2.0 * math.pi - 1.36)
            y_start = head_top_local - rng.uniform(0.015, 0.095)
            card_len = rng.uniform(0.16, 0.26)
            rad = 0.095 + rng.uniform(0.002, 0.014)
        else:
            # Delicate fringe across forehead (-0.75..+0.75) draping just above eyebrows / left temple
            ang = rng.uniform(-0.76, 0.76)
            y_start = head_top_local - rng.uniform(0.01, 0.04)
            card_len = rng.uniform(0.055, 0.085)
            rad = 0.096 + rng.uniform(0.003, 0.010)

        nx = -math.sin(ang)
        nz = -math.cos(ang)
        tx = math.cos(ang)
        tz = -math.sin(ang)
        # Wave outward slightly over shoulders when on bed
        card_w = rng.uniform(0.022, 0.036)
        ci = int(rng.integers(0, 3))
        u0, u1 = ci / 3.0 + 0.015, (ci + 1) / 3.0 - 0.015

        pts = []
        nrm = np.array([nx, 0.15, nz], dtype=np.float32)
        nrm /= np.linalg.norm(nrm)
        for j, frac in enumerate((0.0, 0.5, 1.0)):
            flare = math.sin(frac * math.pi * 0.75) * 0.014
            cx_c = nx * (rad + flare)
            cy_c = y_start - frac * card_len
            cz_c = nz * (rad + flare)
            # Flare gently out on shoulders for bed drape (not stabbing head)
            if idx_card < 84 and cy_c < -0.10:
                cx_c += nx * 0.018
            pts.append((cx_c - tx * card_w * 0.5, cy_c, cz_c - tz * card_w * 0.5, 1.0 - frac))
            pts.append((cx_c + tx * card_w * 0.5, cy_c, cz_c + tz * card_w * 0.5, 1.0 - frac))

        base = len(verts)
        for k, (vx, vy, vz, vuv) in enumerate(pts):
            verts.append([vx, vy, vz])
            norms.append([float(nrm[0]), float(nrm[1]), float(nrm[2])])
            uvs.append([u0 if (k % 2 == 0) else u1, 1.0 - vuv])
        tris.extend(
            [
                [base, base + 1, base + 2],
                [base + 1, base + 3, base + 2],
                [base + 2, base + 3, base + 4],
                [base + 3, base + 5, base + 4],
            ]
        )

    return (
        MeshData(
            positions=np.array(verts, dtype=np.float32),
            normals=np.array(norms, dtype=np.float32),
            uvs=np.array(uvs, dtype=np.float32),
            indices=np.array(tris, dtype=np.uint32).ravel(),
            material_idx=mat_idx,
        ),
        hair_img,
    )


def make_limb_segment(
    env: CharacterEnvelope,
    mat_idx: int,
    h_start: float,
    h_end: float,
    local_y_top: float,
    rx_func: np.ndarray,
    rz_mult: float,
    uv_x_range: tuple[float, float],
    uv_h_lo: float,
    uv_h_hi: float,
    uv_v_range: tuple[float, float],
    n_rings: int = 12,
    n_seg: int = 20,
    cap_top: bool = True,
    cap_bot: bool = True,
) -> MeshData:
    """Generic smooth tapered cylinder/loft hanging down -Y from local_y_top."""
    hs = np.linspace(h_start, h_end, n_rings + 1)  # descending height in world meters
    length = h_start - h_end
    rxs = np.interp(hs, env.heights, rx_func)
    verts: list[list[float]] = []
    uvs: list[list[float]] = []

    for ir, h_m in enumerate(hs):
        rx = float(rxs[ir])
        rz = rx * rz_mult
        cap_s = 1.0
        if cap_top and ir == 0:
            cap_s = 0.65
        elif cap_bot and ir == n_rings:
            cap_s = 0.60
        y_loc = local_y_top - (ir / float(n_rings)) * length
        v_norm = (uv_h_hi - h_m) / max(1e-4, uv_h_hi - uv_h_lo)
        v_coord = uv_v_range[0] + float(np.clip(v_norm, 0.0, 1.0)) * (uv_v_range[1] - uv_v_range[0])
        for isg in range(n_seg + 1):
            u_frac = isg / float(n_seg)
            th = (u_frac - 0.5) * (2.0 * math.pi)
            x = -rx * cap_s * math.sin(th)
            z = -rz * cap_s * math.cos(th)
            verts.append([x, y_loc, z])
            uvs.append([uv_x_range[0] + u_frac * (uv_x_range[1] - uv_x_range[0]), v_coord])

    tris: list[list[int]] = []
    stride = n_seg + 1
    for ir in range(n_rings):
        for isg in range(n_seg):
            a = ir * stride + isg
            b = a + 1
            c = a + stride
            d = c + 1
            # Descending ir goes -Y; increasing isg (+theta) goes -X on front -> flip winding so cross points -Z outward!
            tris.append([a, c, b])
            tris.append([b, c, d])
    p_arr = np.array(verts, dtype=np.float32)
    t_arr = np.array(tris, dtype=np.int32)
    return MeshData(
        positions=p_arr,
        normals=compute_smooth_normals(p_arr, t_arr),
        uvs=np.array(uvs, dtype=np.float32),
        indices=t_arr.ravel().astype(np.uint32),
        material_idx=mat_idx,
    )


def make_hand_mesh(
    env: CharacterEnvelope,
    mat_idx: int,
    h_wrist: float,
    h_tip: float,
    uv_x_range: tuple[float, float],
    uv_h_lo: float,
    uv_h_hi: float,
    uv_v_range: tuple[float, float],
) -> MeshData:
    n_rings = 8
    n_seg = 16
    length = max(0.11, h_wrist - h_tip)
    hs = np.linspace(h_wrist, h_wrist - length, n_rings + 1)
    verts: list[list[float]] = []
    uvs: list[list[float]] = []
    for ir, h_m in enumerate(hs):
        t = ir / float(n_rings)
        # Palm widens softly then tapers to fingertips, flattened in Z
        rx = 0.036 * (0.75 + 0.35 * math.sin(t * math.pi * 0.88)) * (1.0 - 0.65 * (t ** 3))
        rz = 0.020 * (0.8 + 0.25 * math.sin(t * math.pi * 0.85)) * (1.0 - 0.7 * (t ** 3))
        if ir == n_rings:
            rx, rz = 0.004, 0.004
        y_loc = -t * length
        v_norm = (uv_h_hi - h_m) / max(1e-4, uv_h_hi - uv_h_lo)
        v_coord = uv_v_range[0] + float(np.clip(v_norm, 0.0, 1.0)) * (uv_v_range[1] - uv_v_range[0])
        for isg in range(n_seg + 1):
            u_frac = isg / float(n_seg)
            th = (u_frac - 0.5) * (2.0 * math.pi)
            verts.append([-rx * math.sin(th), y_loc, -rz * math.cos(th)])
            uvs.append([uv_x_range[0] + u_frac * (uv_x_range[1] - uv_x_range[0]), v_coord])
    tris = []
    stride = n_seg + 1
    for ir in range(n_rings):
        for isg in range(n_seg):
            a = ir * stride + isg
            b = a + 1
            c = a + stride
            d = c + 1
            tris.append([a, c, b])
            tris.append([b, c, d])
    p_arr = np.array(verts, dtype=np.float32)
    t_arr = np.array(tris, dtype=np.int32)
    return MeshData(
        positions=p_arr,
        normals=compute_smooth_normals(p_arr, t_arr),
        uvs=np.array(uvs, dtype=np.float32),
        indices=t_arr.ravel().astype(np.uint32),
        material_idx=mat_idx,
    )


def make_shoe_mesh(
    env: CharacterEnvelope,
    mat_idx: int,
    h_ankle: float,
    uv_x_range: tuple[float, float],
    uv_h_lo: float,
    uv_h_hi: float,
    uv_v_range: tuple[float, float],
) -> MeshData:
    """Sculpted shoe/boot hanging from ankle joint down to sole at local y = -h_ankle."""
    n_rings = 10
    n_seg = 18
    hs = np.linspace(h_ankle + 0.01, 0.0, n_rings + 1)
    verts: list[list[float]] = []
    uvs: list[list[float]] = []
    is_heel = env.spec.name == "crystal"
    for ir, h_m in enumerate(hs):
        t = ir / float(n_rings)  # 0 top ankle, 1 sole
        rx = 0.044 * (0.82 + 0.35 * math.sin(t * math.pi * 0.65))
        zf = 0.055 + 0.115 * (t ** 1.15)  # extends forward (-Z) to toe
        zb = 0.052 + 0.012 * t            # slight heel at +Z
        if ir == n_rings:
            rx *= 0.90
        y_loc = h_m - h_ankle
        v_norm = (uv_h_hi - h_m) / max(1e-4, uv_h_hi - uv_h_lo)
        v_coord = uv_v_range[0] + float(np.clip(v_norm, 0.0, 1.0)) * (uv_v_range[1] - uv_v_range[0])
        for isg in range(n_seg + 1):
            u_frac = isg / float(n_seg)
            th = (u_frac - 0.5) * (2.0 * math.pi)
            ct = math.cos(th)
            st = math.sin(th)
            z = -(zf * ct if ct >= 0 else zb * ct) - 0.045 * (t ** 1.2)
            # On heel courts, raise subtle instep curve slightly under arch
            y_arch = 0.012 * (1.0 - abs(ct)) * math.sin(t * math.pi) if (is_heel and t > 0.6) else 0.0
            verts.append([-rx * st, y_loc + y_arch, z])
            uvs.append([uv_x_range[0] + u_frac * (uv_x_range[1] - uv_x_range[0]), v_coord])
    tris = []
    stride = n_seg + 1
    for ir in range(n_rings):
        for isg in range(n_seg):
            a = ir * stride + isg
            b = a + 1
            c = a + stride
            d = c + 1
            tris.append([a, c, b])
            tris.append([b, c, d])
    p_arr = np.array(verts, dtype=np.float32)
    t_arr = np.array(tris, dtype=np.int32)
    return MeshData(
        positions=p_arr,
        normals=compute_smooth_normals(p_arr, t_arr),
        uvs=np.array(uvs, dtype=np.float32),
        indices=t_arr.ravel().astype(np.uint32),
        material_idx=mat_idx,
    )


def make_prop_cylinder(
    r0: float,
    r1: float,
    y0: float,
    y1: float,
    mat_idx: int,
    n_seg: int = 12,
    hollow: bool = False,
) -> MeshData:
    hs = [y0, y1]
    rs = [r0, r1]
    verts = []
    uvs = []
    for ir, (yy, rr) in enumerate(zip(hs, rs)):
        for isg in range(n_seg + 1):
            th = (isg / float(n_seg)) * 2.0 * math.pi
            verts.append([-rr * math.sin(th), yy, -rr * math.cos(th)])
            uvs.append([isg / float(n_seg), float(ir)])
    tris = []
    stride = n_seg + 1
    for isg in range(n_seg):
        a = isg
        b = a + 1
        c = a + stride
        d = c + 1
        if y1 >= y0:
            tris.extend([[a, b, c], [b, d, c]])
        else:
            tris.extend([[a, c, b], [b, c, d]])
    if not hollow:
        # Add end caps
        c0 = len(verts)
        verts.append([0.0, y0, 0.0])
        uvs.append([0.5, 0.0])
        c1 = len(verts)
        verts.append([0.0, y1, 0.0])
        uvs.append([0.5, 1.0])
        for isg in range(n_seg):
            if y1 >= y0:
                tris.append([c0, isg + 1, isg])
                tris.append([c1, stride + isg, stride + isg + 1])
            else:
                tris.append([c0, isg, isg + 1])
                tris.append([c1, stride + isg + 1, stride + isg])
    p_arr = np.array(verts, dtype=np.float32)
    t_arr = np.array(tris, dtype=np.int32)
    return MeshData(
        positions=p_arr,
        normals=compute_smooth_normals(p_arr, t_arr),
        uvs=np.array(uvs, dtype=np.float32),
        indices=t_arr.ravel().astype(np.uint32),
        material_idx=mat_idx,
    )


# ---------------------------------------------------------------------------
# 5. Pure-Python Binary glTF 2.0 (.glb) Writer
# ---------------------------------------------------------------------------


def encode_image_bytes(img: Image.Image, fmt: str = "PNG") -> tuple[bytes, str]:
    buf = io.BytesIO()
    if fmt == "JPEG":
        img.save(buf, format="JPEG", quality=93, optimize=True)
        return buf.getvalue(), "image/jpeg"
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue(), "image/png"


class GlbBuilder:
    def __init__(self) -> None:
        self.bin_parts: list[bytes] = []
        self.offset = 0
        self.buffer_views: list[dict] = []
        self.accessors: list[dict] = []
        self.images: list[dict] = []
        self.samplers: list[dict] = [
            {"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}
        ]
        self.textures: list[dict] = []
        self.materials: list[dict] = []
        self.meshes: list[dict] = []
        self.nodes: list[dict] = []

    def add_bytes(self, data: bytes, target: int | None = None) -> int:
        pad = (-self.offset) % 4
        if pad:
            self.bin_parts.append(b"\x00" * pad)
            self.offset += pad
        bv: dict = {"buffer": 0, "byteOffset": self.offset, "byteLength": len(data)}
        if target is not None:
            bv["target"] = target
        self.bin_parts.append(data)
        self.offset += len(data)
        idx = len(self.buffer_views)
        self.buffer_views.append(bv)
        return idx

    def add_texture_image(self, img: Image.Image, fmt: str = "PNG") -> int:
        raw, mime = encode_image_bytes(img, fmt)
        bv = self.add_bytes(raw)
        img_idx = len(self.images)
        self.images.append({"bufferView": bv, "mimeType": mime})
        tex_idx = len(self.textures)
        self.textures.append({"sampler": 0, "source": img_idx})
        return tex_idx

    def add_material(
        self,
        name: str,
        tex_idx: int | None = None,
        base_color: list[float] | None = None,
        roughness: float = 0.82,
        metallic: float = 0.0,
        alpha_mode: str = "OPAQUE",
        alpha_cutoff: float | None = None,
        double_sided: bool = False,
    ) -> int:
        pbr: dict = {"metallicFactor": metallic, "roughnessFactor": roughness}
        if base_color is not None:
            pbr["baseColorFactor"] = base_color
        if tex_idx is not None:
            pbr["baseColorTexture"] = {"index": tex_idx}
        mat: dict = {"name": name, "pbrMetallicRoughness": pbr, "doubleSided": double_sided}
        if alpha_mode != "OPAQUE":
            mat["alphaMode"] = alpha_mode
            if alpha_cutoff is not None:
                mat["alphaCutoff"] = alpha_cutoff
        idx = len(self.materials)
        self.materials.append(mat)
        return idx

    def add_mesh(self, name: str, parts: list[MeshData]) -> int:
        prims = []
        for part in parts:
            pos = np.ascontiguousarray(part.positions, dtype=np.float32)
            nrm = np.ascontiguousarray(part.normals, dtype=np.float32)
            uv = np.ascontiguousarray(part.uvs, dtype=np.float32)
            idx_u32 = np.ascontiguousarray(part.indices, dtype=np.uint32)
            if len(pos) < 65535:
                idx_arr = idx_u32.astype(np.uint16)
                idx_comp_type = 5123  # UNSIGNED_SHORT
            else:
                idx_arr = idx_u32
                idx_comp_type = 5125  # UNSIGNED_INT

            bv_pos = self.add_bytes(pos.tobytes(), 34962)
            bv_nrm = self.add_bytes(nrm.tobytes(), 34962)
            bv_uv = self.add_bytes(uv.tobytes(), 34962)
            bv_idx = self.add_bytes(idx_arr.tobytes(), 34963)

            acc_pos = len(self.accessors)
            self.accessors.append(
                {
                    "bufferView": bv_pos,
                    "componentType": 5126,
                    "count": len(pos),
                    "type": "VEC3",
                    "min": pos.min(axis=0).astype(float).tolist(),
                    "max": pos.max(axis=0).astype(float).tolist(),
                }
            )
            acc_nrm = len(self.accessors)
            self.accessors.append(
                {"bufferView": bv_nrm, "componentType": 5126, "count": len(nrm), "type": "VEC3"}
            )
            acc_uv = len(self.accessors)
            self.accessors.append(
                {"bufferView": bv_uv, "componentType": 5126, "count": len(uv), "type": "VEC2"}
            )
            acc_idx = len(self.accessors)
            self.accessors.append(
                {"bufferView": bv_idx, "componentType": idx_comp_type, "count": len(idx_arr), "type": "SCALAR"}
            )
            prims.append(
                {
                    "attributes": {"POSITION": acc_pos, "NORMAL": acc_nrm, "TEXCOORD_0": acc_uv},
                    "indices": acc_idx,
                    "material": part.material_idx,
                }
            )
        idx = len(self.meshes)
        self.meshes.append({"name": name, "primitives": prims})
        return idx

    def add_node(
        self,
        name: str,
        mesh: int | None = None,
        children: list[int] | None = None,
        translation: Iterable[float] | None = None,
        rotation: Iterable[float] | None = None,
        scale: Iterable[float] | None = None,
    ) -> int:
        n: dict = {"name": name}
        if mesh is not None:
            n["mesh"] = mesh
        if children:
            n["children"] = list(children)
        if translation is not None:
            n["translation"] = [float(v) for v in translation]
        if rotation is not None:
            n["rotation"] = [float(v) for v in rotation]
        if scale is not None:
            n["scale"] = [float(v) for v in scale]
        idx = len(self.nodes)
        self.nodes.append(n)
        return idx

    def write(self, out_path: Path, root_node: int) -> None:
        pad = (-self.offset) % 4
        if pad:
            self.bin_parts.append(b"\x00" * pad)
            self.offset += pad
        bin_blob = b"".join(self.bin_parts)
        gltf = {
            "asset": {"version": "2.0", "generator": "paradiselodge-characters"},
            "scene": 0,
            "scenes": [{"nodes": [root_node]}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "textures": self.textures,
            "images": self.images,
            "samplers": self.samplers,
            "accessors": self.accessors,
            "bufferViews": self.buffer_views,
            "buffers": [{"byteLength": len(bin_blob)}],
        }
        json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
        jpad = (-len(json_bytes)) % 4
        if jpad:
            json_bytes += b" " * jpad
        total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_blob)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("wb") as f:
            f.write(struct.pack("<III", 0x46546C67, 2, total_len))
            f.write(struct.pack("<II", len(json_bytes), 0x4E4F534A))
            f.write(json_bytes)
            f.write(struct.pack("<II", len(bin_blob), 0x004E4942))
            f.write(bin_blob)


def euler_xyz_to_quat(rx: float, ry: float, rz: float) -> list[float]:
    cx, sx = math.cos(rx * 0.5), math.sin(rx * 0.5)
    cy, sy = math.cos(ry * 0.5), math.sin(ry * 0.5)
    cz, sz = math.cos(rz * 0.5), math.sin(rz * 0.5)
    return [
        sx * cy * cz + cx * sy * sz,
        cx * sy * cz - sx * cy * sz,
        cx * cy * sz + sx * sy * cz,
        cx * cy * cz - sx * sy * sz,
    ]


# ---------------------------------------------------------------------------
# 6. Assemble Character Rig & Export .glb
# ---------------------------------------------------------------------------


def build_character_glb(spec: CharacterSpec) -> dict:
    sheet_path = SHEETS_DIR / spec.sheet
    front_raw, q3_raw, prof_raw = split_sheet_panels(sheet_path)
    front_rgb, front_mask = front_raw, segment_panel(front_raw)[0]
    q3_rgb, q3_mask = q3_raw, segment_panel(q3_raw)[0]
    prof_rgb, prof_mask = prof_raw, segment_panel(prof_raw)[0]

    env = analyze_character(spec, front_rgb, front_mask, q3_rgb, q3_mask, prof_rgb, prof_mask)
    face_img, _ = generate_face_texture(front_rgb, front_mask, prof_rgb, prof_mask, q3_rgb, q3_mask, env)
    body_img = generate_body_atlas(front_rgb, front_mask, prof_rgb, prof_mask, env)

    g = GlbBuilder()
    tex_face = g.add_texture_image(face_img, "PNG")
    tex_body = g.add_texture_image(body_img, "JPEG")
    mat_face = g.add_material(f"{spec.name}_face", tex_idx=tex_face, roughness=0.72)
    mat_body = g.add_material(f"{spec.name}_body", tex_idx=tex_body, roughness=0.84)

    # Measurements matching existing character rigs closely
    H = spec.height
    hip_y = env.y_hip_joint
    shoulder_y = spec.shoulder_height_ratio * H
    head_y = spec.head_height_ratio * H
    thigh_len = spec.thigh_ratio * H
    shin_len = spec.shin_ratio * H
    upper_arm_len = spec.upper_arm_ratio * H
    forearm_len = spec.forearm_ratio * H

    # Torso (child of chest)
    torso_m = g.add_mesh("torso_m", [make_torso_mesh(env, mat_body)])
    torso_n = g.add_node("torso", mesh=torso_m)

    # Head (+ ponytail + optional blonde hair cards)
    head_children = [g.add_node("skull", mesh=g.add_mesh("skull_m", [make_head_mesh(env, mat_face)]))]
    if spec.has_ponytail:
        pt_m = g.add_mesh("ponytail_m", [make_ponytail_mesh(env, mat_face)])
        head_children.append(g.add_node("ponytail", mesh=pt_m))
    if spec.has_crystal_fx:
        hc_mesh, hc_img = make_crystal_hair_cards(front_rgb, front_mask, env, 0)
        tex_hair = g.add_texture_image(hc_img, "PNG")
        mat_hair = g.add_material(
            "crystal_hair_cards",
            tex_idx=tex_hair,
            roughness=0.82,
            alpha_mode="MASK",
            alpha_cutoff=0.38,
            double_sided=True,
        )
        hc_mesh = MeshData(hc_mesh.positions, hc_mesh.normals, hc_mesh.uvs, hc_mesh.indices, mat_hair)
        head_children.append(g.add_node("hair_cards", mesh=g.add_mesh("hair_cards_m", [hc_mesh])))

    head_n = g.add_node("head", children=head_children, translation=[0.0, head_y - hip_y, 0.0])

    # Arms L & R
    arm_nodes: list[int] = []
    arm_hi = env.y_shoulder + 0.02
    arm_lo = max(0.28 * H, env.y_crotch - 0.12)
    h_sh = shoulder_y
    h_elb = h_sh - upper_arm_len
    h_wr = h_elb - forearm_len
    h_tip = max(0.05, h_wr - 0.16)

    for side, tag, u_range, rx_arr, s_rot_z, e_rot_x in (
        (-1.0, "l", (0.50, 0.73), env.arm_l_rx, math.radians(-25.0) if spec.has_crystal_fx else math.radians(-8.0), math.radians(-26.0) if spec.has_crystal_fx else 0.0),
        (1.0, "r", (0.76, 0.99), env.arm_r_rx, math.radians(6.0) if spec.has_crystal_fx else math.radians(8.0), math.radians(-5.0) if spec.has_crystal_fx else 0.0),
    ):
        uarm_mesh = make_limb_segment(
            env, mat_body, h_sh + 0.015, h_elb - 0.01, 0.015, rx_arr, 0.92, u_range, arm_lo, arm_hi, (0.01, 0.55), n_rings=12
        )
        deltoid_mesh = make_sphere_part(0.0, 0.0, 0.0, float(np.interp(h_sh, env.heights, rx_arr)), float(np.interp(h_sh, env.heights, rx_arr)) * 1.05, float(np.interp(h_sh, env.heights, rx_arr)) * 0.95, (u_range[0] + 0.11, 0.04), mat_body)
        farm_mesh = make_limb_segment(
            env, mat_body, h_elb + 0.012, h_wr - 0.008, 0.012, rx_arr, 0.90, u_range, arm_lo, arm_hi, (0.01, 0.55), n_rings=10
        )
        hand_mesh = make_hand_mesh(env, mat_body, h_wr, h_tip, u_range, arm_lo, arm_hi, (0.01, 0.55))

        hand_children = [g.add_node(f"palm_{tag}", mesh=g.add_mesh(f"palm_{tag}_m", [hand_mesh]))]
        if spec.has_crystal_fx and tag == "r":
            mat_gold = g.add_material("crystal_gold", base_color=[0.74, 0.60, 0.31, 1.0], roughness=0.35, metallic=0.6)
            brac = make_prop_cylinder(0.032, 0.032, 0.004, 0.018, mat_gold, hollow=True)
            hand_children.append(g.add_node("bracelet", mesh=g.add_mesh("bracelet_m", [brac])))
        hand_n = g.add_node(f"hand_{tag}", children=hand_children, translation=[0.0, -forearm_len, 0.0])

        elbow_children = [
            g.add_node(f"forearm_{tag}", mesh=g.add_mesh(f"forearm_{tag}_m", [farm_mesh])),
            hand_n,
        ]
        # Crystal syringe seated in left elbow crook
        if spec.has_crystal_fx and tag == "l":
            mat_glass = g.add_material("syringe_glass", base_color=[0.85, 0.88, 0.90, 1.0], roughness=0.25, metallic=0.1)
            mat_steel = g.add_material("syringe_steel", base_color=[0.70, 0.72, 0.74, 1.0], roughness=0.22, metallic=0.8)
            barrel = g.add_node("needle_barrel", mesh=g.add_mesh("needle_barrel_m", [make_prop_cylinder(0.008, 0.008, 0.0, 0.064, mat_glass)]))
            plunger = g.add_node("needle_plunger", mesh=g.add_mesh("needle_plunger_m", [make_prop_cylinder(0.011, 0.011, 0.064, 0.078, mat_glass)]))
            tip = g.add_node("needle_tip", mesh=g.add_mesh("needle_tip_m", [make_prop_cylinder(0.0035, 0.0009, -0.032, 0.0, mat_steel)]))
            needle_n = g.add_node(
                "needle",
                children=[barrel, plunger, tip],
                translation=[0.0, -0.030, -0.030],
                rotation=euler_xyz_to_quat(math.radians(58.0), 0.0, math.radians(-24.0)),
            )
            elbow_children.append(needle_n)

        elbow_rot = euler_xyz_to_quat(e_rot_x, 0.0, 0.0) if abs(e_rot_x) > 1e-4 else None
        elbow_n = g.add_node(f"arm_{tag}_1", children=elbow_children, translation=[0.0, -upper_arm_len, 0.0], rotation=elbow_rot)

        shoulder_children = [
            g.add_node(f"deltoid_{tag}", mesh=g.add_mesh(f"deltoid_{tag}_m", [deltoid_mesh])),
            g.add_node(f"upperarm_{tag}", mesh=g.add_mesh(f"upperarm_{tag}_m", [uarm_mesh])),
            elbow_n,
        ]
        # Crystal rubber tourniquet sling above left elbow
        if spec.has_crystal_fx and tag == "l":
            mat_rub = g.add_material("crystal_sling", base_color=[0.09, 0.08, 0.08, 1.0], roughness=0.58)
            sling_band = make_prop_cylinder(0.048, 0.050, -0.015, 0.015, mat_rub, hollow=True)
            shoulder_children.append(
                g.add_node("sling", mesh=g.add_mesh("sling_m", [sling_band]), translation=[0.0, -0.150, 0.0])
            )

        # Shoulder X sits comfortably outside torso width at shoulder height
        torso_half_sh = float(np.interp(h_sh, env.heights, env.torso_rx))
        sh_x = side * (torso_half_sh + 0.025)
        fwd_x = math.radians(8.0) if (spec.has_crystal_fx and tag == "l") else math.radians(3.0)
        sh_n = g.add_node(
            f"arm_{tag}_0",
            children=shoulder_children,
            translation=[sh_x, h_sh - hip_y, 0.0],
            rotation=euler_xyz_to_quat(fwd_x, 0.0, s_rot_z),
        )
        arm_nodes.append(sh_n)

    chest_n = g.add_node("chest", children=[torso_n, head_n, *arm_nodes])

    # Legs L & R
    leg_nodes: list[int] = []
    leg_hi = env.y_crotch + 0.03
    leg_lo = 0.0
    h_hip_start = hip_y - 0.02
    h_knee = h_hip_start - thigh_len
    h_ank = max(0.055, h_knee - shin_len)

    for side, tag, u_range, rx_arr, splay_z in (
        (-1.0, "l", (0.01, 0.48), env.leg_l_rx, math.radians(-3.5) if spec.has_crystal_fx else 0.0),
        (1.0, "r", (0.52, 0.99), env.leg_r_rx, math.radians(3.5) if spec.has_crystal_fx else 0.0),
    ):
        thigh_m = make_limb_segment(
            env, mat_body, h_hip_start + 0.03, h_knee - 0.01, 0.03, rx_arr, 1.05, u_range, leg_lo, leg_hi, (0.58, 0.99), n_rings=14
        )
        shin_m = make_limb_segment(
            env, mat_body, h_knee + 0.015, h_ank, 0.015, rx_arr, 1.02, u_range, leg_lo, leg_hi, (0.58, 0.99), n_rings=14
        )
        knee_cap = make_sphere_part(
            0.0, 0.0, 0.0,
            float(np.interp(h_knee, env.heights, rx_arr)),
            float(np.interp(h_knee, env.heights, rx_arr)),
            float(np.interp(h_knee, env.heights, rx_arr)) * 1.04,
            (u_range[0] + 0.23, 0.77),
            mat_body,
        )
        shoe_m = make_shoe_mesh(env, mat_body, h_ank, u_range, leg_lo, leg_hi, (0.58, 0.99))

        foot_n = g.add_node(
            f"foot_{tag}",
            children=[g.add_node(f"shoe_{tag}", mesh=g.add_mesh(f"shoe_{tag}_m", [shoe_m]))],
            translation=[0.0, -(h_knee - h_ank), 0.0],
        )
        shin_n = g.add_node(
            f"leg_{tag}_1",
            children=[g.add_node(f"shin_{tag}", mesh=g.add_mesh(f"shin_{tag}_m", [shin_m])), foot_n],
            translation=[0.0, -thigh_len, 0.0],
        )
        leg_x = side * (0.075 if spec.has_crystal_fx else 0.095)
        hip_rot = euler_xyz_to_quat(0.0, 0.0, splay_z) if abs(splay_z) > 1e-4 else None
        leg_n = g.add_node(
            f"leg_{tag}_0",
            children=[
                g.add_node(f"knee_{tag}", mesh=g.add_mesh(f"knee_{tag}_m", [knee_cap]), translation=[0.0, -thigh_len + 0.01, 0.0]),
                g.add_node(f"thigh_{tag}", mesh=g.add_mesh(f"thigh_{tag}_m", [thigh_m])),
                shin_n,
            ],
            translation=[leg_x, -0.02, 0.0],
            rotation=hip_rot,
        )
        leg_nodes.append(leg_n)

    # Pelvis seat cap so bent sitting thighs have no underside hole
    seat_m = make_sphere_part(
        0.0, -0.04, 0.0,
        float(np.interp(hip_y, env.heights, env.torso_rx)) * 0.94,
        0.11,
        0.11,
        (0.24, 0.45),
        mat_body,
    )
    seat_n = g.add_node("seat", mesh=g.add_mesh("seat_m", [seat_m]))
    hips_n = g.add_node("hips", children=[chest_n, *leg_nodes, seat_n], translation=[0.0, hip_y, 0.0])
    root_n = g.add_node(f"{spec.name}_root", children=[hips_n])

    out_path = OUT_DIR / f"{spec.name}.glb"
    g.write(out_path, root_n)
    return {
        "name": spec.name,
        "glb": str(out_path),
        "bytes": out_path.stat().st_size,
        "height": H,
        "front_panel": (front_rgb, front_mask),
        "prof_panel": (prof_rgb, prof_mask),
        "face_img": face_img,
        "body_img": body_img,
    }


def write_matte_preview(front_panels: list[tuple[str, np.ndarray, np.ndarray, np.ndarray, np.ndarray]]) -> None:
    """Save clean magenta-checker composite of Front & Profile mattes for visual inspection."""
    rows = []
    target_h = 260
    for name, f_rgb, f_m, p_rgb, p_m in front_panels:
        strips = []
        for rgb, m in ((f_rgb, f_m), (p_rgb, p_m)):
            comp = rgb.astype(np.float32).copy()
            bg = np.array([210.0, 55.0, 175.0], dtype=np.float32)
            comp[~m] = bg
            im = Image.fromarray(comp.astype(np.uint8), "RGB")
            w_new = max(1, int(round(im.width * (target_h / float(im.height)))))
            strips.append(im.resize((w_new, target_h), Image.Resampling.BILINEAR))
        row_im = Image.new("RGB", (sum(s.width for s in strips), target_h))
        x = 0
        for s in strips:
            row_im.paste(s, (x, 0))
            x += s.width
        rows.append(row_im)
    max_w = max(r.width for r in rows)
    canvas = Image.new("RGB", (max_w, len(rows) * target_h), (28, 28, 32))
    for i, r in enumerate(rows):
        canvas.paste(r, (0, i * target_h))
    SCRATCH_MATTE_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(SCRATCH_MATTE_PATH)
    print(f"Wrote matte preview: {SCRATCH_MATTE_PATH}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mattes-only", action="store_true")
    ap.add_argument("--only", default="", help="Comma-separated cast names")
    args = ap.parse_args()

    wanted = [s.strip() for s in args.only.split(",") if s.strip()] if args.only else list(SPECS.keys())
    previews = []
    for name in wanted:
        spec = SPECS[name]
        if args.mattes_only:
            front_raw, _, prof_raw = split_sheet_panels(SHEETS_DIR / spec.sheet)
            f_m, _ = segment_panel(front_raw)
            p_m, _ = segment_panel(prof_raw)
            previews.append((name, front_raw, f_m, prof_raw, p_m))
        else:
            res = build_character_glb(spec)
            f_rgb, f_m = res["front_panel"]
            p_rgb, p_m = res["prof_panel"]
            previews.append((name, f_rgb, f_m, p_rgb, p_m))
            print(f"built {spec.name:10s} -> {Path(res['glb']).name} ({res['bytes'] // 1024} KB)")
    write_matte_preview(previews)


if __name__ == "__main__":
    main()
