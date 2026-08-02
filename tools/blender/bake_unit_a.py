"""Bake Unit A's five indirect-light atlases in Cycles.

Run inside Blender through BlenderMCP after ``unwrap_unit_a.py``:

    exec(open('tools/blender/bake_unit_a.py').read())

The default entry point is the 64-sample iteration pass. For the accepted pass,
load the definitions without the last line and call ``bake(256, "final")``.
Each space is one independently saved group, so an interrupted run can resume
with ``bake(256, "final", ("reception", "staircase", "hallway"))``.

This is Diffuse Indirect only: direct sun remains realtime, and colour is left
out so runtime PBR albedo is multiplied exactly once. The bake targets the
separate ``Lightmap`` UV channel allocated in Unit A step 5.
"""

from __future__ import annotations

import os
import time

import bpy
import numpy as np

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
OUT_BLEND = f"{ROOT}/assets/blender/unit-a.blend"
BAKE_OUT = f"{ROOT}/assets/bake"
SHOT_OUT = f"{ROOT}/shots"
LIGHTMAP_UV = "Lightmap"

ATLASES = (
    ("room1a", 2048, "unit_a_room1a"),
    ("parlour", 2048, "unit_a_parlour"),
    ("reception", 1024, "unit_a_reception"),
    ("staircase", 1024, "unit_a_staircase"),
    ("hallway", 512, "unit_a_first_floor_hall"),
)


def _unwrap_api():
    namespace = {}
    source = open(f"{ROOT}/tools/blender/unwrap_unit_a.py", encoding="utf-8").read()
    exec(source.rsplit("allocate()", 1)[0], namespace)
    return namespace


def _override(scene=None):
    windows = bpy.context.window_manager.windows
    if not windows:
        raise RuntimeError("Unit A bake needs an open Blender window")
    window = windows[0]
    area = next((item for item in window.screen.areas if item.type == "VIEW_3D"), None)
    if area is None:
        raise RuntimeError("Unit A bake needs an open 3D viewport")
    region = next(item for item in area.regions if item.type == "WINDOW")
    return {
        "window": window,
        "screen": window.screen,
        "area": area,
        "region": region,
        "scene": scene or bpy.context.scene,
        "view_layer": (scene or bpy.context.scene).view_layers[0],
    }


def _members(name: str):
    return _unwrap_api()["_members"](name)


def _select(objects) -> None:
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def _validate_targets(name: str, objects) -> None:
    seen = set()
    for obj in objects:
        pointer = obj.data.as_pointer()
        if pointer in seen:
            raise RuntimeError(f"{name} has shared bake mesh data at {obj.name}")
        seen.add(pointer)
        layer = obj.data.uv_layers.get(LIGHTMAP_UV)
        if layer is None or len(obj.data.uv_layers) < 2:
            raise RuntimeError(f"{obj.name} has no separate {LIGHTMAP_UV} UV layer")
        obj.data.uv_layers.active = layer


def _configure(samples: int) -> None:
    scene = bpy.context.scene
    preferences = bpy.context.preferences.addons["cycles"].preferences
    preferences.refresh_devices()
    if preferences.compute_device_type != "METAL":
        raise RuntimeError(
            f"Cycles compute device is {preferences.compute_device_type}, not METAL"
        )
    if not any(device.use and device.type == "METAL" for device in preferences.devices):
        raise RuntimeError("no enabled Metal GPU in Cycles preferences")

    scene.render.engine = "CYCLES"
    scene.cycles.device = "GPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.render.use_persistent_data = True

    settings = scene.render.bake
    settings.use_selected_to_active = False
    settings.use_pass_direct = False
    settings.use_pass_indirect = True
    settings.use_pass_color = False
    settings.margin_type = "ADJACENT_FACES"
    settings.margin = 8
    settings.use_clear = True


def _image(name: str, resolution: int):
    image_name = f"unit_a_bake_{name}"
    image = bpy.data.images.get(image_name)
    if image is not None and tuple(image.size) != (resolution, resolution):
        bpy.data.images.remove(image)
        image = None
    if image is None:
        image = bpy.data.images.new(
            image_name,
            resolution,
            resolution,
            float_buffer=True,
            is_data=True,
        )
    image.colorspace_settings.name = "Non-Color"
    return image


