"""Build the authored Scene 1 lodge facade from the approved concept frames.

Run inside the connected Blender MCP server:

    exec(open('tools/blender/build_lodge_exterior.py').read())

This is one bounded exterior asset, not a new level system. Geometry is in the
same global lodge coordinates as Unit A, converted to Blender's Z-up axes.
Weathering follows the useful Claude of Duty recipe—macro variation, repairs,
runoff below real ledges and ground splash—but is authored into the asset rather
than importing that project's procedural material/render stack.
"""

from __future__ import annotations

import math
import os

import bpy
import mathutils

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
MATERIALS = f"{ROOT}/assets/blender/materials.blend"
OUT_BLEND = f"{ROOT}/assets/blender/lodge-exterior.blend"
OUT_SHOT = f"{ROOT}/shots/lodge-exterior-facade.jpg"
HDRI = f"{ROOT}/public/env/balcony_2k.hdr"

MCP_SETTINGS = (
    "blendermcp_use_polyhaven",
    "blendermcp_use_sketchfab",
    "blendermcp_sketchfab_api_key",
    "blendermcp_port",
    "blendermcp_server_running",
)

# Blender: X is runtime X, Y is -runtime Z, Z is runtime Y.
LEFT = -6.75
RIGHT = 6.65
FRONT_BACK = 0.18
FRONT_FACE = 0.46
GROUND = -0.72
PARAPET = 7.82


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


def load_arch_kit() -> None:
    exec(open(f"{ROOT}/tools/blender/kit_arch.py").read(), globals())


def link_materials() -> dict[str, bpy.types.Material]:
    if not os.path.exists(MATERIALS):
        raise FileNotFoundError(MATERIALS)
    with bpy.data.libraries.load(MATERIALS, link=True) as (source, target):
        target.materials = list(source.materials)
    return {material.name: material for material in bpy.data.materials}


def local_tint(source, name: str, tint) -> bpy.types.Material:
    material = source.copy()
    material.name = name
    material.use_fake_user = False
    material["tile_metres"] = source.get("tile_metres", 2.0)
    mix = next((node for node in material.node_tree.nodes if node.type == "MIX_RGB"), None)
    if mix is not None:
        mix.inputs["Color2"].default_value = (*tint, 1.0)
    return material


def flat_material(name: str, color, roughness=0.7, metallic=0.0, emission=None, alpha=1.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, alpha)
    material["tile_metres"] = 1.0
    bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 8.0
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        material.surface_render_method = "DITHERED"
    return material


