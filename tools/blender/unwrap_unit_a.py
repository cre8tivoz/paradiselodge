"""
Allocate Unit A's second UV channel, one deterministic atlas per space.

Run inside Blender through BlenderMCP after `build_unit_a.py`:

    exec(open('tools/blender/unwrap_unit_a.py').read())

This is Unit A step 5 only. It does not bake lighting. It writes the
`Lightmap` UV layer into `assets/blender/unit-a.blend` and a coloured cell
diagnostic for every atlas under `shots/unit-a-lightmap-uv-*.png`.

The per-space resolutions are locked by dwell time in CLAUDE.md:

    room 1A 2048, parlour 2048, reception 1024, stairs 1024, hallway 512.

Each object is smart-unwrapped alone, then scaled into a deterministic cell in
its space's atlas. Blender's multi-object `pack_islands` is deliberately not
used: it silently left overlapping full-atlas objects in the room 1A reset.
"""

from __future__ import annotations

import colorsys
import math
import os
import statistics

import bpy
import numpy as np

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
OUT_BLEND = f"{ROOT}/assets/blender/unit-a.blend"
LIGHTMAP_UV = "Lightmap"
PADDING_PX = 8
MIN_CONTENT_PX = 4

ATLASES = (
    ("room1a", 2048),
    ("parlour", 2048),
    ("reception", 1024),
    ("staircase", 1024),
    ("hallway", 512),
)


def _override():
    """Borrow Blender's visible 3D viewport for UV operators invoked by MCP."""
    windows = bpy.context.window_manager.windows
    if not windows:
        raise RuntimeError("Unit A unwrap needs an open Blender window")
    window = windows[0]
    area = next((item for item in window.screen.areas if item.type == "VIEW_3D"), None)
    if area is None:
        raise RuntimeError("Unit A unwrap needs an open 3D viewport")
    region = next(item for item in area.regions if item.type == "WINDOW")
    return {
        "window": window,
        "screen": window.screen,
        "area": area,
        "region": region,
        "scene": bpy.context.scene,
        "view_layer": bpy.context.view_layer,
    }


def _atlas_name(obj) -> str | None:
    """Map every bake target to exactly one space without touching gameplay IDs."""
    tagged = obj.get("unit_a_space")
    if tagged in {"room1a", "parlour", "reception"}:
        return tagged
    if obj.name.startswith("staircase_"):
        return "staircase"
    if obj.name.startswith("first_floor_hall_"):
        return "hallway"
    if obj.name.startswith("parlour_"):
        return "parlour"
    if obj.name.startswith("reception_"):
        return "reception"
    return None


def _is_glass(obj) -> bool:
    lower = obj.name.lower()
    if "glass" in lower or "pane_" in lower or "ashtray" in lower:
        return True
    for material in obj.data.materials:
        if material is None:
            continue
        name = material.name.lower()
        if "glass" in name or "barely" in name or "sheer" in name:
            return True
        if material.diffuse_color[3] < 0.999:
            return True
    return False


def _members(name: str):
    objects = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or _atlas_name(obj) != name:
            continue
        # Transparent panes receive direct environment light and do not need an
        # irradiance atlas slot. They remain in the scene for later occlusion.
        if _is_glass(obj):
            continue
        if len(obj.data.polygons) == 0:
            continue
        objects.append(obj)
    return sorted(objects, key=lambda item: item.name)


def _select(objects) -> None:
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def _world_area(obj) -> float:
    """World-space surface area used only to distribute atlas cells."""
    scale = obj.matrix_world.to_scale()
    total = 0.0
    for polygon in obj.data.polygons:
        normal = polygon.normal
        axis = max(range(3), key=lambda index: abs(normal[index]))
        if axis == 0:
            factor = abs(scale.y * scale.z)
        elif axis == 1:
            factor = abs(scale.x * scale.z)
        else:
            factor = abs(scale.x * scale.y)
        total += polygon.area * factor
    return max(total, 1e-8)


