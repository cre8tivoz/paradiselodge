"""
Export room 1A for the runtime.

Run inside Blender via MCP, after `build_room1a.py` and `bake_room1a.py`:

    exec(open('tools/blender/export_room1a.py').read())

Reset step 6. Writes:

    public/models/room1a.glb          geometry, materials, node names
    public/textures/bake/*.exr        the three lightmap atlases

## What is exported and what is not

The `proxy` collection stays behind. The verandah and the first floor hall are
occluders that exist so the bake is honest about how much sky this room can see,
and the runtime already has both of them as real geometry in `verandah.ts` and
`lodge.ts`.

Cameras and lights stay behind too. `render/lighting.ts` owns the sun and
`render/environment.ts` owns the sky, and a second copy of either arriving with
the room is how a scene ends up with two suns.

## Node names are the contract

`src/interact` and `src/case` resolve everything by object id, so the Blender
object names are the interface and step 7 wires them up. Nothing here renames
anything, and `sill` in particular has to arrive spelled exactly that way.

## The lightmaps are half float EXR, not KTX2

KTX2 wants an encoder. `toktx`, `basisu` and `gltfpack` are all absent, and
CLAUDE.md says not to add tooling, so this ships what Blender and three can both
already do: half float EXR with DWAA compression, read by `EXRLoader`, which is
in the three package alongside the loaders the reset already allowed.

Half float is not a compromise here. The map is indirect irradiance, it tops out
around 20, and half float carries that with three decimal places to spare. The
32 bit files the bake writes are 50MB each and most of that is precision nobody
can see.
"""

from __future__ import annotations

import os

import bpy

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
GLB = f"{ROOT}/public/models/room1a.glb"
BAKE_OUT = f"{ROOT}/public/textures/bake"
BAKE_SRC = f"{ROOT}/assets/bake"
GROUPS = ("shell", "joinery", "furniture")

# Longest edge any texture is allowed to be in the shipped room.
#
# The sourced models arrive with 2k and 4k sheets on furniture the player walks
# past, and exported as they came the room was 42MB against a 25MB budget with
# the geometry accounting for almost none of it. At 1024 the same room is a
# third of that and nothing in it is closer than a metre from the camera.
MAX_TEXTURE = 1024

# Normal and roughness maps get half that. They are the bulk of the room: a 4k
# normal is high frequency noise, which is the worst thing you can hand a JPEG
# encoder, and one of them came out at 6MB on its own. At 512 on furniture the
# player never leans on, none of it reads as lost.
MAX_DATA_TEXTURE = 512
DATA_SUFFIXES = ("_normal", "_metallicRoughness", "_orm", "_occlusion")


def _override():
    win = bpy.context.window_manager.windows[0]
    area = next(a for a in win.screen.areas if a.type == "VIEW_3D")
    region = next(r for r in area.regions if r.type == "WINDOW")
    return {
        "window": win,
        "screen": win.screen,
        "area": area,
        "region": region,
        "scene": bpy.context.scene,
        "view_layer": bpy.context.view_layer,
    }


def exportable():
    """Everything except the proxies, the cameras and the sun."""
    proxy = bpy.data.collections.get("proxy")
    excluded = {o.name for o in proxy.objects} if proxy else set()
    out = []
    for ob in bpy.context.scene.collection.all_objects:
        if ob.name in excluded or ob.type in {"CAMERA", "LIGHT"}:
            continue
        out.append(ob)
    return out


def shrink_textures() -> int:
    """
    Cap every image at MAX_TEXTURE before the exporter sees it.

    In place, and the file is deliberately not saved afterwards: the .blend is
    rebuilt from `build_room1a.py` and the sources are untouched on disk.
    """
    touched = 0
    for image in bpy.data.images:
        if image.type != "IMAGE" or image.users == 0:
            continue
        # Not `has_data`. A packed image reports False until something decodes
        # it, and which ones happen to be decoded depends on what ran before
        # this: the same export capped 33 textures standalone and 13 straight
        # after a bake, and the room came back at 28MB both times it was 13.
        w, h = image.size
        if w == 0 or h == 0:
            continue
        longest = max(w, h)
        cap = MAX_DATA_TEXTURE if image.name.endswith(DATA_SUFFIXES) else MAX_TEXTURE
        if longest <= cap:
            continue
        factor = cap / longest
        try:
            image.scale(max(1, int(w * factor)), max(1, int(h * factor)))
            # Re-pack. Every texture off a sourced glb arrives packed, and the
            # exporter hands the packed bytes straight through: scaling the
            # buffer without re-packing changed nothing and the room came back
            # at 28MB with 4k normal maps still in it.
            if image.packed_file is not None:
                image.pack()
        except RuntimeError:
            continue
        touched += 1
    return touched


