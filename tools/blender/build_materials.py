"""
The shared material library for Unit A.

Run inside Blender via MCP, on its own, before any interior space is assembled:

    exec(open('tools/blender/build_materials.py').read())

Writes `assets/blender/materials.blend`.

## Why this file exists at all

Unit A is five contiguous interiors baked as one scene, and the walls of the
hall are the walls of the reception. If each space carried its own copy of
"nicotine plaster" they would drift: two beiges a few percent apart read as a
lighting fault at the doorway between them, and there is no way to fix that
except to find every copy.

**Every space links this file. It does not append it and it does not copy it.**
A link is a live reference, so the day the plaster is judged too yellow it is
judged once.

## What is here and what is not

Seven surfaces, from BRIEF.md's palette and ASSETS.md's level list. Poly Haven,
CC0, 2k, full PBR: albedo, OpenGL normal, roughness, and displacement where the
set ships one.

Two of them are the same maps under a different tint, and that is deliberate.
A cornice is painted plaster and a picture rail is stained timber; they are
shapes, not surfaces, and giving each its own 2k download would cost eight
megabytes to say something the tint already says.

Room 1A is **not** re-materialled from here. It is baked and shipped and its
floor already runs on Poly Haven `wood_planks`, which is in this table under
the name the rest of the building will use. Unit A brings 1A in as it stands.

## The tints are the palette, not taste

`ASSETS.md` locks the hex values and they are transcribed here. A sourced
albedo is a photograph of somebody else's wall, so it arrives at its own
colour: the tint is a multiply that pulls it onto the palette while keeping
the variation that made it worth sourcing. Change one here, not per space.
"""

from __future__ import annotations

import json
import os
import urllib.request

import bpy

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
BLEND = f"{ROOT}/assets/blender/materials.blend"
CACHE = f"{ROOT}/assets/sourced/polyhaven"

# The four maps that get wired, and nothing else.
#
# Poly Haven ships seven. `nor_dx` is the DirectX normal and this project is
# OpenGL throughout; the two differ only in the sign of the green channel, so
# picking the wrong one is not an error, it just lights every bump as a dent
# and sends you off tuning the sun. `arm` is roughness and occlusion packed
# into one image, which is a delivery format for engines that want it and
# redundant beside the separate maps. `Displacement` would need real
# subdivision to mean anything.
#
# AO is downloaded and deliberately **not** wired. It is micro-occlusion baked
# into the photograph, and Unit A computes occlusion for real in Cycles:
# multiplying it into the albedo as well darkens every crevice twice. It is
# here because a realtime space outside the bake (Unit B) will want it.
MAPS = ("Diffuse", "nor_gl", "Rough", "AO")
RESOLUTION = "2k"
FORMAT = "jpg"

# BlenderMCP keeps its settings, including the Sketchfab API key, on the scene.
# `read_homefile` throws the scene away and takes the key with it, which is a
# blocker rather than a bug the next time anything wants to download. Carried
# across by hand, same as `build_room1a.py`.
MCP_SETTINGS = (
    "blendermcp_use_polyhaven",
    "blendermcp_use_sketchfab",
    "blendermcp_sketchfab_api_key",
    "blendermcp_use_hyper3d",
    "blendermcp_hyper3d_mode",
    "blendermcp_hyper3d_api_key",
    "blendermcp_port",
    "blendermcp_server_running",
)

# name -> (poly haven id, tint as linear-ish sRGB from the palette, tile metres)
#
# `tile` is how much real surface one repeat of the map covers, off the Poly
# Haven listing. It is carried here so a space scales its UVs to the surface
# rather than to whatever looked right, which is what keeps board width the
# same in the hall and in the parlour.
LIBRARY = {
    # nicotine #C4B393. Was cream once, per ASSETS.md.
    "plaster_nicotine": ("beige_wall_001", (0.77, 0.70, 0.58), 2.0),
    # The same plaster, painted and gone off. Cornices and ceiling roses were
    # white and are now the colour of thirty years of cigarettes.
    #
    # **Above 1 on purpose.** The tint is a multiply, so it can only darken, and
    # the source photograph is already a beige wall. At (0.88, 0.84, 0.74) this
    # rendered nine percent off `plaster_nicotine`, which is not a cornice, it
    # is the same wall twice. Blender takes a multiply factor over 1 and it is
    # the honest way to say "the same plaster, painted white" without sourcing a
    # second 8MB set to hold one lighter beige.
    "plaster_cornice": ("beige_wall_001", (1.34, 1.30, 1.19), 2.0),
    # carpet-brown #5C4433, worn to the backing on the treads.
    "carpet_runner": ("dirty_carpet", (0.36, 0.27, 0.20), 1.5),
    # timber-dark #3B2A1E. Skirtings, banister, reception desk, picture rail.
    "timber_dark": ("dark_wood", (0.23, 0.17, 0.12), 1.2),
    # Tessellated entry tile. Victorian, geometric, and the first floor anybody
    # walks on.
    "tile_entry": ("checkered_pavement_tiles", (0.72, 0.66, 0.58), 1.0),
    # Worn floorboards. Already under room 1A, named here for everything else.
    "boards_worn": ("wood_planks", (0.78, 0.68, 0.54), 1.5),
}

