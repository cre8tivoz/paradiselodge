"""
Bake room 1A's indirect light in Cycles.

Run inside Blender via MCP, after `build_room1a.py`:

    exec(open('tools/blender/bake_room1a.py').read())

Reset step 5. Writes `assets/bake/room1a_<group>.exr`, one per surface group.

## Diffuse Indirect, not Combined

Combined bakes the sun in with the bounce, which welds the 3pm angle into the
map: move the sun afterwards and every shadow in the room stays where it was.
Indirect leaves the direct sun realtime, so the angle is still a number in
`render/lighting.ts` and a rebake is not the price of touching it. It is the
difference between four bakes and twenty.

Colour is off as well as direct. What comes out is irradiance, not irradiance
times albedo, so the wallpaper is applied once at runtime by the material rather
than twice. A lightmap with the albedo already in it goes muddy the moment the
material multiplies through it again.

## Groups

One 2048 map per group, not one per object and not 4096 for the lot. The
lightmap UVs are packed across every object in a group at once, in multi object
edit mode, so the atlas is shared and the islands do not overlap.

The proxies are never selected, so nothing bakes onto them. They still occlude,
which is the entire reason they exist.

## Hardware

Metal, GPU, on an Apple Silicon Mac. Confirmed before the bake runs and the run
refuses to start if Cycles is pointed at the CPU. Iterate at 64 samples, final
pass at 256, and nothing above that: with denoising on Metal the difference is
not visible and the time is roughly linear.
"""

from __future__ import annotations

import os
import time

import bpy
import numpy as np

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
OUT = f"{ROOT}/assets/bake"
SIZE = 2048
LIGHTMAP_UV = "Lightmap"

# Which objects go in which atlas. Matched on a name prefix, first match wins,
# and anything unmatched is left out of the bake on purpose.
GROUPS = (
    ("shell", ("floor", "ceiling", "wall_", "skirt_", "rail_", "cornice_"), ()),
    ("joinery", ("sash_", "front_", "sill", "door", "verandahDoor"), ()),
    (
        "furniture",
        ("mattress", "rug"),
        # Sourced imports keep whatever the author called their meshes, so they
        # are collected through the empty each one is parented to and not by
        # name. `Loft037__0` is a chair leg and nothing about it says so.
        ("wardrobe", "bed", "dresser", "bedside", "chair", "chair2", "bedding",
         "frame", "magazines", "lighter", "syringe"),
    ),
)


def _override():
    """
    A context an operator will accept.

    The MCP addon runs this off a socket with no screen in `bpy.context`, and
    every UV operator wants a window, an area and a region. Blender is open in
    front of the author, so borrow its 3D viewport.
    """
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


def _members(prefixes, holders):
    out = []
    seen = set()

    def take(ob):
        # Proxies are occluders, never targets. Glass bakes nothing useful and
        # its UVs are not worth an atlas slot.
        if ob.type != "MESH" or ob.name in seen:
            return
        if ob.name.startswith("proxy") or ob.name.startswith("glass"):
            return
        seen.add(ob.name)
        out.append(ob)

    for ob in bpy.context.scene.collection.all_objects:
        if any(ob.name.startswith(p) for p in prefixes):
            take(ob)
    for name in holders:
        holder = bpy.data.objects.get(name)
        if holder is None:
            continue
        for child in holder.children_recursive:
            take(child)
    return out


def _select(objects):
    for ob in bpy.context.view_layer.objects:
        ob.select_set(False)
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def unwrap(objects) -> None:
    """
    A second UV set per group, packed as one atlas.

    `active_render` stays on the original UV map, because that is what the
    wallpaper and the boards are mapped through. `active` moves to the lightmap,
    because that is the one a bake writes into.
    """
    for ob in objects:
        uvs = ob.data.uv_layers
        lm = uvs.get(LIGHTMAP_UV) or uvs.new(name=LIGHTMAP_UV)
        for layer in uvs:
            layer.active_render = layer.name != LIGHTMAP_UV
        uvs.active = lm

    _select(objects)
    with bpy.context.temp_override(**_override()):
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        # Angle based, then packed across every object in the group at once.
        # Per object packing would give each of them the whole 0-1 square and
        # they would land on top of each other in the atlas.
        bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.012)
        bpy.ops.uv.pack_islands(margin=0.006)
        bpy.ops.object.mode_set(mode="OBJECT")