def _shelf(weights, resolution: int, fill=0.70):
    """Pack area-weighted square cells with a guaranteed pixel-sized floor."""
    order = sorted(range(len(weights)), key=lambda index: (-weights[index], index))
    minimum = (2 * PADDING_PX + MIN_CONTENT_PX) / resolution
    scale = math.sqrt(fill / max(sum(value * value for value in weights), 1e-9))

    for _attempt in range(200):
        cells = {}
        x = y = row_height = 0.0
        ok = True
        for index in order:
            side = min(max(weights[index] * scale, minimum), 1.0)
            if x + side > 1.0 + 1e-9:
                x = 0.0
                y += row_height
                row_height = 0.0
            if y + side > 1.0 + 1e-9:
                ok = False
                break
            cells[index] = (x, y, side)
            x += side
            row_height = max(row_height, side)
        if ok:
            return cells
        scale *= 0.94
    raise RuntimeError(f"could not pack {len(weights)} objects at {resolution}px")


def _prepare_layer(obj) -> None:
    layers = obj.data.uv_layers
    old = layers.get(LIGHTMAP_UV)
    if old is not None:
        layers.remove(old)
    lightmap = layers.new(name=LIGHTMAP_UV)
    render_layer = next((layer for layer in layers if layer.name != LIGHTMAP_UV), None)
    if render_layer is None:
        raise RuntimeError(f"{obj.name} has no albedo UV layer")
    for layer in layers:
        layer.active_render = layer == render_layer
    layers.active = lightmap


def _smart_unwrap(obj) -> None:
    _select([obj])
    with bpy.context.temp_override(**_override()):
        bpy.ops.object.mode_set(mode="EDIT")
        try:
            bpy.ops.mesh.select_all(action="SELECT")
            result = bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02)
            if "FINISHED" not in result:
                raise RuntimeError(f"smart_project returned {result}")
        finally:
            bpy.ops.object.mode_set(mode="OBJECT")


def _face_pack(obj) -> None:
    """Fallback for imported geometry whose smart projection crosses islands."""
    _select([obj])
    with bpy.context.temp_override(**_override()):
        bpy.ops.object.mode_set(mode="EDIT")
        try:
            bpy.ops.mesh.select_all(action="SELECT")
            result = bpy.ops.uv.lightmap_pack(
                PREF_CONTEXT="SEL_FACES",
                PREF_PACK_IN_ONE=True,
                PREF_NEW_UVLAYER=False,
                PREF_BOX_DIV=12,
                PREF_MARGIN_DIV=0.02,
            )
            if "FINISHED" not in result:
                raise RuntimeError(f"lightmap_pack returned {result}")
        finally:
            bpy.ops.object.mode_set(mode="OBJECT")


def _cross(a, b, point) -> float:
    return (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0])


def _intersection_area(subject, clip, epsilon: float) -> float:
    """Return strict polygon intersection area; touching edges have zero area."""
    if _cross(clip[0], clip[1], clip[2]) < 0:
        clip = (clip[0], clip[2], clip[1])
    output = list(subject)
    for edge in range(3):
        start = clip[edge]
        end = clip[(edge + 1) % 3]
        source = output
        output = []
        if not source:
            break
        previous = source[-1]
        previous_side = _cross(start, end, previous)
        for current in source:
            current_side = _cross(start, end, current)
            if current_side >= -epsilon:
                if previous_side < -epsilon:
                    denominator = previous_side - current_side
                    ratio = previous_side / denominator
                    output.append(previous + ratio * (current - previous))
                output.append(current)
            elif previous_side >= -epsilon:
                denominator = previous_side - current_side
                ratio = previous_side / denominator
                output.append(previous + ratio * (current - previous))
            previous = current
            previous_side = current_side
    if len(output) < 3:
        return 0.0
    area = 0.0
    for index, point in enumerate(output):
        other = output[(index + 1) % len(output)]
        area += point[0] * other[1] - other[0] * point[1]
    return abs(area) * 0.5