def weathered_plaster_material(name: str) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material["tile_metres"] = 2.0
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    geometry = nodes.new("ShaderNodeNewGeometry")
    macro = nodes.new("ShaderNodeTexNoise")
    macro.inputs["Scale"].default_value = 0.48
    macro.inputs["Detail"].default_value = 5.0
    macro.inputs["Roughness"].default_value = 0.78
    colour = nodes.new("ShaderNodeValToRGB")
    colour.color_ramp.elements[0].position = 0.25
    colour.color_ramp.elements[0].color = (0.20, 0.16, 0.12, 1.0)
    colour.color_ramp.elements[1].position = 0.78
    colour.color_ramp.elements[1].color = (0.68, 0.59, 0.45, 1.0)
    fine = nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 8.5
    fine.inputs["Detail"].default_value = 3.0
    fine.inputs["Roughness"].default_value = 0.82
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.23
    bump.inputs["Distance"].default_value = 0.08
    links.new(geometry.outputs["Position"], macro.inputs["Vector"])
    links.new(geometry.outputs["Position"], fine.inputs["Vector"])
    links.new(macro.outputs["Fac"], colour.inputs["Fac"])
    links.new(colour.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(fine.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.82
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return material


def weathered_brick_material(name: str) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material["tile_metres"] = 1.2
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    geometry = nodes.new("ShaderNodeNewGeometry")
    brick = nodes.new("ShaderNodeTexBrick")
    brick.inputs["Color1"].default_value = (0.19, 0.055, 0.025, 1.0)
    brick.inputs["Color2"].default_value = (0.34, 0.095, 0.040, 1.0)
    brick.inputs["Mortar"].default_value = (0.055, 0.045, 0.038, 1.0)
    brick.inputs["Scale"].default_value = 4.8
    brick.inputs["Mortar Size"].default_value = 0.028
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.30
    bump.inputs["Distance"].default_value = 0.06
    links.new(geometry.outputs["Position"], brick.inputs["Vector"])
    links.new(brick.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(brick.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.88
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return material


def box(name: str, lo, hi, material):
    ob = cube(name, lo, hi)
    assign(ob, material)
    return ob


def facade_patch(name: str, points, material, depth=0.064):
    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata([(x, FRONT_FACE + depth, z) for x, z in points], [], [list(range(len(points)))])
    mesh.materials.append(material)
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def wall_cells(material) -> None:
    openings = [
        (-5.90, -4.80, 0.78, 2.78),
        (-3.60, -2.50, 0.78, 2.78),
        (-0.68, 0.68, GROUND, 2.62),
        (2.55, 3.65, 0.78, 2.78),
        (4.82, 5.92, 0.78, 2.78),
        (-5.90, -4.80, 4.12, 6.08),
        (-3.60, -2.50, 4.12, 6.08),
        (2.55, 3.65, 4.12, 6.08),
        (4.82, 5.92, 4.12, 6.08),
    ]
    xs = sorted({LEFT, RIGHT, *(value for opening in openings for value in opening[:2])})
    zs = sorted({GROUND, PARAPET, *(value for opening in openings for value in opening[2:])})
    count = 0
    for xa, xb in zip(xs, xs[1:]):
        for za, zb in zip(zs, zs[1:]):
            cx = (xa + xb) / 2
            cz = (za + zb) / 2
            if any(x0 < cx < x1 and z0 < cz < z1 for x0, x1, z0, z1 in openings):
                continue
            box(f"exterior_facade_wall_{count:02d}", (xa, FRONT_BACK, za), (xb, FRONT_FACE, zb), material)
            count += 1


def path_curve(name: str, points, material, bevel: float, cyclic=False):
    data = bpy.data.curves.new(name, type="CURVE")
    data.dimensions = "3D"
    data.resolution_u = 2
    data.bevel_depth = bevel
    data.bevel_resolution = 2
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1.0)
    spline.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    data.materials.append(material)
    return ob


def arched_surround(name: str, x0: float, x1: float, z0: float, z1: float, material, depth=0.055):
    radius = (x1 - x0) / 2
    centre_x = (x0 + x1) / 2
    spring = z1 - radius
    points = [(x0, FRONT_FACE + depth, z0), (x0, FRONT_FACE + depth, spring)]
    for i in range(13):
        angle = math.pi - math.pi * i / 12
        points.append((centre_x + math.cos(angle) * radius, FRONT_FACE + depth, spring + math.sin(angle) * radius))
    points += [(x1, FRONT_FACE + depth, spring), (x1, FRONT_FACE + depth, z0)]
    return path_curve(name, points, material, 0.055)


def window(name: str, x0: float, x1: float, z0: float, z1: float, timber, glass, trim) -> None:
    radius = (x1 - x0) / 2
    spring = z1 - radius
    box(f"{name}_dark", (x0 + 0.03, FRONT_FACE + 0.012, z0), (x1 - 0.03, FRONT_FACE + 0.025, spring + 0.02), glass)
    arched_surround(f"{name}_arch", x0, x1, z0, z1, trim)
    box(f"{name}_sill", (x0 - 0.13, FRONT_FACE + 0.02, z0 - 0.12), (x1 + 0.13, FRONT_FACE + 0.18, z0), trim)
    box(f"{name}_meeting", (x0 + 0.04, FRONT_FACE + 0.08, z0 + 0.82), (x1 - 0.04, FRONT_FACE + 0.13, z0 + 0.89), timber)
    box(f"{name}_stile_l", (x0 + 0.03, FRONT_FACE + 0.07, z0), (x0 + 0.09, FRONT_FACE + 0.14, spring), timber)
    box(f"{name}_stile_r", (x1 - 0.09, FRONT_FACE + 0.07, z0), (x1 - 0.03, FRONT_FACE + 0.14, spring), timber)


def facade_detail(materials) -> None:
    render = weathered_plaster_material("exterior_render_weathered")
    repair = local_tint(materials["plaster_cornice"], "exterior_render_repair", (0.92, 0.94, 0.93))
    damp = local_tint(materials["plaster_nicotine"], "exterior_render_damp", (0.47, 0.43, 0.36))
    trim = local_tint(materials["plaster_cornice"], "exterior_stone_trim", (0.91, 0.88, 0.79))
    timber = materials["timber_dark"]
    iron = flat_material("exterior_iron", (0.045, 0.038, 0.034), 0.42, 0.7)
    glass = flat_material("exterior_window_dark", (0.025, 0.035, 0.045), 0.14, 0.05)
    stain = flat_material("exterior_runoff", (0.16, 0.14, 0.12), 0.94, alpha=0.42)
    neon_pink = flat_material("exterior_neon_pink", (0.5, 0.01, 0.12), 0.25, emission=(1.0, 0.01, 0.16))
    neon_cyan = flat_material("exterior_neon_cyan", (0.01, 0.42, 0.5), 0.25, emission=(0.02, 0.75, 1.0))
    road = flat_material("exterior_wet_asphalt", (0.018, 0.022, 0.026), 0.18)
    brick = weathered_brick_material("exterior_side_brick")

    wall_cells(render)

    # The facade is one authored building, not a floating theatre flat.
    box("exterior_left_side", (LEFT - 0.28, -7.1, GROUND), (LEFT, FRONT_FACE, PARAPET), brick)
    box("exterior_right_side", (RIGHT, -7.1, GROUND), (RIGHT + 0.28, FRONT_FACE, PARAPET), brick)
    box("exterior_roof", (LEFT - 0.28, -7.1, 7.62), (RIGHT + 0.28, FRONT_FACE, 7.80), materials["timber_dark"])
    for x in (LEFT + 0.45, RIGHT - 0.45):
        box(f"exterior_parapet_pier_{x}", (x - 0.22, FRONT_BACK - 0.02, 7.35), (x + 0.22, FRONT_FACE + 0.25, 8.02), trim)

    # Base grime, string courses, cornice and parapet: broad shadow lines carry
    # the facade at street distance before any small ornament is visible.
    box("exterior_ground_splash", (LEFT, FRONT_FACE + 0.01, GROUND), (RIGHT, FRONT_FACE + 0.045, -0.12), damp)
    for z, height, proud in ((3.12, 0.17, 0.16), (6.32, 0.18, 0.19), (7.48, 0.24, 0.23)):
        box(f"exterior_string_{z}", (LEFT - 0.08, FRONT_FACE, z), (RIGHT + 0.08, FRONT_FACE + proud, z + height), trim)
    for x in (LEFT + 0.08, -4.35, -1.25, 1.45, 4.35, RIGHT - 0.08):
        box(f"exterior_pilaster_{x}", (x - 0.10, FRONT_FACE, GROUND), (x + 0.10, FRONT_FACE + 0.16, 7.48), trim)
        box(f"exterior_pilaster_cap_{x}", (x - 0.18, FRONT_FACE, 7.43), (x + 0.18, FRONT_FACE + 0.24, 7.70), trim)

    ground_windows = ((-5.90, -4.80), (-3.60, -2.50), (2.55, 3.65), (4.82, 5.92))
    upper_windows = ((-5.90, -4.80), (-3.60, -2.50), (2.55, 3.65), (4.82, 5.92))
    for index, (x0, x1) in enumerate(ground_windows):
        window(f"exterior_ground_window_{index}", x0, x1, 0.78, 2.78, timber, glass, trim)
    for index, (x0, x1) in enumerate(upper_windows):
        window(f"exterior_upper_window_{index}", x0, x1, 4.12, 6.08, timber, glass, trim)

    # Arched entrance and a panelled open leaf behind it.
    arched_surround("exterior_front_door_arch", -0.78, 0.78, GROUND, 2.72, trim, 0.08)
    box("exterior_front_door_reveal_l", (-0.74, FRONT_BACK - 0.05, GROUND), (-0.64, FRONT_FACE + 0.1, 2.20), trim)
    box("exterior_front_door_reveal_r", (0.64, FRONT_BACK - 0.05, GROUND), (0.74, FRONT_FACE + 0.1, 2.20), trim)
    box("exterior_front_door_dark", (-0.62, FRONT_BACK - 0.12, GROUND + 0.03), (0.62, FRONT_BACK - 0.04, 2.70), timber)
    for z in (-0.62, 0.02, 0.70, 1.38):
        box(f"exterior_front_door_panel_{z}", (-0.48, FRONT_BACK - 0.15, z), (0.48, FRONT_BACK - 0.13, z + 0.45), iron)

    # Street threshold and shallow front apron make the entrance legible from
    # the player's approach angle and hide the original blockout seam.
    box("exterior_sidewalk", (-9.5, 1.30, -0.78), (9.5, 2.55, -0.62), trim)
    box("exterior_curb", (-10.0, 2.48, -0.87), (10.0, 2.72, -0.58), damp)
    for index, (y0, y1, z0, z1) in enumerate(((0.50, 1.25, -0.68, -0.50), (0.72, 1.45, -0.50, -0.32))):
        box(f"exterior_entry_step_{index}", (-0.92, y0, z0), (0.92, y1, z1), trim)

    # Full-width iron-lace balcony. Repetition is broken by wider structural
    # bays, while crossed diagonals keep it Victorian instead of office railing.
    box("exterior_balcony_slab", (LEFT + 0.20, FRONT_BACK - 0.05, 3.08), (RIGHT - 0.20, 1.34, 3.22), trim)
    box("exterior_balcony_rail_top", (LEFT + 0.28, 1.21, 4.20), (RIGHT - 0.28, 1.30, 4.30), iron)
    box("exterior_balcony_rail_bottom", (LEFT + 0.28, 1.21, 3.28), (RIGHT - 0.28, 1.30, 3.36), iron)
    for x in (-6.20, -3.12, 0.0, 3.12, 6.10):
        box(f"exterior_balcony_post_{x}", (x - 0.065, 1.18, GROUND), (x + 0.065, 1.32, 6.55), iron)
        box(f"exterior_balcony_post_cap_{x}", (x - 0.13, 1.13, 6.45), (x + 0.13, 1.37, 6.68), iron)
    for index, x in enumerate([LEFT + 0.42 + i * 0.34 for i in range(38)]):
        box(f"exterior_baluster_{index:02d}", (x - 0.018, 1.22, 3.33), (x + 0.018, 1.29, 4.23), iron)
        if index % 2 == 0:
            path_curve(f"exterior_lace_{index:02d}", [(x - 0.13, 1.31, 3.47), (x + 0.13, 1.31, 4.06)], iron, 0.012)
            path_curve(f"exterior_lace_cross_{index:02d}", [(x + 0.13, 1.31, 3.47), (x - 0.13, 1.31, 4.06)], iron, 0.012)

    # Small iron rings break the straight modern railing silhouette and give
    # the full-width balcony a denser nineteenth-century lace rhythm.
    for index, x in enumerate([LEFT + 0.76 + i * 0.68 for i in range(19)]):
        ring_points = [
            (x + math.cos(math.tau * step / 12) * 0.095, 1.32, 3.77 + math.sin(math.tau * step / 12) * 0.095)
            for step in range(12)
        ]
        path_curve(
            f"exterior_lace_ring_{index:02d}",
            ring_points,
            iron,
            0.014,
            cyclic=True,
        )

    # Authored weathering: repair rectangles and runoff only below things that
    # actually shed water. This is the useful reference-repo idea in asset form.
    runoff_sources = ((-5.72, 0.78), (-3.02, 0.78), (3.02, 0.78), (5.62, 0.78), (-5.10, 4.12), (3.25, 4.12))
    for index, (x, z) in enumerate(runoff_sources):
        width = 0.07 + (index % 3) * 0.035
        length = 0.55 + (index % 2) * 0.35
        box(f"exterior_runoff_{index}", (x - width, FRONT_FACE + 0.057, z - length), (x + width, FRONT_FACE + 0.067, z - 0.02), stain)

    # Neon is real emissive geometry. The title is high and centred; the rooms
    # sign is beside the entrance, matching the approved reference hierarchy.
    title_data = bpy.data.curves.new("exterior_neon_title", type="FONT")
    title_data.body = "THE PARADISE LODGE"
    title_data.align_x = "CENTER"
    title_data.align_y = "CENTER"
    title_data.size = 0.63
    title_data.extrude = 0.012
    title_data.bevel_depth = 0.008
    title_data.materials.append(neon_pink)
    title = bpy.data.objects.new("exterior_neon_title", title_data)
    bpy.context.scene.collection.objects.link(title)
    title.location = (0.0, FRONT_FACE + 0.20, 7.10)
    title.rotation_euler = (math.pi / 2, 0.0, math.pi)

    box("exterior_rooms_sign_board", (-5.92, FRONT_FACE + 0.04, 1.08), (-4.18, FRONT_FACE + 0.14, 2.35), iron)
    rooms_data = bpy.data.curves.new("exterior_rooms_neon", type="FONT")
    rooms_data.body = "ROOMS\nTO LET"
    rooms_data.align_x = "CENTER"
    rooms_data.align_y = "CENTER"
    rooms_data.space_line = 0.82
    rooms_data.size = 0.43
    rooms_data.extrude = 0.01
    rooms_data.bevel_depth = 0.006
    rooms_data.materials.append(neon_cyan)
    rooms = bpy.data.objects.new("exterior_rooms_neon", rooms_data)
    bpy.context.scene.collection.objects.link(rooms)
    rooms.location = (-5.05, FRONT_FACE + 0.22, 1.72)
    rooms.rotation_euler = (math.pi / 2, 0.0, math.pi)

    # Wet-looking, not recently rained-on: low roughness catches the sky and
    # neon without adding weather or a reflection renderer.
    box("exterior_road", (-18.0, 1.55, -0.88), (18.0, 18.0, -0.84), road)
    for index, (x0, x1, y0, y1) in enumerate(((-8, -2, 3, 6), (1, 7, 5, 8), (-4, 5, 10, 13))):
        puddle = flat_material(f"exterior_puddle_mat_{index}", (0.015, 0.020, 0.025), 0.045)
        box(f"exterior_puddle_{index}", (x0, y0, -0.837), (x1, y1, -0.833), puddle)


def lighting_and_camera() -> None:
    direction = mathutils.Vector((-0.847, -0.400, -0.365)).normalized()
    data = bpy.data.lights.new("exterior_sun", type="SUN")
    data.energy = 2.35
    data.angle = math.radians(0.9)
    data.color = (1.0, 0.906, 0.78)
    sun = bpy.data.objects.new("exterior_sun", data)
    bpy.context.scene.collection.objects.link(sun)
    sun.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    world = bpy.data.worlds.new("exterior_world")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    environment = nodes.new("ShaderNodeTexEnvironment")
    environment.image = bpy.data.images.load(HDRI, check_existing=True)
    links.new(environment.outputs["Color"], nodes["Background"].inputs["Color"])
    nodes["Background"].inputs["Strength"].default_value = 0.30

    for name, location, color, energy, radius in (
        ("exterior_title_glow", (0.0, 2.0, 7.0), (1.0, 0.01, 0.12), 260.0, 3.0),
        ("exterior_rooms_glow", (-5.05, 1.75, 1.72), (0.01, 0.65, 1.0), 185.0, 2.1),
    ):
        glow_data = bpy.data.lights.new(name, type="POINT")
        glow_data.color = color
        glow_data.energy = energy
        glow_data.shadow_soft_size = radius
        glow = bpy.data.objects.new(name, glow_data)
        bpy.context.scene.collection.objects.link(glow)
        glow.location = location

    camera_data = bpy.data.cameras.new("exterior_facade_camera")
    camera_data.lens = 42
    camera = bpy.data.objects.new("exterior_facade_camera", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = (-11.8, 21.5, 3.0)
    target = mathutils.Vector((0.0, FRONT_FACE, 3.45))
    camera.rotation_euler = (target - camera.location).normalized().to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera


def configure_and_render() -> None:
    scene = bpy.context.scene
    scene.name = "Scene 1 Lodge Exterior"
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.25
    scene.render.filepath = OUT_SHOT
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    bpy.ops.render.render(write_still=True)
    print(f"[exterior] {len(bpy.context.scene.objects)} objects")
    print(f"[exterior] saved {OUT_BLEND}")
    print(f"[exterior] rendered {OUT_SHOT}")


def main() -> None:
    reset_scene()
    load_arch_kit()
    materials = link_materials()
    facade_detail(materials)
    lighting_and_camera()
    configure_and_render()


main()
