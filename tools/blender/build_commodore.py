"""Build the Scene 1 VP Commodore from the supplied multi-angle references.

The model is deliberately authored rather than substituted with a different
make. It preserves the long four-door profile, low wedge nose, broad tail-light
panel, soft roof arc and heavy C-pillar visible in the reference photographs.
"""

from __future__ import annotations

import math
import os

import bpy
import mathutils

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
OUT_BLEND = f"{ROOT}/assets/blender/commodore.blend"
OUT_GLB = f"{ROOT}/public/models/commodore.glb"
OUT_SHOT = f"{ROOT}/shots/commodore.jpg"
HDRI = f"{ROOT}/public/env/balcony_2k.hdr"

MCP_SETTINGS = (
    "blendermcp_use_polyhaven",
    "blendermcp_use_sketchfab",
    "blendermcp_sketchfab_api_key",
    "blendermcp_port",
    "blendermcp_server_running",
)


def reset_scene() -> None:
    old = bpy.context.scene
    kept = {key: getattr(old, key) for key in MCP_SETTINGS if hasattr(old, key)}
    bpy.ops.wm.read_homefile(use_empty=True)
    for key, value in kept.items():
        try:
            setattr(bpy.context.scene, key, value)
        except (AttributeError, TypeError):
            pass
    bpy.context.scene.unit_settings.system = "METRIC"


def material(name, color, roughness=0.55, metallic=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1.0)
    bsdf = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.8
    return mat