def _check_uv_geometry(obj) -> tuple[int, int]:
    """Count positive-area overlaps and degenerate UV triangles.

    Blender's UV overlap selector treats some shared island boundaries as
    overlap on imported meshes. This sweep-line test distinguishes those
    zero-area contacts from UVs that would genuinely double-bake a texel.
    """
    mesh = obj.data
    mesh.calc_loop_triangles()
    layer = mesh.uv_layers[LIGHTMAP_UV]
    raw_triangles = []
    all_points = []
    for triangle in mesh.loop_triangles:
        points = tuple(
            np.array(layer.uv[loop_index].vector, dtype=np.float64)
            for loop_index in triangle.loops
        )
        raw_triangles.append((triangle, points))
        all_points.extend(points)
    extents = np.ptp(np.array(all_points), axis=0)
    linear_epsilon = max(float(max(extents)) * 1e-12, 1e-30)
    area_epsilon = max(float(extents[0] * extents[1]) * 1e-14, 1e-30)

    triangles = []
    degenerates = 0
    for triangle, points in raw_triangles:
        area = abs(_cross(points[0], points[1], points[2])) * 0.5
        if area <= area_epsilon:
            degenerates += 1
            continue
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        triangles.append(
            (min(xs), max(xs), min(ys), max(ys), triangle.polygon_index, points)
        )
    triangles.sort(key=lambda item: item[0])

    overlaps = 0
    for index, first in enumerate(triangles):
        for second in triangles[index + 1:]:
            if second[0] >= first[1] - linear_epsilon:
                break
            if (
                second[3] <= first[2] + linear_epsilon
                or second[2] >= first[3] - linear_epsilon
            ):
                continue
            if first[4] == second[4]:
                continue
            if _intersection_area(first[5], second[5], linear_epsilon) > area_epsilon:
                overlaps += 1
    return overlaps, degenerates


def _texel_coverage(obj, resolution: int) -> tuple[float, float]:
    """Return occupied texels and the fraction of triangles below one texel."""
    mesh = obj.data
    mesh.calc_loop_triangles()
    layer = mesh.uv_layers[LIGHTMAP_UV]
    areas = []
    for triangle in mesh.loop_triangles:
        points = [
            np.array(layer.uv[loop_index].vector, dtype=np.float64)
            for loop_index in triangle.loops
        ]
        areas.append(
            abs(_cross(points[0], points[1], points[2]))
            * 0.5
            * resolution
            * resolution
        )
    values = np.array(areas, dtype=np.float64)
    return float(values.sum()), float(np.count_nonzero(values < 1.0) / len(values))


def _place_in_cell(obj, cell, resolution: int) -> None:
    x, y, side = cell
    layer = obj.data.uv_layers[LIGHTMAP_UV]
    count = len(layer.uv)
    values = np.empty(count * 2, dtype=np.float32)
    layer.uv.foreach_get("vector", values)
    uv = values.reshape(-1, 2)
    if not np.isfinite(uv).all():
        raise RuntimeError(f"{obj.name} produced non-finite UV coordinates")

    lo = uv.min(axis=0)
    span = uv.max(axis=0) - lo
    if np.any(span < 1e-7):
        raise RuntimeError(f"{obj.name} produced a degenerate lightmap unwrap")
    uv = (uv - lo) / span

    inset = PADDING_PX / resolution
    content = side - 2 * inset
    if content * resolution < MIN_CONTENT_PX - 1e-5:
        raise RuntimeError(f"{obj.name} received only {content * resolution:.2f}px")
    uv = uv * content + np.array((x + inset, y + inset), dtype=np.float32)
    layer.uv.foreach_set("vector", uv.ravel())
    obj.data.update()


