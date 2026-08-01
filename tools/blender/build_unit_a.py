"""
Build Unit A, the contiguous lodge interior, one space at a time.

Run inside Blender through BlenderMCP:

    exec(open('tools/blender/build_unit_a.py').read())

This pass builds the reception, parlour, central staircase and first-floor hall
shells. A later pass brings the existing room 1A into this same scene before
one shared indirect-light bake. It writes `assets/blender/unit-a.blend` and one
check render per assembled space under `shots/unit-a-*.jpg`.

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
ROOM1A_GLB = f"{ROOT}/public/models/room1a.glb"
OUT_BLEND = f"{ROOT}/assets/blender/unit-a.blend"
OUT_RECEPTION_SHOT = f"{ROOT}/shots/unit-a-reception.jpg"
OUT_PARLOUR_SHOT = f"{ROOT}/shots/unit-a-parlour.jpg"
OUT_STAIRCASE_SHOT = f"{ROOT}/shots/unit-a-staircase.jpg"
OUT_FIRST_FLOOR_HALL_SHOT = f"{ROOT}/shots/unit-a-first-floor-hall.jpg"
OUT_ROOM1A_SHOT = f"{ROOT}/shots/unit-a-room1a.jpg"
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
# Parlour uses the opposite side of the same central hall.
LEFT = -6.50
PARLOUR_HALL_FACE = -1.75
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
PARLOUR_WINDOWS = ((-5.90, -4.80), (-3.60, -2.50))

# Central staircase, transcribed from lodge.ts before the axis conversion.
BUILDING_BACK = 10.50
FIRST_FLOOR = 3.45
FIRST_CEILING = 6.50
STAIR_EDGE = -0.30
STAIR_X0 = -1.70
STAIR_TREADS = 17
STAIR_RISE = FIRST_FLOOR / 18
STAIR_GOING = 0.28
STAIR_Z0 = 5.20
STAIR_Z1 = STAIR_Z0 + STAIR_TREADS * STAIR_GOING
STAIR_RAIL_TREADS = STAIR_TREADS - 3
ROOM1A_HALL_FACE = 1.70


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
        "carpet_runner",
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


def brass_material():
    material = bpy.data.materials.new("unit_a_brass_verdigris")
    material.use_nodes = True
    bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (0.20, 0.17, 0.08, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.58
    bsdf.inputs["Roughness"].default_value = 0.50
    material["tile_metres"] = 1.0
    return material


def build_sash(name, x0, x1, sill_height, head_height, y_face, timber, glass) -> list:
    """Build a fixed double-hung sash in a street-wall opening."""
    parts = []
    y0 = y_face - WALL_THICK * 0.72
    y1 = y_face + WALL_THICK * 0.18
    height = head_height - sill_height
    stile = 0.065
    rail = 0.065
    mid = sill_height + height * 0.52

    for tag, part_x0, part_x1, z0, z1 in (
        ("stile_l", x0, x0 + stile, sill_height, head_height),
        ("stile_r", x1 - stile, x1, sill_height, head_height),
        ("rail_b", x0, x1, sill_height, sill_height + rail),
        ("rail_m", x0, x1, mid - rail / 2, mid + rail / 2),
        ("rail_t", x0, x1, head_height - rail, head_height),
    ):
        ob = cube(f"{name}_{tag}", (part_x0, y0, z0), (part_x1, y1, z1))
        assign(ob, timber)
        parts.append(ob)

    pane_y0 = y0 + 0.035
    pane_y1 = pane_y0 + 0.008
    inset = stile + 0.018
    for tag, z0, z1 in (
        ("pane_lower", sill_height + rail, mid - rail / 2),
        ("pane_upper", mid + rail / 2, head_height - rail),
    ):
        ob = cube(
            f"{name}_{tag}",
            (x0 + inset, pane_y0, z0),
            (x1 - inset, pane_y1, z1),
        )
        assign(ob, glass)
        parts.append(ob)

    sill = cube(
        f"{name}_sill",
        (x0 - 0.10, y0 - 0.08, sill_height - 0.08),
        (x1 + 0.10, y1 + 0.06, sill_height),
    )
    assign(sill, timber)
    parts.append(sill)
    return parts


def build_reception(materials, glass) -> None:
    plaster = materials["plaster_nicotine"]
    cornice = materials["plaster_cornice"]
    timber = materials["timber_dark"]
    boards = materials["boards_worn"]

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

    build_sash(
        "reception_window",
        WINDOW_X0,
        WINDOW_X1,
        WINDOW_SILL,
        WINDOW_HEAD,
        y_front,
        timber,
        glass,
    )

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


def build_parlour(materials, glass) -> None:
    plaster = materials["plaster_nicotine"]
    cornice = materials["plaster_cornice"]
    timber = materials["timber_dark"]
    carpet = materials["carpet_runner"]

    y_front = -FRONT
    y_back = -BACK
    front_outer = y_front + WALL_THICK

    floor = cube("parlour_floor", (LEFT, y_back, -0.08), (PARLOUR_HALL_FACE, y_front, 0.0))
    assign(floor, carpet)
    ceiling = cube(
        "parlour_ceiling",
        (LEFT, y_back, CEILING),
        (PARLOUR_HALL_FACE, y_front, CEILING + 0.08),
    )
    assign(ceiling, cornice)

    # Street wall: full lower/upper bands and three piers around two windows.
    lower = cube(
        "parlour_wall_front_under",
        (LEFT, y_front, 0.0),
        (PARLOUR_HALL_FACE, front_outer, WINDOW_SILL),
    )
    assign(lower, plaster)
    upper = cube(
        "parlour_wall_front_over",
        (LEFT, y_front, WINDOW_HEAD),
        (PARLOUR_HALL_FACE, front_outer, CEILING),
    )
    assign(upper, plaster)
    for tag, x0, x1 in (
        ("left", LEFT, PARLOUR_WINDOWS[0][0]),
        ("centre", PARLOUR_WINDOWS[0][1], PARLOUR_WINDOWS[1][0]),
        ("right", PARLOUR_WINDOWS[1][1], PARLOUR_HALL_FACE),
    ):
        pier = cube(
            f"parlour_wall_front_{tag}",
            (x0, y_front, WINDOW_SILL),
            (x1, front_outer, WINDOW_HEAD),
        )
        assign(pier, plaster)

    side = cube(
        "parlour_wall_side",
        (LEFT - WALL_THICK, y_back - WALL_THICK, 0.0),
        (LEFT, front_outer, CEILING),
    )
    assign(side, plaster)
    rear = cube(
        "parlour_wall_rear",
        (LEFT, y_back - WALL_THICK, 0.0),
        (PARLOUR_HALL_FACE, y_back, CEILING),
    )
    assign(rear, plaster)

    hall_outer = PARLOUR_HALL_FACE + WALL_THICK
    entry_y0 = -ENTRY_Z1
    entry_y1 = -ENTRY_Z0
    for tag, lo, hi in (
        ("front", (PARLOUR_HALL_FACE, entry_y1, 0.0), (hall_outer, y_front, CEILING)),
        ("rear", (PARLOUR_HALL_FACE, y_back, 0.0), (hall_outer, entry_y0, CEILING)),
        ("over", (PARLOUR_HALL_FACE, entry_y0, ENTRY_HEAD), (hall_outer, entry_y1, CEILING)),
    ):
        wall = cube(f"parlour_wall_hall_{tag}", lo, hi)
        assign(wall, plaster)

    architrave(
        "parlour_entry_room", timber, "y", entry_y0, entry_y1, ENTRY_HEAD, PARLOUR_HALL_FACE, -1
    )
    architrave(
        "parlour_entry_hall", timber, "y", entry_y0, entry_y1, ENTRY_HEAD, hall_outer, 1
    )

    for index, (x0, x1) in enumerate(PARLOUR_WINDOWS, start=1):
        build_sash(
            f"parlour_window_{index}",
            x0,
            x1,
            WINDOW_SILL,
            WINDOW_HEAD,
            y_front,
            timber,
            glass,
        )

    skirting("parlour_skirt_front", timber, "x", LEFT, PARLOUR_HALL_FACE, y_front, -1)
    skirting("parlour_skirt_side", timber, "y", y_back, y_front, LEFT, 1)
    skirting("parlour_skirt_rear", timber, "x", LEFT, PARLOUR_HALL_FACE, y_back, 1)
    skirting("parlour_skirt_hall_front", timber, "y", entry_y1, y_front, PARLOUR_HALL_FACE, -1)
    skirting("parlour_skirt_hall_rear", timber, "y", y_back, entry_y0, PARLOUR_HALL_FACE, -1)

    rail_height = 2.35
    picture_rail("parlour_rail_front", timber, "x", LEFT, PARLOUR_HALL_FACE, y_front, -1, rail_height)
    picture_rail("parlour_rail_side", timber, "y", y_back, y_front, LEFT, 1, rail_height)
    picture_rail("parlour_rail_rear", timber, "x", LEFT, PARLOUR_HALL_FACE, y_back, 1, rail_height)
    picture_rail("parlour_rail_hall_front", timber, "y", entry_y1, y_front, PARLOUR_HALL_FACE, -1, rail_height)
    picture_rail("parlour_rail_hall_rear", timber, "y", y_back, entry_y0, PARLOUR_HALL_FACE, -1, rail_height)

    depth = 0.11
    height = 0.12
    for tag, lo, hi in (
        ("front", (LEFT, y_front - depth, CEILING - height), (PARLOUR_HALL_FACE, y_front, CEILING)),
        ("side", (LEFT, y_back, CEILING - height), (LEFT + depth, y_front, CEILING)),
        ("rear", (LEFT, y_back, CEILING - height), (PARLOUR_HALL_FACE, y_back + depth, CEILING)),
        ("hall", (PARLOUR_HALL_FACE - depth, y_back, CEILING - height), (PARLOUR_HALL_FACE, y_front, CEILING)),
    ):
        ob = cube(f"parlour_cornice_{tag}", lo, hi)
        assign(ob, cornice)


def raked_beam_y(name, material, x0, x1, y0, z0, y1, z1, height):
    """A clean prism following a slope in Blender Y/Z space."""
    verts = [
        (x0, y0, z0),
        (x0, y0, z0 + height),
        (x0, y1, z1),
        (x0, y1, z1 + height),
        (x1, y0, z0),
        (x1, y0, z0 + height),
        (x1, y1, z1),
        (x1, y1, z1 + height),
    ]
    faces = [
        (0, 1, 3, 2),
        (4, 6, 7, 5),
        (0, 4, 5, 1),
        (2, 3, 7, 6),
        (0, 2, 6, 4),
        (1, 5, 7, 3),
    ]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    assign(ob, material)
    return ob


def build_staircase(materials, brass) -> None:
    plaster = materials["plaster_nicotine"]
    cornice = materials["plaster_cornice"]
    timber = materials["timber_dark"]
    carpet = materials["carpet_runner"]

    hall_left = PARLOUR_HALL_FACE + WALL_THICK
    hall_right = HALL_FACE - WALL_THICK
    y_front = -FRONT
    y_room_back = -BACK
    y_back = -BUILDING_BACK

    # Ground hall and passage beside the flight. The flight itself blocks the
    # left half after the room backs; the floor remains continuous underneath.
    floor = cube(
        "staircase_ground_floor",
        (hall_left, y_back, -0.08),
        (hall_right, y_front, 0.0),
    )
    assign(floor, carpet)
    ceiling = cube(
        "staircase_front_hall_ceiling",
        (hall_left, y_room_back, CEILING),
        (hall_right, y_front, CEILING + 0.08),
    )
    assign(ceiling, cornice)
    # The double-height stair hall begins behind the room backs.
    for tag, lo, hi in (
        ("left", (PARLOUR_HALL_FACE, y_back - WALL_THICK, 0.0), (hall_left, y_room_back, FIRST_CEILING)),
        ("right", (hall_right, y_back - WALL_THICK, 0.0), (HALL_FACE, y_room_back, FIRST_FLOOR)),
        ("rear", (PARLOUR_HALL_FACE, y_back - WALL_THICK, 0.0), (HALL_FACE, y_back, FIRST_CEILING)),
    ):
        wall = cube(f"staircase_wall_{tag}", lo, hi)
        assign(wall, plaster)

    stair_flight(
        "staircase",
        timber,
        timber,
        "x",
        STAIR_X0,
        STAIR_EDGE,
        -STAIR_Z0,
        0.0,
        STAIR_TREADS,
        going=STAIR_GOING,
        rise=STAIR_RISE,
        direction=-1.0,
    )

    # Inset runner, worn on the treads, with the timber edges left visible.
    runner_x0 = STAIR_X0 + 0.16
    runner_x1 = STAIR_EDGE - 0.16
    for i in range(STAIR_TREADS):
        top = (i + 1) * STAIR_RISE
        y0 = -STAIR_Z0 - i * STAIR_GOING
        y1 = y0 - STAIR_GOING
        runner = cube(
            f"staircase_runner_{i:02d}",
            (runner_x0, min(y0, y1), top),
            (runner_x1, max(y0, y1), top + 0.012),
        )
        assign(runner, carpet)
        rod = cube(
            f"staircase_brass_rod_{i:02d}",
            (runner_x0 - 0.035, y0 - 0.018, top + 0.012),
            (runner_x1 + 0.035, y0 + 0.018, top + 0.038),
        )
        assign(rod, brass)

    # The eighteenth riser closes the flight against the first-floor landing.
    final_top = STAIR_TREADS * STAIR_RISE
    top_riser = cube(
        "staircase_riser_top",
        (STAIR_X0, -STAIR_Z1 - 0.022, final_top - 0.01),
        (STAIR_EDGE, -STAIR_Z1, FIRST_FLOOR - 0.04),
    )
    assign(top_riser, timber)
    # A continuous closed string and handrail. Axis-aligned boxes following a
    # rake read as a stack of blocks, so these two members are honest prisms.
    rail_end_y = -(STAIR_Z0 + STAIR_RAIL_TREADS * STAIR_GOING)
    raked_beam_y(
        "staircase_string",
        timber,
        STAIR_EDGE - 0.075,
        STAIR_EDGE + 0.025,
        -STAIR_Z0,
        0.10,
        rail_end_y,
        STAIR_RAIL_TREADS * STAIR_RISE - 0.12,
        0.20,
    )
    for i in range(STAIR_RAIL_TREADS):
        base = (i + 1) * STAIR_RISE
        y = -STAIR_Z0 - (i + 0.5) * STAIR_GOING
        baluster(f"staircase_balustrade_b{i:02d}", timber, STAIR_EDGE, y, base)
    raked_beam_y(
        "staircase_handrail",
        timber,
        STAIR_EDGE - 0.045,
        STAIR_EDGE + 0.045,
        -STAIR_Z0 - STAIR_GOING * 0.5,
        STAIR_RISE + BALUSTER_HEIGHT,
        rail_end_y + STAIR_GOING * 0.5,
        STAIR_RAIL_TREADS * STAIR_RISE + BALUSTER_HEIGHT,
        0.075,
    )
    newel("staircase_newel_foot", timber, STAIR_EDGE, -STAIR_Z0 - 0.08, 0.0, 1.16)
    newel(
        "staircase_newel_head",
        timber,
        STAIR_EDGE,
        rail_end_y,
        STAIR_RAIL_TREADS * STAIR_RISE,
        1.05,
    )

    # Hall-side trim continues through both room entries and into the stair hall.
    entry_y0 = -ENTRY_Z1
    entry_y1 = -ENTRY_Z0
    for side, face, outward in (
        ("left", hall_left, 1),
        ("right", hall_right, -1),
    ):
        skirting(f"staircase_hall_skirt_{side}_front", timber, "y", entry_y1, y_front, face, outward)
        skirting(f"staircase_hall_skirt_{side}_rear", timber, "y", y_room_back, entry_y0, face, outward)
        skirting(f"staircase_hall_skirt_{side}_stair", timber, "y", y_back, y_room_back, face, outward)
        picture_rail(
            f"staircase_hall_rail_{side}_front", timber, "y", entry_y1, y_front, face, outward, 2.35
        )
        picture_rail(
            f"staircase_hall_rail_{side}_rear", timber, "y", y_room_back, entry_y0, face, outward, 2.35
        )
        picture_rail(
            f"staircase_hall_rail_{side}_stair", timber, "y", y_back, y_room_back, face, outward, 2.35
        )

    depth = 0.11
    height = 0.12
    for tag, lo, hi in (
        ("left", (hall_left, y_back, FIRST_CEILING - height), (hall_left + depth, y_room_back, FIRST_CEILING)),
        ("right", (hall_right - depth, y_back, FIRST_CEILING - height), (hall_right, y_room_back, FIRST_CEILING)),
        ("rear", (hall_left, y_back, FIRST_CEILING - height), (hall_right, y_back + depth, FIRST_CEILING)),
    ):
        cornice_ob = cube(f"staircase_cornice_{tag}", lo, hi)
        assign(cornice_ob, cornice)


def build_first_floor_hall(materials, brass) -> None:
    plaster = materials["plaster_nicotine"]
    cornice = materials["plaster_cornice"]
    timber = materials["timber_dark"]
    carpet = materials["carpet_runner"]

    y_front = -FRONT
    y_back = -BUILDING_BACK
    y_stair_foot = -STAIR_Z0
    y_landing_front = -STAIR_Z1 + 0.06
    hall_floor_left = STAIR_EDGE - 0.16
    hall_wall_left = STAIR_EDGE - 0.16
    hall_wall_left_face = STAIR_EDGE - 0.02
    hall_right_face = HALL_FACE - 0.14

    # The long gallery beside the void, plus the wider rear landing where the
    # player turns right after the last riser.
    main_slab = cube(
        "first_floor_hall_main_slab",
        (hall_floor_left, y_back, FIRST_FLOOR - 0.16),
        (ROOM1A_HALL_FACE, y_front, FIRST_FLOOR),
    )
    assign(main_slab, plaster)
    landing_slab = cube(
        "first_floor_hall_landing_slab",
        (STAIR_X0 - 0.05, y_back, FIRST_FLOOR - 0.16),
        (hall_floor_left, y_landing_front, FIRST_FLOOR),
    )
    assign(landing_slab, plaster)
    main_carpet = cube(
        "first_floor_hall_main_carpet",
        (hall_floor_left, y_back, FIRST_FLOOR),
        (ROOM1A_HALL_FACE, y_front, FIRST_FLOOR + 0.008),
    )
    assign(main_carpet, carpet)
    landing_carpet = cube(
        "first_floor_hall_landing_carpet",
        (STAIR_X0 - 0.05, y_back, FIRST_FLOOR),
        (hall_floor_left, y_landing_front, FIRST_FLOOR + 0.008),
    )
    assign(landing_carpet, carpet)

    # Left wall toward the street and rear return wall at the landing.
    left_wall = cube(
        "first_floor_hall_wall_left",
        (hall_wall_left, y_stair_foot, FIRST_FLOOR),
        (hall_wall_left_face, y_front, FIRST_CEILING),
    )
    assign(left_wall, plaster)
    rear_left_wall = cube(
        "first_floor_hall_wall_rear_left",
        (STAIR_X0 - 0.05, y_back, FIRST_FLOOR),
        (STAIR_X0 + 0.09, y_landing_front, FIRST_CEILING),
    )
    assign(rear_left_wall, plaster)
    front_wall = cube(
        "first_floor_hall_wall_front",
        (hall_floor_left, y_front, FIRST_FLOOR),
        (ROOM1A_HALL_FACE, y_front + WALL_THICK, FIRST_CEILING),
    )
    assign(front_wall, plaster)

    # Right wall behind room 1A, split around the two shut neighbour doors.
    door_spans = ((-9.00, -8.10), (-6.90, -6.00))
    for tag, ya, yb in (
        ("rear", (y_back), door_spans[0][0]),
        ("middle", door_spans[0][1], door_spans[1][0]),
        ("front", door_spans[1][1], y_stair_foot),
    ):
        wall = cube(
            f"first_floor_hall_wall_right_{tag}",
            (hall_right_face, ya, FIRST_FLOOR),
            (HALL_FACE, yb, FIRST_CEILING),
        )
        assign(wall, plaster)
    for index, (ya, yb) in enumerate(door_spans, start=2):
        over = cube(
            f"first_floor_hall_wall_right_door_{index}_over",
            (hall_right_face, ya, FIRST_FLOOR + ENTRY_HEAD),
            (HALL_FACE, yb, FIRST_CEILING),
        )
        assign(over, plaster)
        door_unit(
            f"first_floor_hall_door_{index}",
            timber,
            "y",
            (ya + yb) / 2,
            hall_right_face,
            HALL_FACE,
            width=yb - ya,
            height=ENTRY_HEAD,
            base=FIRST_FLOOR,
        )
        plate = cube(
            f"first_floor_hall_door_{index}_number_plate",
            (hall_right_face - 0.018, (ya + yb) / 2 - 0.075, FIRST_FLOOR + 1.38),
            (hall_right_face - 0.006, (ya + yb) / 2 + 0.075, FIRST_FLOOR + 1.53),
        )
        assign(plate, brass)

    ceiling = cube(
        "first_floor_hall_ceiling",
        (STAIR_X0 - 0.05, y_back, FIRST_CEILING),
        (ROOM1A_HALL_FACE, y_front, FIRST_CEILING + 0.09),
    )
    assign(ceiling, cornice)

    # Level banister along the open stairwell. It stops before the rear landing,
    # leaving the turn at the stair head fully open and visibly walkable.
    rail_end_y = -(STAIR_Z0 + STAIR_RAIL_TREADS * STAIR_GOING)
    balustrade(
        "first_floor_hall_banister",
        timber,
        "y",
        y_stair_foot,
        rail_end_y,
        STAIR_EDGE,
        FIRST_FLOOR,
        spacing=STAIR_GOING,
    )
    newel(
        "first_floor_hall_newel_front", timber, STAIR_EDGE, y_stair_foot, FIRST_FLOOR, 1.02
    )
    newel(
        "first_floor_hall_newel_rear", timber, STAIR_EDGE, rail_end_y, FIRST_FLOOR, 1.02
    )

    # Upper-level skirting, picture rails and cornice use explicit heights;
    # the shared helpers are grounded at z=0 for room-level calls.
    trim_runs = (
        ("left", hall_wall_left_face, y_stair_foot, y_front, 1),
        ("right_rear", hall_right_face, y_back, door_spans[0][0], -1),
        ("right_middle", hall_right_face, door_spans[0][1], door_spans[1][0], -1),
        ("right_front", hall_right_face, door_spans[1][1], y_stair_foot, -1),
    )
    for tag, face, y0, y1, outward in trim_runs:
        skirt_depth = face + outward * 0.02
        skirt = cube(
            f"first_floor_hall_skirt_{tag}",
            (min(face, skirt_depth), y0, FIRST_FLOOR),
            (max(face, skirt_depth), y1, FIRST_FLOOR + 0.18),
        )
        assign(skirt, timber)
        rail_depth = face + outward * 0.016
        rail = cube(
            f"first_floor_hall_picture_rail_{tag}",
            (min(face, rail_depth), y0, FIRST_FLOOR + 2.35),
            (max(face, rail_depth), y1, FIRST_FLOOR + 2.398),
        )
        assign(rail, timber)

    depth = 0.11
    height = 0.12
    for tag, lo, hi in (
        ("left", (hall_wall_left_face, y_stair_foot, FIRST_CEILING - height), (hall_wall_left_face + depth, y_front, FIRST_CEILING)),
        ("right", (hall_right_face - depth, y_back, FIRST_CEILING - height), (hall_right_face, y_stair_foot, FIRST_CEILING)),
        ("rear", (STAIR_X0 + 0.09, y_back, FIRST_CEILING - height), (hall_right_face, y_back + depth, FIRST_CEILING)),
    ):
        cornice_ob = cube(f"first_floor_hall_cornice_{tag}", lo, hi)
        assign(cornice_ob, cornice)

    front_skirt = cube(
        "first_floor_hall_skirt_front_wall",
        (hall_floor_left, y_front - 0.02, FIRST_FLOOR),
        (ROOM1A_HALL_FACE, y_front, FIRST_FLOOR + 0.18),
    )
    assign(front_skirt, timber)
    front_picture_rail = cube(
        "first_floor_hall_picture_rail_front_wall",
        (hall_floor_left, y_front - 0.016, FIRST_FLOOR + 2.35),
        (ROOM1A_HALL_FACE, y_front, FIRST_FLOOR + 2.398),
    )
    assign(front_picture_rail, timber)


def import_room1a() -> None:
    """Import the completed shipped room once and place it in lodge space."""
    if not os.path.exists(ROOM1A_GLB):
        raise FileNotFoundError(f"Room 1A model is missing: {ROOM1A_GLB}")

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=ROOM1A_GLB)
    imported = [obj for obj in bpy.data.objects if obj not in before]
    if not imported:
        raise RuntimeError("Room 1A glTF import created no objects")

    holder = bpy.data.objects.new("room1a_transform", None)
    bpy.context.scene.collection.objects.link(holder)
    # Authored Blender -> Unit A Blender:
    # (x, y, z) -> (4 - y, x - 2.6, z + 3.45), the runtime's +90 degree turn.
    holder.location = (4.0, -2.6, FIRST_FLOOR)
    holder.rotation_euler = (0.0, 0.0, math.pi / 2)

    imported_set = set(imported)
    for obj in imported:
        obj["unit_a_space"] = "room1a"
        if obj.parent not in imported_set:
            obj.parent = holder

    meshes = [obj for obj in imported if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("Room 1A glTF import contains no meshes")
    print(f"[unit-a] imported room 1A: {len(imported)} objects, {len(meshes)} meshes")


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


def build_camera(name, location, target):
    data = bpy.data.cameras.new(name)
    data.sensor_fit = "VERTICAL"
    data.angle_y = math.radians(66)
    data.clip_start = 0.05
    camera = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = location
    target_vector = mathutils.Vector(target)
    camera.rotation_euler = (target_vector - camera.location).normalized().to_track_quat("-Z", "Y").to_euler()
    return camera


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
        "parlour_floor",
        "parlour_ceiling",
        "parlour_wall_side",
        "parlour_wall_rear",
        "parlour_window_1_pane_lower",
        "parlour_window_2_pane_upper",
        "parlour_entry_room_jamb_l0",
        "parlour_entry_room_jamb_r0",
        "staircase_ground_floor",
        "staircase_front_hall_ceiling",
        "staircase_wall_left",
        "staircase_wall_right",
        "staircase_wall_rear",
        "staircase_tread0",
        "staircase_tread16",
        "staircase_riser_top",
        "staircase_runner_00",
        "staircase_runner_16",
        "staircase_newel_foot_post",
        "staircase_newel_head_post",
        "first_floor_hall_main_slab",
        "first_floor_hall_landing_slab",
        "first_floor_hall_main_carpet",
        "first_floor_hall_wall_left",
        "first_floor_hall_wall_front",
        "first_floor_hall_wall_right_rear",
        "first_floor_hall_door_2_stile_hinge",
        "first_floor_hall_door_3_panel_t",
        "first_floor_hall_banister_b0_foot",
        "first_floor_hall_newel_front_post",
        "first_floor_hall_ceiling",
        "floor",
        "ceiling",
        "wall_hall_pier0",
        "wall_verandah_end",
        "wall_street_end",
        "door",
        "verandahDoor",
        "sash",
        "frontWindow",
        "bed",
        "dresser",
        "wardrobe",
        "sideTable",
        "rug",
        "room1a_transform",
    }
    missing = required.difference(names)
    if missing:
        raise RuntimeError(f"Unit A validation missing objects: {sorted(missing)}")

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    unmaterialled = [obj.name for obj in meshes if len(obj.data.materials) == 0]
    if unmaterialled:
        raise RuntimeError(f"Unit A has unmaterialled meshes: {unmaterialled}")
    missing_uv = [obj.name for obj in meshes if len(obj.data.uv_layers) == 0]
    if missing_uv:
        raise RuntimeError(f"Unit A has meshes without albedo UVs: {missing_uv}")
    reception_count = sum(obj.name.startswith("reception_") for obj in meshes)
    parlour_count = sum(obj.name.startswith("parlour_") for obj in meshes)
    staircase_count = sum(obj.name.startswith("staircase_") for obj in meshes)
    hall_count = sum(obj.name.startswith("first_floor_hall_") for obj in meshes)
    room1a_count = sum(obj.get("unit_a_space") == "room1a" for obj in meshes)
    print(
        f"[unit-a] validated: reception {reception_count} meshes, parlour {parlour_count} meshes, "
        f"staircase {staircase_count} meshes, "
        f"first-floor hall {hall_count} meshes, "
        f"room 1A {room1a_count} meshes, "
        "0 unmaterialled, 0 without UVs"
    )


def build() -> None:
    reset_scene()
    materials = link_materials()
    exec(open(f"{ROOT}/tools/blender/kit_arch.py").read(), globals())
    glass = glass_material()
    brass = brass_material()
    build_reception(materials, glass)
    build_parlour(materials, glass)
    build_staircase(materials, brass)
    build_first_floor_hall(materials, brass)
    import_room1a()
    build_lighting()
    reception_camera = build_camera(
        "unit_a_reception", (5.75, -4.55, 1.62), (2.75, -0.15, 1.25)
    )
    parlour_camera = build_camera(
        "unit_a_parlour", (-2.15, -4.55, 1.62), (-4.60, -0.10, 1.30)
    )
    staircase_camera = build_camera(
        "unit_a_staircase", (1.30, -4.15, 1.58), (-0.72, -7.55, 1.85)
    )
    first_floor_hall_camera = build_camera(
        "unit_a_first_floor_hall", (0.92, -9.62, 4.68), (0.72, -2.82, 4.48)
    )
    room1a_camera = build_camera(
        "unit_a_room1a", (2.18, -2.60, 4.98), (5.72, -2.42, 4.72)
    )
    configure_render()
    validate()

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_RECEPTION_SHOT), exist_ok=True)
    bpy.context.scene.camera = reception_camera
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    for camera, path, preview_exposure in (
        (reception_camera, OUT_RECEPTION_SHOT, 2.8),
        (parlour_camera, OUT_PARLOUR_SHOT, 2.8),
        (staircase_camera, OUT_STAIRCASE_SHOT, 3.8),
        (first_floor_hall_camera, OUT_FIRST_FLOOR_HALL_SHOT, 4.2),
        (room1a_camera, OUT_ROOM1A_SHOT, 2.8),
    ):
        bpy.context.scene.camera = camera
        bpy.context.scene.render.filepath = path
        # Preview-only compensation until the shared indirect bake exists.
        bpy.context.scene.view_settings.exposure = preview_exposure
        bpy.ops.render.render(write_still=True)
        print(f"[unit-a] wrote {path} {os.path.getsize(path)} bytes")
    print(f"[unit-a] saved {OUT_BLEND}")


build()
