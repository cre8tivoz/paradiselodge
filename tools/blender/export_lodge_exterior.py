"""Export the authored Scene 1 lodge exterior to the realtime GLB.

Run in the connected Blender session after ``build_lodge_exterior.py``:

    exec(open('tools/blender/export_lodge_exterior.py').read())

The game owns its camera, sun and interactions. This file exports only the
facade, balcony, signs, street dressing and their material assignments.
"""

from __future__ import annotations

import os

import bpy

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
SOURCE_BLEND = f"{ROOT}/assets/blender/lodge-exterior.blend"
GLB = f"{ROOT}/public/models/lodge-exterior.glb"
MAX_BYTES = 12 * 1024 * 1024


def override():
    windows = bpy.context.window_manager.windows
    if not windows:
        raise RuntimeError("Exterior export needs an open Blender window")
    window = windows[0]
    area = next((item for item in window.screen.areas if item.type == "VIEW_3D"), None)
    if area is None:
        raise RuntimeError("Exterior export needs an open 3D viewport")
    region = next(item for item in area.regions if item.type == "WINDOW")
    return {
        "window": window,
        "screen": window.screen,
        "area": area,
        "region": region,
        "scene": bpy.context.scene,
        "view_layer": bpy.context.view_layer,
    }


def main() -> None:
    if bpy.data.filepath != SOURCE_BLEND:
        bpy.ops.wm.open_mainfile(filepath=SOURCE_BLEND)

    objects = [obj for obj in bpy.context.scene.objects if obj.type in {"MESH", "CURVE", "FONT"}]
    if not objects:
        raise RuntimeError("No exterior geometry found")

    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]

    os.makedirs(os.path.dirname(GLB), exist_ok=True)
    with bpy.context.temp_override(**override()):
        result = bpy.ops.export_scene.gltf(
            filepath=GLB,
            export_format="GLB",
            use_selection=True,
            export_yup=True,
            export_apply=True,
            export_cameras=False,
            export_lights=False,
            export_animations=False,
            export_skins=False,
            export_morph=False,
            export_image_format="JPEG",
            export_jpeg_quality=82,
            export_texcoords=True,
            export_normals=True,
            export_tangents=False,
            export_extras=True,
        )
    if "FINISHED" not in result:
        raise RuntimeError(f"Exterior GLB export returned {result}")

    size = os.path.getsize(GLB)
    if size > MAX_BYTES:
        raise RuntimeError(f"Exterior GLB is {size / 1e6:.2f} MB; budget is {MAX_BYTES / 1e6:.2f} MB")
    print(f"[exterior-export] {len(objects)} objects")
    print(f"[exterior-export] lodge-exterior.glb {size / 1e6:.2f} MB")


main()