def _validate_cells(objects, cells, resolution: int) -> None:
    ordered = sorted(cells.items())
    for pos, (index_a, cell_a) in enumerate(ordered):
        ax, ay, size_a = cell_a
        if ax < -1e-7 or ay < -1e-7 or ax + size_a > 1.0000001 or ay + size_a > 1.0000001:
            raise RuntimeError(f"{objects[index_a].name} cell is outside 0..1")
        for index_b, cell_b in ordered[pos + 1:]:
            bx, by, size_b = cell_b
            overlap_x = min(ax + size_a, bx + size_b) - max(ax, bx)
            overlap_y = min(ay + size_a, by + size_b) - max(ay, by)
            if overlap_x > 1e-7 and overlap_y > 1e-7:
                raise RuntimeError(
                    f"atlas cells overlap: {objects[index_a].name} and {objects[index_b].name}"
                )

    for index, obj in enumerate(objects):
        layer = obj.data.uv_layers.get(LIGHTMAP_UV)
        if layer is None:
            raise RuntimeError(f"{obj.name} has no {LIGHTMAP_UV} layer")
        if len(obj.data.uv_layers) < 2:
            raise RuntimeError(f"{obj.name} does not have separate albedo and lightmap UVs")
        values = np.empty(len(layer.uv) * 2, dtype=np.float32)
        layer.uv.foreach_get("vector", values)
        uv = values.reshape(-1, 2)
        if uv.min() < -1e-6 or uv.max() > 1.000001:
            raise RuntimeError(f"{obj.name} has lightmap UVs outside 0..1")
        x, y, side = cells[index]
        inset = PADDING_PX / resolution
        if (
            uv[:, 0].min() < x + inset - 1e-5
            or uv[:, 1].min() < y + inset - 1e-5
            or uv[:, 0].max() > x + side - inset + 1e-5
            or uv[:, 1].max() > y + side - inset + 1e-5
        ):
            raise RuntimeError(f"{obj.name} escaped its assigned atlas cell")
        overlap_pairs, degenerate_triangles = _check_uv_geometry(obj)
        if overlap_pairs or degenerate_triangles:
            raise RuntimeError(
                f"{obj.name} final atlas UVs contain {overlap_pairs} overlapping "
                f"pairs and {degenerate_triangles} degenerate triangles"
            )


def _diagnostic(name: str, objects, cells) -> str:
    """Write a solid cell map; every colour is one isolated object allocation."""
    size = 1024
    pixels = np.full((size, size, 4), (0.025, 0.025, 0.025, 1.0), dtype=np.float32)
    for index, obj in enumerate(objects):
        x, y, side = cells[index]
        x0 = max(0, min(size - 1, int(round(x * size))))
        x1 = max(x0 + 1, min(size, int(round((x + side) * size))))
        y0 = max(0, min(size - 1, int(round(y * size))))
        y1 = max(y0 + 1, min(size, int(round((y + side) * size))))
        hue = (index * 0.61803398875) % 1.0
        rgb = colorsys.hsv_to_rgb(hue, 0.55, 0.82)
        pixels[y0:y1, x0:x1, :3] = rgb
        pixels[y0:y1, x0:x1, 3] = 1.0
        pixels[y0:y0 + 2, x0:x1, :3] = 0.0
        pixels[max(y1 - 2, y0):y1, x0:x1, :3] = 0.0
        pixels[y0:y1, x0:x0 + 2, :3] = 0.0
        pixels[y0:y1, max(x1 - 2, x0):x1, :3] = 0.0

    image_name = f"unit_a_lightmap_uv_{name}"
    old = bpy.data.images.get(image_name)
    if old is not None:
        bpy.data.images.remove(old)
    image = bpy.data.images.new(image_name, size, size, alpha=True, is_data=True)
    # Blender image origin is bottom-left, matching UV space.
    image.pixels.foreach_set(pixels.ravel())
    path = f"{ROOT}/shots/unit-a-lightmap-uv-{name}.png"
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()
    return path


