"""
Build Unit A, the contiguous lodge interior, one space at a time.

Run inside Blender through BlenderMCP:

    exec(open('tools/blender/build_unit_a.py').read())

This first pass builds reception only. Later passes add the parlour, staircase,
first-floor hall and the existing room 1A to this same scene before one shared
indirect-light bake. It writes `assets/blender/unit-a.blend` and a reception
check render to `shots/unit-a-reception.jpg`.

Axes follow the room 1A pipeline:

    three (x, y, z) -> blender (x, -z, y)

The numbers below are the reception extents from `src/world/lodge.ts`; this is
not a fresh layout. Furniture is deliberately absent until Unit A step 4.
"""

from __future__ import annotations

import math
import os

import bpy
import mathutils

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
MATERIALS = f"{ROOT}/assets/blender/materials.blend"
OUT_BLEND = f"{ROOT}/assets/blender/unit-a.blend"
OUT_SHOT = f"{ROOT}/shots/unit-a-reception.jpg"
HDRI = f"{ROOT}/public/env/balcony_2k.hdr"

MCP_SETTINGS = (
    "blendermcp_use_polyhaven",
    "blendermcp_use_sketchfab",
    "blendermcp_sketchfab_api_key",
    "blendermcp_use_hyper3d",
    "blendermcp_hyper3d_mode",
    "blendermcp_hyper3d_api_key",
    "blendermcp_use_hunyuan3d",
    "blendermcp_hunyuan3d_mode",
    "blendermcp_hunyuan3d_secret_id",
    "blendermcp_hunyuan3d_secret_key",
    "blendermcp_hunyuan3d_api_url",
    "blendermcp_hunyuan3d_octree_resolution",
    "blendermcp_hunyuan3d_num_inference_steps",
    "blendermcp_hunyuan3d_guidance_scale",
    "blendermcp_hunyuan3d_texture",
    "blendermcp_port",
    "blendermcp_server_running",
)

# Reception in runtime world space, transcribed from lodge.ts.
HALL_FACE = 1.75
RIGHT = 6.40
FRONT = -0.10
BACK = 5.05
CEILING = 3.20
WALL_THICK = 0.12

ENTRY_Z0 = 1.90
ENTRY_Z1 = 3.05
ENTRY_HEAD = 2.15

WINDOW_X0 = 2.55
WINDOW_X1 = 3.65
WINDOW_SILL = 0.95
WINDOW_HEAD = 2.75


def reset_scene() -> None:
    kept = {}
    old = bpy.context.scene
    for key in MCP_SETTINGS:
        if hasattr(old, key):
            kept[key] = getattr(old, key)

    bpy.ops.wm.read_homefile(use_empty=True)

    scene = bpy.context.scene
    for key, value in kept.items():
        try:
            setattr(scene, key, value)
        except (AttributeError, TypeError):
            pass
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def link_materials():
    if not os.path.exists(MATERIALS):
        raise FileNotFoundError(f"Run build_materials.py first: {MATERIALS}")
    with bpy.data.libraries.load(MATERIALS, link=True) as (source, target):
        target.materials = list(source.materials)
    materials = {material.name: material for material in bpy.data.materials}
    required = {
        "boards_worn",
        "plaster_cornice",
        "plaster_nicotine",
        "timber_dark",
    }
    missing = required.difference(materials)
    if missing:
        raise RuntimeError(f"Unit A material library is missing: {sorted(missing)}")
    return materials


