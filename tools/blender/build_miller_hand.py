"""
Build Miller's segmented gloved right hand and export glTF.

Run inside Blender via MCP. Coordinate convention (Blender Z-up):
  fingers along +Y  →  glTF/Three -Z after Yup export
  palm faces -Z     →  glTF/Three -Y
  thumb on +X       →  stays +X

Hierarchy names match what rig.ts looks up after load.
Units are metres. Proportions from images/characters/miller-hands.png and
the existing procedural rig.
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

OUT_DIR = Path("/Users/habibi/Documents/CLAUDE/paradisegame/public/models")
BLEND_PATH = Path("/Users/habibi/Documents/CLAUDE/paradisegame/assets/blender/miller-hand.blend")
GLB_PATH = OUT_DIR / "miller-hand.glb"

PALM_WIDTH = 0.098
PALM_LENGTH = 0.104
PALM_THICKNESS = 0.034

FINGER_SEGMENTS = [
    (0.048, 0.031, 0.023),
    (0.052, 0.034, 0.024),
    (0.048, 0.031, 0.023),
    (0.038, 0.024, 0.020),
]
FINGER_RADII = [0.0125, 0.0130, 0.0122, 0.0107]
FINGER_NAMES = ["index", "middle", "ring", "little"]

THUMB_SEGMENTS = (0.042, 0.030)
THUMB_RADIUS = 0.0145

GLOVE = (0.851, 0.824, 0.745, 1.0)
SEAM = (0.780, 0.749, 0.659, 1.0)
CUFF = (0.949, 0.941, 0.918, 1.0)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
        for item in list(block):
            block.remove(item)


def mat(name: str, colour: tuple[float, float, float, float], roughness: float) -> bpy.types.Material:
    existing = bpy.data.materials.get(name)
    if existing is not None:
        bpy.data.materials.remove(existing)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    assert bsdf is not None
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.35
    return m


def empty(name: str, parent: bpy.types.Object | None = None, loc=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.01
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def link_mesh(
    name: str,
    mesh: bpy.types.Mesh,
    parent: bpy.types.Object,
    loc=(0.0, 0.0, 0.0),
) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def assign(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def capsule_mesh(name: str, radius: float, length: float, segs: int = 12) -> bpy.types.Mesh:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    shaft = max(length - 2.0 * radius, 0.001)

    bmesh.ops.create_cone(
        bm,
        cap_ends=False,
        cap_tris=False,
        segments=segs,
        radius1=radius,
        radius2=radius,
        depth=shaft,
    )
    bmesh.ops.rotate(
        bm,
        verts=bm.verts,
        cent=(0, 0, 0),
        matrix=Matrix.Rotation(math.radians(90), 3, "X"),
    )

    for y in (shaft / 2.0, -shaft / 2.0):
        ret = bmesh.ops.create_uvsphere(
            bm,
            u_segments=segs,
            v_segments=max(segs // 2, 4),
            radius=radius,
        )
        for v in ret["verts"]:
            v.co.y += y

    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=radius * 0.05)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return mesh


def cylinder_mesh(
    name: str,
    radius_top: float,
    radius_bottom: float,
    depth: float,
    segs: int = 14,
) -> bpy.types.Mesh:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segs,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
    )
    bmesh.ops.rotate(
        bm,
        verts=bm.verts,
        cent=(0, 0, 0),
        matrix=Matrix.Rotation(math.radians(90), 3, "X"),
    )
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return mesh


def sphere_mesh(name: str, radius: float, segs: int = 10) -> bpy.types.Mesh:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(segs // 2, 4), radius=radius)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return mesh


def palm_mesh(name: str) -> bpy.types.Mesh:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()

    half_w = PALM_WIDTH / 2.0
    length = PALM_LENGTH
    thick = PALM_THICKNESS
    knuckles = [
        (-0.92, 0.90),
        (-0.55, 1.00),
        (-0.18, 1.04),
        (0.18, 1.05),
        (0.52, 1.01),
        (0.88, 0.90),
    ]

    pts: list[Vector] = []

    def add_bezier(a: Vector, c1: Vector, c2: Vector, b: Vector, steps: int = 6) -> None:
        for i in range(1, steps + 1):
            t = i / steps
            u = 1.0 - t
            pts.append((u * u * u) * a + 3 * (u * u) * t * c1 + 3 * u * (t * t) * c2 + (t * t * t) * b)

    start = Vector((-half_w * 0.68, 0.006, 0.0))
    pts.append(start)
    add_bezier(
        start,
        Vector((-half_w * 0.88, length * 0.18, 0.0)),
        Vector((-half_w * 1.06, length * 0.48, 0.0)),
        Vector((-half_w * 1.00, length * 0.78, 0.0)),
    )
    pts.append(Vector((half_w * knuckles[0][0], length * knuckles[0][1], 0.0)))
    for i in range(len(knuckles) - 1):
        a = knuckles[i]
        b = knuckles[i + 1]
        mid_x = (a[0] + b[0]) / 2.0
        valley = min(a[1], b[1]) - 0.055
        p0 = pts[-1]
        p1 = Vector((half_w * mid_x, length * valley, 0.0))
        p2 = Vector((half_w * b[0], length * b[1], 0.0))
        for s in range(1, 5):
            t = s / 4.0
            u = 1.0 - t
            pts.append((u * u) * p0 + 2 * u * t * p1 + (t * t) * p2)
    add_bezier(
        pts[-1],
        Vector((half_w * 1.12, length * 0.62, 0.0)),
        Vector((half_w * 1.18, length * 0.34, 0.0)),
        Vector((half_w * 0.92, length * 0.14, 0.0)),
    )
    add_bezier(
        pts[-1],
        Vector((half_w * 0.70, length * 0.04, 0.0)),
        Vector((half_w * 0.42, -0.002, 0.0)),
        Vector((half_w * 0.22, 0.006, 0.0)),
    )

    bottom_verts = [bm.verts.new(p) for p in pts]
    bm.verts.ensure_lookup_table()
    bm.edges.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    face = bm.faces.new(bottom_verts)
    bm.faces.ensure_lookup_table()

    ret = bmesh.ops.extrude_face_region(bm, geom=[face])
    extruded = [ele for ele in ret["geom"] if isinstance(ele, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=extruded, vec=(0.0, 0.0, -thick))
    bm.verts.ensure_lookup_table()
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0.0, 0.0, thick / 2.0))

    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        if v.co.z <= 0.001:
            continue
        nx = v.co.x / (PALM_WIDTH * 0.55)
        ny = (v.co.y - PALM_LENGTH * 0.5) / (PALM_LENGTH * 0.55)
        falloff = max(0.0, 1.0 - (nx * nx + ny * ny))
        v.co.z += PALM_THICKNESS * 0.22 * falloff * falloff

    bm.edges.ensure_lookup_table()
    try:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.0045, segments=2, affect="EDGES")
    except Exception:
        pass
    bm.faces.ensure_lookup_table()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return mesh


def pad_mesh(name: str, points: list[tuple[float, float]], depth: float) -> bpy.types.Mesh:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((x, y, 0.0)) for x, y in points]
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    face = bm.faces.new(verts)
    bm.faces.ensure_lookup_table()
    ret = bmesh.ops.extrude_face_region(bm, geom=[face])
    extruded = [ele for ele in ret["geom"] if isinstance(ele, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=extruded, vec=(0.0, 0.0, -depth))
    bm.verts.ensure_lookup_table()
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0.0, 0.0, depth / 2.0))
    bm.edges.ensure_lookup_table()
    try:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.003, segments=2, affect="EDGES")
    except Exception:
        pass
    bm.faces.ensure_lookup_table()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return mesh


def build_finger(
    parent: bpy.types.Object,
    name: str,
    lengths: tuple[float, ...],
    radius: float,
    glove: bpy.types.Material,
    knuckle_loc: tuple[float, float, float],
    splay: float,
) -> None:
    knuckle = empty(f"{name}_knuckle", parent, knuckle_loc)
    knuckle.rotation_euler = (0.0, 0.0, splay)

    pad = link_mesh(
        f"{name}_knucklePad",
        sphere_mesh(f"{name}_knucklePadMesh", radius * 1.15, 8),
        knuckle,
        (0.0, -0.006, PALM_THICKNESS * 0.28),
    )
    pad.scale = (1.1, 0.85, 0.72)
    assign(pad, glove)

    attach = knuckle
    for i, length in enumerate(lengths):
        loc = (0.0, 0.0, 0.0) if i == 0 else (0.0, lengths[i - 1], 0.0)
        joint = empty(f"{name}_j{i}", attach, loc)
        seg_r = radius * (1.0 - i * 0.11)
        seg = link_mesh(
            f"{name}_seg{i}",
            capsule_mesh(f"{name}_seg{i}Mesh", seg_r, length, 10),
            joint,
            (0.0, length / 2.0, 0.0),
        )
        assign(seg, glove)
        attach = joint


def build_export() -> None:
    clear_scene()
    glove = mat("Glove", GLOVE, 0.55)
    seam = mat("GloveSeam", SEAM, 0.6)
    cuff_mat = mat("Cuff", CUFF, 0.92)

    root = empty("HandRight")

    sleeve = empty("sleeve", root)
    # Sleeve sits opposite the fingers. Fingers are +Y; cuff is -Y.
    forearm = link_mesh(
        "forearm",
        cylinder_mesh("forearmMesh", 0.038, 0.042, 0.07, 12),
        sleeve,
        (0.0, -0.072, 0.0),
    )
    assign(forearm, cuff_mat)
    cuff = link_mesh(
        "cuff",
        cylinder_mesh("cuffMesh", 0.048, 0.044, 0.034, 14),
        sleeve,
        (0.0, -0.046, 0.0),
    )
    assign(cuff, cuff_mat)
    cuff_edge = link_mesh(
        "cuffEdge",
        cylinder_mesh("cuffEdgeMesh", 0.0495, 0.0495, 0.007, 14),
        sleeve,
        (0.0, -0.030, 0.0),
    )
    assign(cuff_edge, seam)

    hand = empty("hand", root)

    wrist = link_mesh(
        "wrist",
        cylinder_mesh("wristMesh", 0.040, 0.042, 0.036, 12),
        hand,
        (0.0, -0.014, 0.0),
    )
    assign(wrist, glove)

    palm = link_mesh("palm", palm_mesh("palmMesh"), hand, (0.0, 0.0, 0.0))
    assign(palm, glove)

    thenar = link_mesh(
        "thenar",
        pad_mesh(
            "thenarMesh",
            [
                (0.0, 0.0),
                (0.022, 0.010),
                (0.036, 0.032),
                (0.028, 0.058),
                (0.016, 0.074),
                (-0.002, 0.068),
                (-0.010, 0.048),
                (-0.016, 0.028),
                (-0.010, 0.008),
            ],
            0.024,
        ),
        hand,
        (0.038, PALM_LENGTH * 0.42, -0.002),
    )
    thenar.rotation_euler = (0.0, 0.0, 0.45)
    assign(thenar, glove)

    hypothenar = link_mesh(
        "hypothenar",
        pad_mesh(
            "hypothenarMesh",
            [
                (0.0, 0.0),
                (-0.014, 0.008),
                (-0.022, 0.026),
                (-0.016, 0.048),
                (-0.008, 0.060),
                (0.006, 0.054),
                (0.010, 0.034),
                (0.012, 0.016),
                (0.006, 0.004),
            ],
            0.018,
        ),
        hand,
        (-0.036, PALM_LENGTH * 0.48, -0.001),
    )
    hypothenar.rotation_euler = (0.0, 0.0, -0.25)
    assign(hypothenar, glove)

    for i, name in enumerate(FINGER_NAMES):
        spread = (i - 1.5) * (PALM_WIDTH / 4.1)
        splay = (i - 1.5) * 0.045
        build_finger(
            hand,
            name,
            FINGER_SEGMENTS[i],
            FINGER_RADII[i],
            glove,
            (spread, PALM_LENGTH, 0.0),
            splay,
        )

    thumb_base = empty("thumb_base", hand, (PALM_WIDTH / 2 - 0.004, PALM_LENGTH * 0.34, 0.002))
    thumb_base.rotation_euler = (0.20, -0.35, -0.95)

    attach = thumb_base
    for i, length in enumerate(THUMB_SEGMENTS):
        loc = (0.0, 0.0, 0.0) if i == 0 else (0.0, THUMB_SEGMENTS[i - 1], 0.0)
        joint = empty(f"thumb_j{i}", attach, loc)
        seg_r = THUMB_RADIUS * (1.0 - i * 0.11)
        seg = link_mesh(
            f"thumb_seg{i}",
            capsule_mesh(f"thumb_seg{i}Mesh", seg_r, length, 10),
            joint,
            (0.0, length / 2.0, 0.0),
        )
        assign(seg, glove)
        attach = joint

    light_data = bpy.data.lights.new(name="Key", type="AREA")
    light_data.energy = 40
    light_data.size = 1.0
    light = bpy.data.objects.new("Key", light_data)
    light.location = (0.4, -0.6, 0.5)
    bpy.context.collection.objects.link(light)

    cam_data = bpy.data.cameras.new("HandCam")
    cam = bpy.data.objects.new("HandCam", cam_data)
    cam.location = (0.15, -0.35, 0.12)
    cam.rotation_euler = (math.radians(75), 0.0, math.radians(25))
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.name in {"Key", "HandCam"}:
            continue
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root

    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_extras=True,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
    )
    print(f"Exported {GLB_PATH}")
    print(f"Saved {BLEND_PATH}")
    print(f"objects={len(bpy.data.objects)}")


build_export()