def allocate(only=None) -> None:
    if bpy.data.filepath != OUT_BLEND:
        raise RuntimeError(f"Open {OUT_BLEND} before allocating Unit A UVs")

    requested = set(only or (name for name, _resolution in ATLASES))
    known = {name for name, _resolution in ATLASES}
    if not requested <= known:
        raise RuntimeError(f"unknown Unit A UV atlases: {sorted(requested - known)}")

    all_targets = []
    reports = []
    for name, resolution in ATLASES:
        if name not in requested:
            continue
        objects = _members(name)
        if not objects:
            raise RuntimeError(f"Unit A atlas {name} matched no meshes")
        all_targets.extend(objects)

        for obj in objects:
            _prepare_layer(obj)
            _smart_unwrap(obj)
            overlap_pairs, degenerate_triangles = _check_uv_geometry(obj)
            if overlap_pairs or degenerate_triangles:
                print(
                    f"[unit-a-uv] {obj.name}: smart projection had "
                    f"{overlap_pairs} crossing pairs and {degenerate_triangles} "
                    "degenerate triangles; using face pack"
                )
                _face_pack(obj)
                overlap_pairs, degenerate_triangles = _check_uv_geometry(obj)
            if overlap_pairs or degenerate_triangles:
                raise RuntimeError(
                    f"{obj.name} retained {overlap_pairs} overlapping pairs and "
                    f"{degenerate_triangles} degenerate UV triangles"
                )

        areas = [_world_area(obj) for obj in objects]
        weights = [math.sqrt(area) for area in areas]
        cells = _shelf(weights, resolution)
        for index, obj in enumerate(objects):
            _place_in_cell(obj, cells[index], resolution)
            overlap_pairs, degenerate_triangles = _check_uv_geometry(obj)
            occupied_texels, subtexel_fraction = _texel_coverage(obj, resolution)
            if overlap_pairs or degenerate_triangles or subtexel_fraction > 0.10:
                print(
                    f"[unit-a-uv] {obj.name}: atlas scaling exposed "
                    f"{overlap_pairs} crossing pairs and {degenerate_triangles} "
                    f"degenerate triangles; {subtexel_fraction * 100:.1f}% "
                    f"subtexel triangles across {occupied_texels:.0f}px; repacking faces"
                )
                _face_pack(obj)
                overlap_pairs, degenerate_triangles = _check_uv_geometry(obj)
                if overlap_pairs or degenerate_triangles:
                    raise RuntimeError(
                        f"{obj.name} face pack retained {overlap_pairs} overlapping "
                        f"pairs and {degenerate_triangles} degenerate triangles"
                    )
                _place_in_cell(obj, cells[index], resolution)
                occupied_texels, subtexel_fraction = _texel_coverage(obj, resolution)
                if subtexel_fraction > 0.25:
                    print(
                        f"[unit-a-uv] warning: {obj.name} retains "
                        f"{subtexel_fraction * 100:.1f}% subtexel triangles after "
                        f"face pack ({occupied_texels:.0f}px occupied)"
                    )
        _validate_cells(objects, cells, resolution)

        occupancy = sum(cell[2] ** 2 for cell in cells.values())
        density = []
        for index, area in enumerate(areas):
            usable = cells[index][2] * resolution - 2 * PADDING_PX
            density.append(usable / math.sqrt(area))
        path = _diagnostic(name, objects, cells)
        report = (
            f"[unit-a-uv] {name}: {len(objects)} meshes, {resolution}px, "
            f"{occupancy * 100:.1f}% cells, median {statistics.median(density):.1f}px/m -> {path}"
        )
        reports.append(report)
        print(report)

    mesh_ids = {}
    for obj in all_targets:
        pointer = obj.data.as_pointer()
        if pointer in mesh_ids:
            raise RuntimeError(
                f"bake targets share mesh data: {mesh_ids[pointer]} and {obj.name}"
            )
        mesh_ids[pointer] = obj.name

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print(f"[unit-a-uv] saved {OUT_BLEND}; {len(all_targets)} unique bake meshes")
    for report in reports:
        print(report)


allocate()