def glass_material():
    material = bpy.data.materials.new("unit_a_glass")
    material.use_nodes = True
    bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (0.82, 0.88, 0.90, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.16
    bsdf.inputs["IOR"].default_value = 1.45
    bsdf.inputs["Alpha"].default_value = 0.16
    material.surface_render_method = "DITHERED"
    return material


def build_sash(timber, glass) -> list:
    """A fixed double-hung sash in the reception street opening."""
    parts = []
    y0 = -FRONT - WALL_THICK * 0.72
    y1 = -FRONT + WALL_THICK * 0.18
    width = WINDOW_X1 - WINDOW_X0
    height = WINDOW_HEAD - WINDOW_SILL
    stile = 0.065
    rail = 0.065
    mid = WINDOW_SILL + height * 0.52

    for tag, x0, x1, z0, z1 in (
        ("stile_l", WINDOW_X0, WINDOW_X0 + stile, WINDOW_SILL, WINDOW_HEAD),
        ("stile_r", WINDOW_X1 - stile, WINDOW_X1, WINDOW_SILL, WINDOW_HEAD),
        ("rail_b", WINDOW_X0, WINDOW_X1, WINDOW_SILL, WINDOW_SILL + rail),
        ("rail_m", WINDOW_X0, WINDOW_X1, mid - rail / 2, mid + rail / 2),
        ("rail_t", WINDOW_X0, WINDOW_X1, WINDOW_HEAD - rail, WINDOW_HEAD),
    ):
        ob = cube(f"reception_window_{tag}", (x0, y0, z0), (x1, y1, z1))
        assign(ob, timber)
        parts.append(ob)

    pane_y0 = y0 + 0.035
    pane_y1 = pane_y0 + 0.008
    inset = stile + 0.018
    for tag, z0, z1 in (
        ("pane_lower", WINDOW_SILL + rail, mid - rail / 2),
        ("pane_upper", mid + rail / 2, WINDOW_HEAD - rail),
    ):
        ob = cube(
            f"reception_window_{tag}",
            (WINDOW_X0 + inset, pane_y0, z0),
            (WINDOW_X1 - inset, pane_y1, z1),
        )
        assign(ob, glass)
        parts.append(ob)

    sill = cube(
        "reception_window_sill",
        (WINDOW_X0 - 0.10, y0 - 0.08, WINDOW_SILL - 0.08),
        (WINDOW_X1 + 0.10, y1 + 0.06, WINDOW_SILL),
    )
    assign(sill, timber)
    parts.append(sill)
    return parts


def build_reception(materials) -> None:
    plaster = materials["plaster_nicotine"]
    cornice = materials["plaster_cornice"]
    timber = materials["timber_dark"]
    boards = materials["boards_worn"]
    glass = glass_material()

    # Blender Y is negative runtime Z.
    y_front = -FRONT
    y_back = -BACK

    floor = cube("reception_floor", (HALL_FACE, y_back, -0.08), (RIGHT, y_front, 0.0))
    assign(floor, boards)
    ceiling = cube(
        "reception_ceiling",
        (HALL_FACE, y_back, CEILING),
        (RIGHT, y_front, CEILING + 0.08),
    )
    assign(ceiling, cornice)

    # Street wall, four clean boxes around the real opening.
    front_outer = y_front + WALL_THICK
    for tag, lo, hi in (
        ("left", (HALL_FACE, y_front, 0.0), (WINDOW_X0, front_outer, CEILING)),
        ("right", (WINDOW_X1, y_front, 0.0), (RIGHT, front_outer, CEILING)),
        ("under", (WINDOW_X0, y_front, 0.0), (WINDOW_X1, front_outer, WINDOW_SILL)),
        ("over", (WINDOW_X0, y_front, WINDOW_HEAD), (WINDOW_X1, front_outer, CEILING)),
    ):
        ob = cube(f"reception_wall_front_{tag}", lo, hi)
        assign(ob, plaster)

    # Side and rear exterior walls.
    side = cube(
        "reception_wall_side",
        (RIGHT, y_back - WALL_THICK, 0.0),
        (RIGHT + WALL_THICK, front_outer, CEILING),
    )
    assign(side, plaster)
    rear = cube(
        "reception_wall_rear",
        (HALL_FACE, y_back - WALL_THICK, 0.0),
        (RIGHT, y_back, CEILING),
    )
    assign(rear, plaster)

    # Hall wall split around the open reception doorway.
    hall_outer = HALL_FACE - WALL_THICK
    entry_y0 = -ENTRY_Z1
    entry_y1 = -ENTRY_Z0
    for tag, lo, hi in (
        ("front", (hall_outer, entry_y1, 0.0), (HALL_FACE, y_front, CEILING)),
        ("rear", (hall_outer, y_back, 0.0), (HALL_FACE, entry_y0, CEILING)),
        ("over", (hall_outer, entry_y0, ENTRY_HEAD), (HALL_FACE, entry_y1, CEILING)),
    ):
        ob = cube(f"reception_wall_hall_{tag}", lo, hi)
        assign(ob, plaster)

    # The opening has architrave on both faces and no leaf.
    architrave(
        "reception_entry_room",
        timber,
        "y",
        entry_y0,
        entry_y1,
        ENTRY_HEAD,
        HALL_FACE,
        1,
    )
    architrave(
        "reception_entry_hall",
        timber,
        "y",
        entry_y0,
        entry_y1,
        ENTRY_HEAD,
        hall_outer,
        -1,
    )

    build_sash(timber, glass)

    # Interior skirting and picture rails. The hall run stops at the opening.
    skirting("reception_skirt_front", timber, "x", HALL_FACE, RIGHT, y_front, -1)
    skirting("reception_skirt_side", timber, "y", y_back, y_front, RIGHT, -1)
    skirting("reception_skirt_rear", timber, "x", HALL_FACE, RIGHT, y_back, 1)
    skirting("reception_skirt_hall_front", timber, "y", entry_y1, y_front, HALL_FACE, 1)
    skirting("reception_skirt_hall_rear", timber, "y", y_back, entry_y0, HALL_FACE, 1)

    rail_height = 2.35
    picture_rail("reception_rail_front", timber, "x", HALL_FACE, RIGHT, y_front, -1, rail_height)
    picture_rail("reception_rail_side", timber, "y", y_back, y_front, RIGHT, -1, rail_height)
    picture_rail("reception_rail_rear", timber, "x", HALL_FACE, RIGHT, y_back, 1, rail_height)
    picture_rail("reception_rail_hall_front", timber, "y", entry_y1, y_front, HALL_FACE, 1, rail_height)
    picture_rail("reception_rail_hall_rear", timber, "y", y_back, entry_y0, HALL_FACE, 1, rail_height)

    # Cornice is painted plaster and follows the same perimeter.
    depth = 0.11
    height = 0.12
    for tag, lo, hi in (
        ("front", (HALL_FACE, y_front - depth, CEILING - height), (RIGHT, y_front, CEILING)),
        ("side", (RIGHT - depth, y_back, CEILING - height), (RIGHT, y_front, CEILING)),
        ("rear", (HALL_FACE, y_back, CEILING - height), (RIGHT, y_back + depth, CEILING)),
        ("hall", (HALL_FACE, y_back, CEILING - height), (HALL_FACE + depth, y_front, CEILING)),
    ):
        ob = cube(f"reception_cornice_{tag}", lo, hi)
        assign(ob, cornice)


def build_lighting() -> None:
    # Runtime world direction converted through (x, -z, y).
    direction = mathutils.Vector((-0.847, -0.400, -0.365)).normalized()
    data = bpy.data.lights.new("unit_a_sun", type="SUN")
    data.energy = 7.0
    data.angle = math.radians(0.9)
    data.color = (1.0, 0.906, 0.78)
    sun = bpy.data.objects.new("unit_a_sun", data)
    bpy.context.scene.collection.objects.link(sun)
    sun.location = (10.0, 8.0, 8.0)
    sun.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    world = bpy.data.worlds.new("unit_a_world")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    background = nodes["Background"]
    environment = nodes.new("ShaderNodeTexEnvironment")
    environment.image = bpy.data.images.load(HDRI, check_existing=True)
    mapping = nodes.new("ShaderNodeMapping")
    coordinates = nodes.new("ShaderNodeTexCoord")
    links.new(coordinates.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], environment.inputs["Vector"])
    links.new(environment.outputs["Color"], background.inputs["Color"])
    background.inputs["Strength"].default_value = 1.0