def bake_target(objects, image):
    """Point every material in the group at the group's image and select it."""
    seen = set()
    for ob in objects:
        for slot in ob.material_slots:
            mat = slot.material
            if mat is None or mat.name in seen:
                continue
            seen.add(mat.name)
            nt = mat.node_tree
            node = nt.nodes.get("BAKE_TARGET")
            if node is None:
                node = nt.nodes.new("ShaderNodeTexImage")
                node.name = "BAKE_TARGET"
                node.label = "BAKE_TARGET"
                node.location = (-900, 600)
            node.image = image
            # Deselect everything, then select, then make active, in that order.
            # Cycles wants the target node "active and selected" and it means
            # both: with only the active flag set it cancels the bake and says
            # it found no image texture node at all.
            for n in nt.nodes:
                n.select = False
            node.select = True
            nt.nodes.active = node
    return seen


def configure(samples: int) -> None:
    scn = bpy.context.scene
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.refresh_devices()
    if prefs.compute_device_type != "METAL":
        raise RuntimeError(f"Cycles is on {prefs.compute_device_type}, not METAL")
    if not any(d.use and d.type == "METAL" for d in prefs.devices):
        raise RuntimeError("no Metal device enabled in Cycles preferences")

    scn.render.engine = "CYCLES"
    scn.cycles.device = "GPU"
    scn.cycles.samples = samples
    scn.cycles.use_denoising = True
    scn.cycles.denoiser = "OPENIMAGEDENOISE"
    scn.render.use_persistent_data = True

    bake = scn.render.bake
    bake.use_selected_to_active = False
    bake.use_pass_direct = False
    bake.use_pass_indirect = True
    # Irradiance, not irradiance times albedo. The material multiplies the
    # albedo back in at runtime and doing it twice is what makes a lightmap mud.
    bake.use_pass_color = False
    bake.margin_type = "ADJACENT_FACES"
    bake.margin = 6
    bake.use_clear = True


def denoise(image, name: str) -> str:
    """
    Run the baked map through OpenImageDenoise.

    **Cycles does not denoise a bake.** `cycles.use_denoising` is the render
    denoiser and the bake output goes straight to the image without it, which is
    why the first preview came back as salt and pepper over every surface in the
    room. Bake samples are per texel, so 64 of them on an indirect pass is a
    noisy texel, and no margin setting hides that.

    So the map goes through the compositor's Denoise node afterwards, which is
    the same OIDN the instruction asks for, in HDR mode because this is
    irradiance and not a display image. It costs a couple of seconds against
    minutes for the samples it would take to get there honestly.

    Not OptiX. That is NVIDIA only and this is an Apple Silicon Mac.
    """
    scn = bpy.data.scenes.new(f"denoise_{name}")
    scn.render.resolution_x = SIZE
    scn.render.resolution_y = SIZE
    scn.render.resolution_percentage = 100
    # Blender 5 moved the compositor out of `scene.node_tree` and into a node
    # group hung off `scene.compositing_node_group`. Every recipe on the
    # internet still says node_tree, and it is gone.
    nt = bpy.data.node_groups.new(f"denoise_{name}", "CompositorNodeTree")
    scn.compositing_node_group = nt
    scn.use_nodes = True

    src = nt.nodes.new("CompositorNodeImage")
    src.image = image
    dn = nt.nodes.new("CompositorNodeDenoise")
    view = nt.nodes.new("CompositorNodeViewer")
    nt.links.new(src.outputs["Image"], dn.inputs["Image"])
    nt.links.new(dn.outputs["Image"], view.inputs["Image"])

    with bpy.context.temp_override(scene=scn):
        bpy.ops.render.render("EXEC_DEFAULT", write_still=False)

    # Straight back into the bake image through the Viewer, rather than out
    # through a File Output node. In Blender 5 that node only offers multilayer
    # EXR and the result would need unpacking again on the way in.
    viewer = bpy.data.images.get("Viewer Node")
    if viewer is None:
        raise RuntimeError("compositor produced no viewer image")
    buf = np.empty(SIZE * SIZE * 4, dtype=np.float32)
    viewer.pixels.foreach_get(buf)
    image.pixels.foreach_set(buf)
    image.update()

    bpy.data.scenes.remove(scn)
    bpy.data.node_groups.remove(nt)

    final = f"{OUT}/room1a_{name}.exr"
    image.filepath_raw = final
    image.file_format = "OPEN_EXR"
    image.save()
    return final