def prune_uvs(objects) -> int:
    """
    Leave every mesh with exactly two UV sets: its own, then the lightmap.

    The exporter writes UV layers out in order, so the lightmap has to be the
    second one on every mesh or it lands on TEXCOORD_2 for some of them and the
    runtime has no way to tell which. Three of the sourced meshes shipped spare
    UV sets their materials do not sample; those go.

    `lightMap` and `aoMap` read the second set, which is `uv1` in current three
    and was `uv2` before r151. This is what makes that true.
    """
    dropped = 0
    for ob in objects:
        if ob.type != "MESH":
            continue
        uvs = ob.data.uv_layers
        keep_render = next((l.name for l in uvs if l.active_render), None)
        for layer in [l for l in uvs]:
            if layer.name in {keep_render, "Lightmap"}:
                continue
            uvs.remove(layer)
            dropped += 1
    return dropped


def export_glb() -> int:
    objects = exportable()
    for ob in bpy.context.view_layer.objects:
        ob.select_set(False)
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]

    os.makedirs(os.path.dirname(GLB), exist_ok=True)
    with bpy.context.temp_override(**_override()):
        bpy.ops.export_scene.gltf(
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
            # JPEG, because every texture in this room is a photograph of a
            # surface and none of them needs an alpha channel.
            export_image_format="JPEG",
            export_jpeg_quality=82,
            export_texcoords=True,
            export_normals=True,
            export_tangents=False,
        )
    return os.path.getsize(GLB)


def export_lightmaps() -> dict[str, int]:
    """
    Re-save each bake as half float, DWAA compressed.

    Same pixels, a fraction of the bytes. The bake writes 32 bit because that is
    what a bake should write; what ships does not need it.
    """
    os.makedirs(BAKE_OUT, exist_ok=True)
    scn = bpy.context.scene
    saved = (
        scn.render.image_settings.file_format,
        scn.render.image_settings.color_depth,
        scn.render.image_settings.exr_codec,
        scn.render.image_settings.color_mode,
    )
    scn.render.image_settings.file_format = "OPEN_EXR"
    scn.render.image_settings.color_depth = "16"
    scn.render.image_settings.exr_codec = "DWAA"
    scn.render.image_settings.color_mode = "RGB"

    sizes = {}
    for name in GROUPS:
        image = bpy.data.images.get(f"bake_{name}")
        if image is None:
            image = bpy.data.images.load(f"{BAKE_SRC}/room1a_{name}.exr")
        path = f"{BAKE_OUT}/room1a_{name}.exr"
        image.save_render(filepath=path, scene=scn)
        sizes[name] = os.path.getsize(path)

    (
        scn.render.image_settings.file_format,
        scn.render.image_settings.color_depth,
        scn.render.image_settings.exr_codec,
        scn.render.image_settings.color_mode,
    ) = saved
    return sizes


def report() -> None:
    shrunk = shrink_textures()
    print(f"[export] {shrunk} textures capped at {MAX_TEXTURE}")
    dropped = prune_uvs(exportable())
    print(f"[export] {dropped} spare UV sets dropped")
    glb = export_glb()
    maps = export_lightmaps()
    total = glb + sum(maps.values())
    print(f"[export] room1a.glb  {glb / 1e6:.2f} MB")
    for name, size in maps.items():
        print(f"[export] {name:<10} {size / 1e6:.2f} MB")
    print(f"[export] TOTAL       {total / 1e6:.2f} MB  (budget 25)")


report()