def _set_targets(name: str, objects, image):
    materials = {}
    assignments = []
    for obj in objects:
        for slot in obj.material_slots:
            source = slot.material
            if source is None:
                raise RuntimeError(f"{obj.name} has an empty material slot")
            pointer = source.as_pointer()
            material = materials.get(pointer)
            if material is None:
                # Unit A's PBR materials are linked from materials.blend. Image
                # assignment on a node in linked data silently stays None, so
                # bake through a local copy and restore the source afterwards.
                material = source.copy()
                material.name = f"unit_a_bake_material_{name}_{source.name}"
                materials[pointer] = material
            assignments.append((slot, source))
            slot.material = material
            if not material.use_nodes or material.node_tree is None:
                raise RuntimeError(f"{material.name} has no node tree")
            nodes = material.node_tree.nodes
            target = nodes.get("UNIT_A_BAKE_TARGET")
            if target is None:
                target = nodes.new("ShaderNodeTexImage")
                target.name = "UNIT_A_BAKE_TARGET"
                target.label = "UNIT_A_BAKE_TARGET"
                target.location = (-900, 600)
            target.image = image
            for node in nodes:
                node.select = False
            target.select = True
            nodes.active = target
    return len(materials), assignments, list(materials.values())


def _restore_materials(assignments, materials) -> None:
    for slot, source in assignments:
        slot.material = source
    for material in materials:
        bpy.data.materials.remove(material)


def _denoise(image, name: str, resolution: int) -> None:
    scene = bpy.data.scenes.new(f"unit_a_denoise_{name}")
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    tree = bpy.data.node_groups.new(f"unit_a_denoise_{name}", "CompositorNodeTree")
    scene.compositing_node_group = tree
    scene.use_nodes = True

    source = tree.nodes.new("CompositorNodeImage")
    source.image = image
    denoise = tree.nodes.new("CompositorNodeDenoise")
    viewer = tree.nodes.new("CompositorNodeViewer")
    tree.links.new(source.outputs["Image"], denoise.inputs["Image"])
    tree.links.new(denoise.outputs["Image"], viewer.inputs["Image"])

    with bpy.context.temp_override(scene=scene, view_layer=scene.view_layers[0]):
        bpy.ops.render.render("EXEC_DEFAULT", write_still=False)

    viewer_image = bpy.data.images.get("Viewer Node")
    if viewer_image is None or tuple(viewer_image.size) != (resolution, resolution):
        raise RuntimeError(f"denoiser returned no {resolution}px viewer image for {name}")
    values = np.empty(resolution * resolution * 4, dtype=np.float32)
    viewer_image.pixels.foreach_get(values)
    image.pixels.foreach_set(values)
    image.update()

    bpy.data.scenes.remove(scene)
    bpy.data.node_groups.remove(tree)


def _save(image, name: str, samples: int) -> tuple[str, dict[str, float]]:
    path = f"{BAKE_OUT}/unit-a_{name}.exr"
    image.filepath_raw = path
    image.file_format = "OPEN_EXR"
    image.save()

    count = len(image.pixels)
    values = np.empty(count, dtype=np.float32)
    image.pixels.foreach_get(values)
    rgb = values.reshape(-1, 4)[:, :3]
    if not np.isfinite(rgb).all():
        raise RuntimeError(f"{name} {samples}-sample bake contains non-finite pixels")
    stats = {
        "mean": float(rgb.mean()),
        "maximum": float(rgb.max()),
        "lit": float(np.count_nonzero(rgb.max(axis=1) > 1e-5) / len(rgb)),
    }
    if stats["maximum"] <= 1e-5 or stats["lit"] <= 0.001:
        raise RuntimeError(f"{name} {samples}-sample bake is effectively black: {stats}")
    return path, stats


def _preview_material(name: str, image):
    material = bpy.data.materials.new(f"unit_a_bake_preview_{name}")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = LIGHTMAP_UV
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"
    emission = nodes.new("ShaderNodeEmission")
    output = nodes.new("ShaderNodeOutputMaterial")
    material.node_tree.links.new(uv.outputs["UV"], texture.inputs["Vector"])
    material.node_tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
    material.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return material