def preview(path: str) -> None:
    """
    Render the bake on its own, with nothing else lighting the room.

    Worth the twenty lines. An atlas looks plausible as a thumbnail whatever is
    wrong with it, and the two failures that matter are invisible there: islands
    that overlap read as light from the wrong surface, and a lightmap UV that
    did not become the one the image is sampled through reads as nothing at all.
    Both are obvious the moment the map is put back on the geometry.

    Non destructive. The originals go back on afterwards.
    """
    scn = bpy.context.scene
    saved = []
    mats = {}

    for name, prefixes, holders in GROUPS:
        image = bpy.data.images.get(f"bake_{name}")
        if image is None:
            continue
        mat = bpy.data.materials.new(f"preview_{name}")
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = LIGHTMAP_UV
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.interpolation = "Linear"
        emit = nt.nodes.new("ShaderNodeEmission")
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
        nt.links.new(tex.outputs["Color"], emit.inputs["Color"])
        nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
        mats[name] = mat

        for ob in _members(prefixes, holders):
            saved.append((ob, [s.material for s in ob.material_slots]))
            for slot in ob.material_slots:
                slot.material = mat

    world, sun = scn.world, bpy.data.objects.get("sun")
    scn.world = None
    if sun:
        sun.hide_render = True
    samples, exposure = scn.cycles.samples, scn.view_settings.exposure
    scn.cycles.samples = 16
    # Indirect irradiance is a small number. Without a lift the preview is a
    # black rectangle and proves nothing.
    scn.view_settings.exposure = exposure + 3.0
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)

    scn.cycles.samples, scn.view_settings.exposure = samples, exposure
    scn.world = world
    if sun:
        sun.hide_render = False
    for ob, originals in saved:
        for slot, original in zip(ob.material_slots, originals):
            slot.material = original
    for mat in mats.values():
        bpy.data.materials.remove(mat)


def bake(samples: int = 64) -> None:
    configure(samples)
    os.makedirs(OUT, exist_ok=True)

    for name, prefixes, holders in GROUPS:
        objects = _members(prefixes, holders)
        if not objects:
            print(f"[bake] {name}: nothing matched, skipped")
            continue

        image = bpy.data.images.get(f"bake_{name}")
        if image is None:
            image = bpy.data.images.new(
                f"bake_{name}", SIZE, SIZE, float_buffer=True, is_data=True
            )
        image.colorspace_settings.name = "Non-Color"

        t = time.time()
        unwrap(objects)
        bake_target(objects, image)
        _select(objects)
        with bpy.context.temp_override(**_override()):
            # EXEC_DEFAULT, not the default invoke. Invoked from a viewport this
            # operator starts a background job and returns immediately, and the
            # first run of this script wrote three black 2048 squares in four
            # seconds because of it.
            result = bpy.ops.object.bake("EXEC_DEFAULT", type="DIFFUSE")
        if "FINISHED" not in result:
            raise RuntimeError(f"bake {name} returned {result}")

        path = denoise(image, name)
        print(f"[bake] {name}: {len(objects)} objects, {round(time.time() - t, 1)}s -> {path}")

    bpy.ops.wm.save_mainfile()
    print("[bake] done")


bake(64)
