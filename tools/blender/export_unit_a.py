"""Export the complete baked lodge interior for the Scene 1 runtime.

Run inside Blender through BlenderMCP after ``bake_unit_a.py``:

    exec(open('tools/blender/export_unit_a.py').read())

Writes ``public/models/unit-a.glb`` and five half-float DWAA EXRs under
``public/textures/bake``. Cameras and lights stay in Blender; realtime owns the
sun, environment and player camera. The combined delivery must remain below the
60 MB Unit A budget.
"""

from __future__ import annotations

import os

import bpy

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
SOURCE_BLEND = f"{ROOT}/assets/blender/unit-a.blend"
GLB = f"{ROOT}/public/models/unit-a.glb"
BAKE_SOURCE = f"{ROOT}/assets/bake"
BAKE_OUT = f"{ROOT}/public/textures/bake"
LIGHTMAP_UV = "Lightmap"
GROUPS = ("room1a", "parlour", "reception", "staircase", "hallway")

MAX_TEXTURE = 1024
MAX_DATA_TEXTURE = 512
DATA_MARKERS = ("normal", "metallicroughness", "_orm", "occlusion", "roughness")

REQUIRED_IDS = (
    "desk",
    "keyRack",
    "ledger",
    "phone",
    "ashtray",
    "armchair",
    "parlourTable",
    "diary",
    "television",
    "standardLamp",
    "bed",
    "dresser",
    "wardrobe",
    "chair",
    "sideTable",
    "sash",
    "sill",
    "frontWindow",
    "frame",
    "magazines",
    "map",
    "note",
    "lighter",
    "door",
    "verandahDoor",
)


def _override():
    windows = bpy.context.window_manager.windows
    if not windows:
        raise RuntimeError("Unit A export needs an open Blender window")
    window = windows[0]
    area = next((item for item in window.screen.areas if item.type == "VIEW_3D"), None)
    if area is None:
        raise RuntimeError("Unit A export needs an open 3D viewport")
    region = next(item for item in area.regions if item.type == "WINDOW")
    return {
        "window": window,
        "screen": window.screen,
        "area": area,
        "region": region,
        "scene": bpy.context.scene,
        "view_layer": bpy.context.view_layer,
    }


def exportable():
    return [
        obj
        for obj in bpy.context.scene.objects
        if obj.type not in {"CAMERA", "LIGHT"}
    ]


def _validate_ids() -> None:
    missing = [name for name in REQUIRED_IDS if bpy.data.objects.get(name) is None]
    if missing:
        raise RuntimeError(f"Unit A is missing gameplay object IDs: {missing}")


def shrink_textures() -> list[tuple[str, tuple[int, int], tuple[int, int]]]:
    """Cap source textures in memory; the authored files and blend stay intact."""
    touched = []
    for image in bpy.data.images:
        if image.name.startswith("unit_a_bake_") or image.name in {
            "Render Result",
            "Viewer Node",
        }:
            continue
        width, height = image.size
        if width <= 0 or height <= 0:
            continue
        lower = image.name.lower()
        cap = MAX_DATA_TEXTURE if any(marker in lower for marker in DATA_MARKERS) else MAX_TEXTURE
        longest = max(width, height)
        if longest <= cap:
            continue
        factor = cap / longest
        target = (max(1, int(width * factor)), max(1, int(height * factor)))
        try:
            image.scale(*target)
            if image.packed_file is not None:
                image.pack()
        except RuntimeError:
            continue
        touched.append((image.name, (width, height), target))
    return touched


def prune_uvs(objects) -> int:
    """Keep albedo as TEXCOORD_0 and Lightmap as TEXCOORD_1 on bake meshes."""
    dropped = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        layers = obj.data.uv_layers
        render = next((layer for layer in layers if layer.active_render), None)
        if render is None:
            raise RuntimeError(f"{obj.name} has no active albedo UV layer")
        keep = {render.name}
        lightmap = layers.get(LIGHTMAP_UV)
        if lightmap is not None:
            keep.add(LIGHTMAP_UV)
        for layer in list(layers):
            if layer.name not in keep:
                layers.remove(layer)
                dropped += 1
        names = [layer.name for layer in layers]
        if lightmap is not None and names != [render.name, LIGHTMAP_UV]:
            raise RuntimeError(f"{obj.name} UV order is {names}, expected albedo then Lightmap")
    return dropped


def export_glb(objects) -> int:
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]

    os.makedirs(os.path.dirname(GLB), exist_ok=True)
    with bpy.context.temp_override(**_override()):
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
        raise RuntimeError(f"Unit A GLB export returned {result}")
    return os.path.getsize(GLB)


def export_lightmaps() -> dict[str, int]:
    os.makedirs(BAKE_OUT, exist_ok=True)
    scene = bpy.context.scene
    settings = scene.render.image_settings
    saved = (
        settings.file_format,
        settings.color_depth,
        settings.exr_codec,
        settings.color_mode,
    )
    settings.file_format = "OPEN_EXR"
    settings.color_depth = "16"
    settings.exr_codec = "DWAA"
    settings.color_mode = "RGB"

    sizes = {}
    try:
        for name in GROUPS:
            source = f"{BAKE_SOURCE}/unit-a_{name}.exr"
            if not os.path.exists(source):
                raise RuntimeError(f"missing final Unit A bake {source}")
            image = bpy.data.images.load(source, check_existing=False)
            try:
                if tuple(image.size) not in {
                    (2048, 2048),
                    (1024, 1024),
                    (512, 512),
                }:
                    raise RuntimeError(f"unexpected {name} bake size {tuple(image.size)}")
                path = f"{BAKE_OUT}/unit-a_{name}.exr"
                image.save_render(filepath=path, scene=scene)
                sizes[name] = os.path.getsize(path)
            finally:
                bpy.data.images.remove(image)
    finally:
        (
            settings.file_format,
            settings.color_depth,
            settings.exr_codec,
            settings.color_mode,
        ) = saved
    return sizes


def report() -> None:
    if bpy.data.filepath != SOURCE_BLEND:
        raise RuntimeError(f"Open {SOURCE_BLEND} before exporting Unit A")
    _validate_ids()
    objects = exportable()
    touched = shrink_textures()
    dropped = prune_uvs(objects)
    glb_size = export_glb(objects)
    maps = export_lightmaps()
    total = glb_size + sum(maps.values())

    print(f"[unit-a-export] {len(objects)} objects exported")
    print(f"[unit-a-export] {len(touched)} textures capped; {dropped} spare UVs dropped")
    print(f"[unit-a-export] unit-a.glb {glb_size / 1e6:.2f} MB")
    for name, size in maps.items():
        print(f"[unit-a-export] {name:<10} {size / 1e6:.2f} MB")
    print(f"[unit-a-export] TOTAL      {total / 1e6:.2f} MB (budget 60)")
    if total >= 60_000_000:
        raise RuntimeError(f"Unit A delivery is {total / 1e6:.2f} MB, over 60 MB")


report()