def build_camera() -> None:
    data = bpy.data.cameras.new("unit_a_reception")
    data.sensor_fit = "VERTICAL"
    data.angle_y = math.radians(66)
    data.clip_start = 0.05
    camera = bpy.data.objects.new("unit_a_reception", data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = (5.75, -4.55, 1.62)
    target = mathutils.Vector((2.75, -0.15, 1.25))
    camera.rotation_euler = (target - camera.location).normalized().to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera


def configure_render() -> None:
    scene = bpy.context.scene
    scene.name = "Unit A"
    scene.render.engine = "CYCLES"
    scene.cycles.device = "GPU"
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.render.use_persistent_data = True
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.color_mode = "RGB"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    # Match the room 1A Blender preview. This is not a bake input.
    scene.view_settings.exposure = 2.8
    scene.render.filepath = OUT_SHOT


def validate() -> None:
    names = {obj.name for obj in bpy.context.scene.objects}
    required = {
        "reception_floor",
        "reception_ceiling",
        "reception_wall_side",
        "reception_wall_rear",
        "reception_window_pane_lower",
        "reception_window_pane_upper",
        "reception_entry_room_jamb_l0",
        "reception_entry_room_jamb_r0",
    }
    missing = required.difference(names)
    if missing:
        raise RuntimeError(f"Reception validation missing objects: {sorted(missing)}")

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    unmaterialled = [obj.name for obj in meshes if len(obj.data.materials) == 0]
    if unmaterialled:
        raise RuntimeError(f"Reception has unmaterialled meshes: {unmaterialled}")
    missing_uv = [obj.name for obj in meshes if len(obj.data.uv_layers) == 0]
    if missing_uv:
        raise RuntimeError(f"Reception has meshes without albedo UVs: {missing_uv}")
    print(f"[unit-a] reception validated: {len(meshes)} meshes, 0 unmaterialled, 0 without UVs")


def build() -> None:
    reset_scene()
    materials = link_materials()
    exec(open(f"{ROOT}/tools/blender/kit_arch.py").read(), globals())
    build_reception(materials)
    build_lighting()
    build_camera()
    configure_render()
    validate()

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_SHOT), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    bpy.ops.render.render(write_still=True)
    print(f"[unit-a] saved {OUT_BLEND}")
    print(f"[unit-a] wrote {OUT_SHOT} {os.path.getsize(OUT_SHOT)} bytes")


build()