def mesh_object(name, vertices, faces, mat, root, bevel=0.0):
    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(mat)
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    if bevel > 0:
        modifier = ob.modifiers.new("soft stamped edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return ob


def prism(name, stations, mat, root, bevel=0.0):
    vertices = []
    for x, half_width, low, high in stations:
        vertices += [(x, -half_width, low), (x, half_width, low), (x, half_width, high), (x, -half_width, high)]
    faces = [(0, 1, 2, 3)]
    for index in range(len(stations) - 1):
        a = index * 4
        b = (index + 1) * 4
        faces += [(a, b, b + 1, a + 1), (a + 1, b + 1, b + 2, a + 2), (a + 2, b + 2, b + 3, a + 3), (a + 3, b + 3, b, a)]
    end = (len(stations) - 1) * 4
    faces.append((end + 3, end + 2, end + 1, end))
    return mesh_object(name, vertices, faces, mat, root, bevel)


def cabin(name, stations, mat, root, bevel=0.0):
    vertices = []
    for x, lower_width, upper_width, low, high in stations:
        vertices += [(x, -lower_width, low), (x, lower_width, low), (x, upper_width, high), (x, -upper_width, high)]
    # End caps are supplied by the sloped glass screens; closing the station
    # ends here would put a vertical painted wall in front of each windscreen.
    faces = []
    for index in range(len(stations) - 1):
        a = index * 4
        b = (index + 1) * 4
        faces += [(a, b, b + 1, a + 1), (a + 1, b + 1, b + 2, a + 2), (a + 2, b + 2, b + 3, a + 3), (a + 3, b + 3, b, a)]
    return mesh_object(name, vertices, faces, mat, root, bevel)


def box(name, lo, hi, mat, root, bevel=0.0):
    x0, y0, z0 = lo
    x1, y1, z1 = hi
    return mesh_object(
        name,
        [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
         (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
        [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (4, 0, 3, 7)],
        mat,
        root,
        bevel,
    )


def panel(name, points, mat, root):
    return mesh_object(name, points, [tuple(range(len(points)))], mat, root)


def cylinder_y(name, x, y, z, radius, width, mat, root, segments=20):
    vertices = []
    for side in (-width / 2, width / 2):
        for index in range(segments):
            angle = math.tau * index / segments
            vertices.append((x + math.cos(angle) * radius, y + side, z + math.sin(angle) * radius))
    faces = []
    for index in range(segments):
        nxt = (index + 1) % segments
        faces.append((index, nxt, segments + nxt, segments + index))
    faces += [tuple(reversed(range(segments))), tuple(range(segments, segments * 2))]
    return mesh_object(name, vertices, faces, mat, root, bevel=0.008)


def curve(name, points, mat, root, bevel=0.012, cyclic=False):
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
    data.materials.append(mat)
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    return ob


def build_car():
    root = bpy.data.objects.new("commodore", None)
    bpy.context.scene.collection.objects.link(root)

    paint = material("commodore_fleet_beige", (0.69, 0.66, 0.56), 0.34, 0.12)
    dark = material("commodore_black_trim", (0.018, 0.021, 0.024), 0.48)
    glass = material("commodore_smoked_glass", (0.025, 0.055, 0.070), 0.12, 0.08)
    tyre = material("commodore_tyres", (0.012, 0.012, 0.013), 0.88)
    hub = material("commodore_hubcaps", (0.46, 0.47, 0.45), 0.30, 0.72)
    chrome = material("commodore_brightwork", (0.58, 0.60, 0.58), 0.24, 0.82)
    red = material("commodore_tail_red", (0.42, 0.006, 0.008), 0.26, emission=(0.18, 0.002, 0.002))
    amber = material("commodore_indicator_amber", (0.70, 0.16, 0.01), 0.24, emission=(0.16, 0.035, 0.001))
    lamp = material("commodore_headlamp", (0.62, 0.68, 0.70), 0.18, 0.25, emission=(0.18, 0.20, 0.20))
    plate = material("commodore_plate", (0.86, 0.84, 0.73), 0.60)

    prism("commodore_body", [
        (-2.48, 0.67, 0.30, 0.63), (-2.28, 0.84, 0.25, 0.76),
        (-1.55, 0.91, 0.22, 0.86), (1.48, 0.92, 0.22, 0.88),
        (2.20, 0.88, 0.25, 0.80), (2.42, 0.72, 0.31, 0.68),
    ], paint, root, 0.055)
    prism("commodore_belt", [(-2.28, 0.845, 0.72, 0.82), (-1.30, 0.91, 0.78, 0.91), (1.55, 0.91, 0.78, 0.91), (2.20, 0.84, 0.70, 0.80)], paint, root, 0.025)
    cabin("commodore_cabin", [
        (-1.30, 0.80, 0.62, 0.82, 1.25), (-0.92, 0.82, 0.69, 0.84, 1.45),
        (-0.25, 0.83, 0.72, 0.85, 1.54), (0.72, 0.83, 0.71, 0.85, 1.52),
        (1.34, 0.80, 0.61, 0.82, 1.28),
    ], paint, root, 0.035)
    # Side glass and the strong black B-pillar/triangular rear quarter shown in
    # the supplied front and rear three-quarter photographs.
    for side in (-1, 1):
        y = side * 0.858
        panel(f"commodore_front_side_glass_{side}", [(-1.30, y, 0.91), (-0.18, y, 0.92), (-0.20, side * 0.748, 1.47), (-0.93, side * 0.728, 1.42)], glass, root)
        panel(f"commodore_rear_side_glass_{side}", [(-0.10, y, 0.92), (1.18, side * 0.834, 0.90), (1.22, side * 0.654, 1.27), (-0.05, side * 0.748, 1.47)], glass, root)
        box(f"commodore_b_pillar_{side}", (-0.15, y - 0.012, 0.88), (-0.05, y + 0.012, 1.49), dark, root)
        for x in (-0.72, 0.48):
            box(f"commodore_handle_{side}_{x}", (x - 0.10, y - 0.018, 0.72), (x + 0.10, y + 0.018, 0.76), dark, root, 0.01)
        curve(f"commodore_pinstripe_{side}", [(-2.15, side * 0.925, 0.61), (2.14, side * 0.895, 0.61)], red, root, 0.012)
        curve(f"commodore_arch_front_{side}", [(-1.82 + math.cos(math.pi * i / 12) * 0.43, side * 0.932, 0.30 + math.sin(math.pi * i / 12) * 0.43) for i in range(13)], dark, root, 0.024)
        curve(f"commodore_arch_rear_{side}", [(1.48 + math.cos(math.pi * i / 12) * 0.43, side * 0.932, 0.30 + math.sin(math.pi * i / 12) * 0.43) for i in range(13)], dark, root, 0.024)
        box(f"commodore_mirror_{side}", (-1.30, side * 0.88, 0.91), (-1.04, side * 1.03, 1.04), dark, root, 0.035)

    panel("commodore_windscreen", [(-1.36, -0.64, 0.92), (-1.36, 0.64, 0.92), (-0.95, 0.71, 1.43), (-0.95, -0.71, 1.43)], glass, root)
    panel("commodore_rear_screen", [(1.38, 0.63, 0.91), (1.38, -0.63, 0.91), (0.75, -0.72, 1.48), (0.75, 0.72, 1.48)], glass, root)

    for x, label in ((-1.55, "front"), (1.48, "rear")):
        for side in (-1, 1):
            cylinder_y(f"commodore_{label}_tyre_{side}", x, side * 0.92, 0.39, 0.39, 0.20, tyre, root)
            cylinder_y(f"commodore_{label}_hub_{side}", x, side * 1.035, 0.39, 0.25, 0.035, hub, root, 16)
            cylinder_y(f"commodore_{label}_cap_{side}", x, side * 1.058, 0.39, 0.075, 0.015, chrome, root, 14)

    box("commodore_front_bumper", (-2.51, -0.78, 0.36), (-2.41, 0.78, 0.53), paint, root, 0.04)
    box("commodore_front_grille", (-2.53, -0.31, 0.56), (-2.44, 0.31, 0.68), dark, root, 0.01)
    box("commodore_headlamp_left", (-2.54, -0.75, 0.55), (-2.45, -0.34, 0.72), lamp, root, 0.025)
    box("commodore_headlamp_right", (-2.54, 0.34, 0.55), (-2.45, 0.75, 0.72), lamp, root, 0.025)
    box("commodore_front_indicator_left", (-2.55, -0.88, 0.54), (-2.46, -0.75, 0.69), amber, root, 0.015)
    box("commodore_front_indicator_right", (-2.55, 0.75, 0.54), (-2.46, 0.88, 0.69), amber, root, 0.015)
    box("commodore_front_plate", (-2.565, -0.28, 0.37), (-2.54, 0.28, 0.53), plate, root, 0.01)

    box("commodore_rear_bumper", (2.39, -0.80, 0.32), (2.49, 0.80, 0.50), paint, root, 0.04)
    box("commodore_tail_panel", (2.40, -0.76, 0.54), (2.47, 0.76, 0.73), dark, root, 0.012)
    box("commodore_tail_left", (2.46, -0.75, 0.55), (2.49, -0.28, 0.72), red, root, 0.012)
    box("commodore_tail_right", (2.46, 0.28, 0.55), (2.49, 0.75, 0.72), red, root, 0.012)
    box("commodore_tail_amber_left", (2.49, -0.46, 0.57), (2.51, -0.28, 0.68), amber, root, 0.008)
    box("commodore_tail_amber_right", (2.49, 0.28, 0.57), (2.51, 0.46, 0.68), amber, root, 0.008)
    box("commodore_rear_plate", (2.505, -0.26, 0.48), (2.52, 0.26, 0.62), plate, root, 0.008)
    cylinder_y("commodore_exhaust", 2.42, -0.54, 0.18, 0.045, 0.30, dark, root, 12).rotation_euler.x = math.pi / 2

    return root


def light_camera_and_export(root) -> None:
    ground_mat = material("preview_asphalt", (0.045, 0.048, 0.052), 0.82)
    ground = box("preview_ground", (-8, -8, -0.08), (8, 8, 0), ground_mat, bpy.data.objects.new("preview_root", None))
    bpy.context.scene.collection.objects.link(ground.parent)

    world = bpy.data.worlds.new("commodore_world")
    world.use_nodes = True
    bpy.context.scene.world = world
    env = world.node_tree.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(HDRI, check_existing=True)
    world.node_tree.links.new(env.outputs["Color"], world.node_tree.nodes["Background"].inputs["Color"])
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.42

    sun_data = bpy.data.lights.new("commodore_sun", "SUN")
    sun_data.energy = 2.8
    sun_data.angle = math.radians(1.2)
    sun = bpy.data.objects.new("commodore_sun", sun_data)
    bpy.context.scene.collection.objects.link(sun)
    sun.rotation_euler = mathutils.Vector((-0.7, -0.5, -0.5)).to_track_quat("-Z", "Y").to_euler()

    camera_data = bpy.data.cameras.new("commodore_camera")
    camera_data.lens = 56
    camera = bpy.data.objects.new("commodore_camera", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = (-5.6, -6.4, 2.65)
    camera.rotation_euler = (mathutils.Vector((0, 0, 0.72)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 810
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.color_mode = "RGB"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.filepath = OUT_SHOT
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    bpy.ops.render.render(write_still=True)

    export_objects = [root, *root.children_recursive]
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
    windows = bpy.context.window_manager.windows
    window = windows[0]
    area = next(item for item in window.screen.areas if item.type == "VIEW_3D")
    region = next(item for item in area.regions if item.type == "WINDOW")
    with bpy.context.temp_override(
        window=window,
        screen=window.screen,
        area=area,
        region=region,
        scene=scene,
        view_layer=bpy.context.view_layer,
    ):
        bpy.ops.export_scene.gltf(
            filepath=OUT_GLB,
            export_format="GLB",
            use_selection=True,
            export_yup=True,
            export_apply=True,
            export_cameras=False,
            export_lights=False,
            export_animations=False,
            export_image_format="JPEG",
            export_jpeg_quality=82,
        )
    print(f"[commodore] {len(export_objects) - 1} authored parts")
    print(f"[commodore] {os.path.getsize(OUT_GLB) / 1e6:.2f} MB")


reset_scene()
car = build_car()
light_camera_and_export(car)