def previews(tag: str, only=None) -> None:
    scene = bpy.context.scene
    requested = set(only or (name for name, _resolution, _camera in ATLASES))
    assignments = []
    materials = []
    for name, _resolution, _camera_name in ATLASES:
        if name not in requested:
            continue
        image = bpy.data.images.get(f"unit_a_bake_{name}")
        if image is None:
            raise RuntimeError(f"no baked image loaded for {name}")
        material = _preview_material(name, image)
        materials.append(material)
        for obj in _members(name):
            originals = [slot.material for slot in obj.material_slots]
            assignments.append((obj, originals))
            for slot in obj.material_slots:
                slot.material = material

    saved = {
        "world": scene.world,
        "camera": scene.camera,
        "samples": scene.cycles.samples,
        "exposure": scene.view_settings.exposure,
        "x": scene.render.resolution_x,
        "y": scene.render.resolution_y,
        "percent": scene.render.resolution_percentage,
    }
    lights = [(obj, obj.hide_render) for obj in bpy.data.objects if obj.type == "LIGHT"]
    scene.world = None
    for light, _hidden in lights:
        light.hide_render = True
    scene.cycles.samples = 16
    scene.view_settings.exposure = saved["exposure"] + 3.0
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100

    try:
        for name, _resolution, camera_name in ATLASES:
            if name not in requested:
                continue
            camera = bpy.data.objects.get(camera_name)
            if camera is None:
                raise RuntimeError(f"missing preview camera {camera_name}")
            scene.camera = camera
            path = f"{SHOT_OUT}/unit-a-bake-{tag}-{name}.jpg"
            scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            print(f"[unit-a-bake] preview {name} -> {path}")
    finally:
        scene.world = saved["world"]
        scene.camera = saved["camera"]
        scene.cycles.samples = saved["samples"]
        scene.view_settings.exposure = saved["exposure"]
        scene.render.resolution_x = saved["x"]
        scene.render.resolution_y = saved["y"]
        scene.render.resolution_percentage = saved["percent"]
        for light, hidden in lights:
            light.hide_render = hidden
        for obj, originals in assignments:
            for slot, material in zip(obj.material_slots, originals):
                slot.material = material
        for material in materials:
            bpy.data.materials.remove(material)


def bake(samples: int = 64, tag: str = "64", only=None, make_previews: bool = True) -> None:
    if bpy.data.filepath != OUT_BLEND:
        raise RuntimeError(f"Open {OUT_BLEND} before baking Unit A")
    if samples not in {64, 256}:
        raise RuntimeError("Unit A bake samples must be 64 or 256")
    requested = set(only or (name for name, _resolution, _camera in ATLASES))
    known = {name for name, _resolution, _camera in ATLASES}
    if not requested <= known:
        raise RuntimeError(f"unknown Unit A bake groups: {sorted(requested - known)}")

    _configure(samples)
    os.makedirs(BAKE_OUT, exist_ok=True)
    os.makedirs(SHOT_OUT, exist_ok=True)
    for name, resolution, _camera_name in ATLASES:
        if name not in requested:
            continue
        objects = _members(name)
        if not objects:
            raise RuntimeError(f"Unit A bake group {name} matched no meshes")
        _validate_targets(name, objects)
        image = _image(name, resolution)
        material_count, assignments, temporary_materials = _set_targets(
            name, objects, image
        )
        _select(objects)

        started = time.time()
        try:
            with bpy.context.temp_override(**_override()):
                result = bpy.ops.object.bake("EXEC_DEFAULT", type="DIFFUSE")
        finally:
            _restore_materials(assignments, temporary_materials)
        if "FINISHED" not in result:
            raise RuntimeError(f"Unit A bake {name} returned {result}")
        _denoise(image, name, resolution)
        path, stats = _save(image, name, samples)
        elapsed = time.time() - started
        print(
            f"[unit-a-bake] {name}: {len(objects)} meshes, {material_count} materials, "
            f"{resolution}px, {samples} samples, {elapsed:.1f}s, "
            f"mean {stats['mean']:.5f}, max {stats['maximum']:.3f}, "
            f"lit {stats['lit'] * 100:.1f}% -> {path}"
        )

    if make_previews:
        previews(tag, requested)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print(f"[unit-a-bake] saved {OUT_BLEND}")


bake(64, "64")