def clear() -> None:
    kept = {}
    old = bpy.context.scene
    for key in MCP_SETTINGS:
        if hasattr(old, key):
            kept[key] = getattr(old, key)

    bpy.ops.wm.read_homefile(use_empty=True)

    scn = bpy.context.scene
    for key, value in kept.items():
        try:
            setattr(scn, key, value)
        except (AttributeError, TypeError):
            pass
    scn.unit_settings.system = "METRIC"
    scn.unit_settings.scale_length = 1.0


def wanted_sets() -> list[str]:
    """The Poly Haven ids to download, deduplicated, in a stable order."""
    return sorted({entry[0] for entry in LIBRARY.values()})


def _get(url: str, binary: bool = False):
    """
    Poly Haven's API and CDN both 403 urllib's default User-Agent, and the
    error arrives as a plain HTTPError with nothing in it about why. Anything
    identifiable works.
    """
    req = urllib.request.Request(url, headers={"User-Agent": "paradise-lodge/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    return data if binary else data.decode()


def fetch(asset: str) -> dict[str, str]:
    """
    Pull one Poly Haven set straight off their API, cached on disk.

    Deliberately not the addon's downloader. That one is an MCP call rather
    than a Python API, so a file built with it can only be rebuilt by a human
    driving Blender through five downloads in the right order, and this file is
    gitignored precisely because it is meant to be rebuildable by running one
    script. It also wires only albedo and roughness, and silently leaves the
    normal unconnected.

    `assets/sourced/polyhaven/` is a cache, not a source of truth, same as the
    Sketchfab downloads beside it. `docs/CREDITS.md` holds the ids.
    """
    os.makedirs(f"{CACHE}/{asset}", exist_ok=True)
    files = json.loads(_get(f"https://api.polyhaven.com/files/{asset}"))

    out = {}
    for kind in MAPS:
        entry = files.get(kind)
        if entry is None:
            print(f"[materials] {asset}: no {kind} map, skipped")
            continue
        url = entry[RESOLUTION][FORMAT]["url"]
        path = f"{CACHE}/{asset}/{asset}_{kind}_{RESOLUTION}.{FORMAT}"
        if not os.path.exists(path):
            with open(path, "wb") as fh:
                fh.write(_get(url, binary=True))
        out[kind] = path
    return out


def build(material_name: str, asset: str, rgb, tile: float):
    """
    One library material: four maps, a palette tint, and nothing else.

    The tint is a multiply between the albedo and the BSDF rather than a flat
    colour on it, because the whole point of sourcing a photograph is the
    variation in it. A flat colour here would be `surfaces.ts` again with a
    bigger download.
    """
    paths = fetch(asset)
    mat = bpy.data.materials.new(material_name)
    mat.use_nodes = True
    mat.use_fake_user = True  # nothing in this file has geometry on it
    mat["tile_metres"] = tile
    mat["polyhaven_id"] = asset

    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")

    def image_node(kind: str, y: int, data: bool):
        img = bpy.data.images.load(paths[kind], check_existing=True)
        img.name = f"{asset}_{kind}"
        if data:
            img.colorspace_settings.name = "Non-Color"
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = img
        node.location = (bsdf.location.x - 760, bsdf.location.y + y)
        node.label = kind
        return node

    if "Diffuse" in paths:
        albedo = image_node("Diffuse", 320, data=False)
        mix = nt.nodes.new("ShaderNodeMixRGB")
        mix.blend_type = "MULTIPLY"
        mix.inputs["Fac"].default_value = 1.0
        mix.inputs["Color2"].default_value = (*rgb, 1.0)
        mix.location = (bsdf.location.x - 300, bsdf.location.y + 300)
        nt.links.new(mix.inputs["Color1"], albedo.outputs["Color"])
        nt.links.new(bsdf.inputs["Base Color"], mix.outputs["Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)

    if "Rough" in paths:
        rough = image_node("Rough", 40, data=True)
        nt.links.new(bsdf.inputs["Roughness"], rough.outputs["Color"])

    # The normal is the one the addon leaves unlinked, and an unlinked normal
    # is a flat photograph of a wall: the surface relief that is most of what a
    # PBR set buys you never arrives, and nothing anywhere reports it.
    if "nor_gl" in paths:
        nor = image_node("nor_gl", -240, data=True)
        nmap = nt.nodes.new("ShaderNodeNormalMap")
        nmap.location = (bsdf.location.x - 300, bsdf.location.y - 240)
        nt.links.new(nmap.inputs["Color"], nor.outputs["Color"])
        nt.links.new(bsdf.inputs["Normal"], nmap.outputs["Normal"])

    # Loaded, labelled, and left unconnected on purpose. See MAPS.
    if "AO" in paths:
        image_node("AO", -520, data=True)

    return mat


def save() -> None:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, compress=True)
    print(f"[materials] saved {BLEND}")


def main() -> None:
    clear()
    for name, (asset, rgb, tile) in sorted(LIBRARY.items()):
        mat = build(name, asset, rgb, tile)
        nt = mat.node_tree
        bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
        wired = [s for s in ("Base Color", "Roughness", "Normal") if bsdf.inputs[s].is_linked]
        maps = len([n for n in nt.nodes if n.type == "TEX_IMAGE"])
        print(f"[materials] {name:18} {asset:26} {maps} maps, wired {', '.join(wired)}")

    # Packed, so the file stands on its own and a cleared cache cannot break
    # five spaces at once. It is the reason this lands at 40MB and the reason
    # it is gitignored: `build_materials.py` plus `docs/CREDITS.md` rebuild it.
    bpy.ops.file.pack_all()
    save()


main()
