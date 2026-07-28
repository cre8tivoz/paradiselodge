"""
Build Rosie Lodge and export glTF.

Run inside Blender via MCP, same as build_miller_hand.py.

Coordinate convention (Blender Z-up), matching the hand:
  she faces +Y   →  Three -Z, which is three.js default forward
  her right is +X →  stays +X, so the cigarette hand is +X in Three too
  up is +Z       →  Three +Y

Lathed profiles rather than stacked capsules. A capsule figure reads as a
snowman at conversation distance, and BRIEF.md has the player standing close
enough to talk to her. The silhouette is the whole job.

Named empties match what the runtime looks up after load. glTF strips dots, so
names use underscores.

Proportions from images/characters/rosie-sheet.png: mid fifties, average
height, heavy through the middle, shoulder length red gone half grey, reading
glasses pushed up, hand-knitted cardigan worn open, dark skirt below the knee,
flat shoes, lit cigarette low in her right hand.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy

OUT_DIR = Path("/Users/habibi/Documents/CLAUDE/paradisegame/public/models")
BLEND_PATH = Path("/Users/habibi/Documents/CLAUDE/paradisegame/assets/blender/rosie.blend")
GLB_PATH = OUT_DIR / "rosie.glb"

# Linear-ish colour, matching how the hand script writes Base Color.
SKIN = (0.639, 0.545, 0.451, 1.0)
HAIR_RED = (0.400, 0.161, 0.063, 1.0)
HAIR_GREY = (0.427, 0.404, 0.376, 1.0)
CARD_TAN = (0.463, 0.345, 0.196, 1.0)
CARD_MUSTARD = (0.612, 0.482, 0.208, 1.0)
CARD_BURGUNDY = (0.365, 0.129, 0.157, 1.0)
CARD_BROWN = (0.286, 0.212, 0.141, 1.0)
SHIRT = (0.400, 0.353, 0.345, 1.0)
SKIRT = (0.098, 0.106, 0.129, 1.0)
SHOE = (0.220, 0.176, 0.133, 1.0)
GLASSES = (0.075, 0.075, 0.075, 1.0)
CIGARETTE = (0.878, 0.867, 0.831, 1.0)
EMBER = (1.000, 0.290, 0.090, 1.0)

HEIGHT_HIP = 0.96
HEIGHT_SHOULDER = 1.34
HEIGHT_HEAD = 1.50


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
        for item in list(block):
            block.remove(item)


def mat(name: str, colour, roughness: float, emissive=None) -> bpy.types.Material:
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
        bsdf.inputs["Specular IOR Level"].default_value = 0.3
    if emissive is not None:
        bsdf.inputs["Emission Color"].default_value = emissive
        bsdf.inputs["Emission Strength"].default_value = 3.0
    return m


def empty(name: str, parent=None, loc=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.03
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def link(name: str, mesh, parent, material, loc=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)
    return obj


def lathe(name: str, profile, segs: int = 20, close_bottom=True, close_top=True):
    """Revolve a (radius, z) profile around Z. Radius 0 collapses to a pole."""
    mesh = bpy.data.meshes.new(name)
    verts: list[tuple[float, float, float]] = []
    faces: list[list[int]] = []
    rings: list[list[int]] = []

    for radius, z in profile:
        if radius <= 1e-6:
            idx = len(verts)
            verts.append((0.0, 0.0, z))
            rings.append([idx] * segs)
            continue
        ring = []
        for i in range(segs):
            a = 2.0 * math.pi * i / segs
            ring.append(len(verts))
            verts.append((radius * math.cos(a), radius * math.sin(a), z))
        rings.append(ring)

    for lower, upper in zip(rings, rings[1:]):
        for i in range(segs):
            j = (i + 1) % segs
            a, b, c, d = lower[i], lower[j], upper[j], upper[i]
            quad = [v for k, v in enumerate([a, b, c, d]) if v != [a, b, c, d][k - 1]]
            if len(set([a, b, c, d])) >= 3:
                faces.append([a, b, c, d] if len(set([a, b, c, d])) == 4 else list(dict.fromkeys([a, b, c, d])))

    if close_bottom and len(set(rings[0])) > 1:
        faces.append(list(reversed(rings[0])))
    if close_top and len(set(rings[-1])) > 1:
        faces.append(list(rings[-1]))

    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.update()
    return mesh


def arc_shell(name: str, profile, thickness: float, a0: float, a1: float, segs: int = 18):
    """
    An open shell swept between two angles. This is the cardigan: worn open, so
    it is an arc and not a tube, and it has real thickness at the front edges
    where a knit would.
    """
    mesh = bpy.data.meshes.new(name)
    verts: list[tuple[float, float, float]] = []
    faces: list[list[int]] = []
    outer_rings: list[list[int]] = []
    inner_rings: list[list[int]] = []

    for radius, z in profile:
        outer, inner = [], []
        for i in range(segs + 1):
            a = a0 + (a1 - a0) * i / segs
            ca, sa = math.cos(a), math.sin(a)
            outer.append(len(verts))
            verts.append((radius * ca, radius * sa, z))
        for i in range(segs + 1):
            a = a0 + (a1 - a0) * i / segs
            ca, sa = math.cos(a), math.sin(a)
            r = max(radius - thickness, 0.001)
            inner.append(len(verts))
            verts.append((r * ca, r * sa, z))
        outer_rings.append(outer)
        inner_rings.append(inner)

    for lo, up in zip(outer_rings, outer_rings[1:]):
        for i in range(segs):
            faces.append([lo[i], lo[i + 1], up[i + 1], up[i]])
    for lo, up in zip(inner_rings, inner_rings[1:]):
        for i in range(segs):
            faces.append([up[i], up[i + 1], lo[i + 1], lo[i]])

    # Front edges, top hem, bottom hem.
    for lo_o, up_o, lo_i, up_i in zip(outer_rings, outer_rings[1:], inner_rings, inner_rings[1:]):
        faces.append([lo_o[0], up_o[0], up_i[0], lo_i[0]])
        faces.append([lo_i[-1], up_i[-1], up_o[-1], lo_o[-1]])
    for i in range(segs):
        faces.append([outer_rings[0][i + 1], outer_rings[0][i], inner_rings[0][i], inner_rings[0][i + 1]])
        faces.append([inner_rings[-1][i + 1], inner_rings[-1][i], outer_rings[-1][i], outer_rings[-1][i + 1]])

    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.update()
    return mesh


def limb(name: str, r0: float, r1: float, length: float, segs: int = 10):
    """A tapered limb section running down -Z from the joint."""
    steps = 6
    profile = []
    for i in range(steps + 1):
        t = i / steps
        # Round the far end off so wrists and hems do not read as cut pipe.
        radius = r0 + (r1 - r0) * t
        if t > 0.93:
            radius *= math.sqrt(max(1.0 - ((t - 0.93) / 0.07) ** 2, 0.18))
        profile.append((radius, -length * t))
    return lathe(name, profile, segs, close_bottom=False, close_top=True)


def build_export() -> None:
    clear_scene()

    m_skin = mat("skin", SKIN, 0.72)
    m_hair_red = mat("hair_red", HAIR_RED, 0.85)
    m_hair_grey = mat("hair_grey", HAIR_GREY, 0.88)
    m_tan = mat("cardigan_tan", CARD_TAN, 0.96)
    m_mustard = mat("cardigan_mustard", CARD_MUSTARD, 0.96)
    m_burgundy = mat("cardigan_burgundy", CARD_BURGUNDY, 0.96)
    m_brown = mat("cardigan_brown", CARD_BROWN, 0.96)
    m_shirt = mat("shirt", SHIRT, 0.9)
    m_skirt = mat("skirt", SKIRT, 0.92)
    m_shoe = mat("shoe", SHOE, 0.62)
    m_glasses = mat("glasses", GLASSES, 0.28)
    m_cig = mat("cigarette", CIGARETTE, 0.85)
    m_ember = mat("ember", EMBER, 0.9, emissive=EMBER)

    root = empty("rosie_root")
    hips = empty("hips", root, (0.0, 0.0, HEIGHT_HIP))
    chest = empty("chest", hips, (0.0, 0.0, 0.0))

    # Legs. Only the shins show below the hem.
    for side, tag in ((-1, "l"), (1, "r")):
        leg = empty(f"leg_{tag}", root, (side * 0.088, 0.0, 0.44))
        link(f"shin_{tag}", limb(f"shin_{tag}_m", 0.056, 0.040, 0.37), leg, m_skin)
        foot = link(
            f"shoe_{tag}",
            lathe(
                f"shoe_{tag}_m",
                [(0.0, 0.0), (0.045, 0.012), (0.052, 0.035), (0.040, 0.058), (0.0, 0.066)],
                12,
            ),
            leg,
            m_shoe,
            (0.0, 0.012, -0.40),
        )
        foot.scale = (1.0, 1.9, 1.0)

    # Skirt, A-line, hem below the knee.
    link(
        "skirt",
        lathe(
            "skirt_m",
            [
                (0.0, 0.0),
                (0.285, 0.005),
                (0.281, 0.02),
                (0.255, 0.18),
                (0.232, 0.34),
                (0.213, 0.46),
                (0.205, 0.53),
            ],
            22,
            close_bottom=False,
        ),
        root,
        m_skirt,
        (0.0, 0.0, 0.44),
    )

    # Torso. Heavy through the middle, and the profile is where that reads.
    link(
        "torso",
        lathe(
            "torso_m",
            [
                (0.0, -0.02),
                (0.200, 0.0),
                (0.214, 0.09),
                (0.216, 0.16),
                (0.203, 0.25),
                (0.196, 0.32),
                (0.186, 0.37),
                (0.155, 0.41),
                (0.0, 0.43),
            ],
            22,
        ),
        chest,
        m_shirt,
    )

    # Cardigan. Open at the front, which is +Y, so the arc has a gap there.
    gap = math.radians(30.0)
    a0 = math.pi / 2 + gap / 2
    a1 = math.pi / 2 + 2 * math.pi - gap / 2
    cardigan_profile = [
        (0.222, -0.02),
        (0.236, 0.09),
        (0.238, 0.16),
        (0.226, 0.25),
        (0.216, 0.32),
        (0.201, 0.38),
        (0.171, 0.425),
    ]
    link("cardigan", arc_shell("cardigan_m", cardigan_profile, 0.018, a0, a1, 26), chest, m_tan)

    # Knitted patches. Four fighting colours, because the sheet's cardigan is
    # meant to be genuinely ugly and one colour would read as a coat.
    def card_radius(z: float) -> float:
        """Cardigan outer radius at height z, so patches lie on it, not near it."""
        pts = cardigan_profile
        if z <= pts[0][1]:
            return pts[0][0]
        for (r0, z0), (r1, z1) in zip(pts, pts[1:]):
            if z <= z1:
                t = (z - z0) / (z1 - z0)
                return r0 + (r1 - r0) * t
        return pts[-1][0]

    patches = [
        (m_burgundy, 128.0, 0.29, 0.052),
        (m_mustard, 212.0, 0.16, 0.060),
        (m_brown, 292.0, 0.24, 0.048),
        (m_mustard, 416.0, 0.10, 0.055),
        (m_burgundy, 340.0, 0.07, 0.045),
    ]
    for i, (material, deg, z, half) in enumerate(patches):
        angle = math.radians(deg)
        prof = [
            (card_radius(z - half) + 0.003, z - half),
            (card_radius(z) + 0.004, z),
            (card_radius(z + half) + 0.003, z + half),
        ]
        link(
            f"patch_{i}",
            arc_shell(f"patch_{i}_m", prof, 0.010, angle - math.radians(13.0), angle + math.radians(13.0), 8),
            chest,
            material,
        )

    # Arms. Sleeves to the wrist, hands bare.
    for side, tag in ((-1, "l"), (1, "r")):
        shoulder = empty(f"arm_{tag}_0", chest, (side * 0.207, 0.0, HEIGHT_SHOULDER - HEIGHT_HIP - 0.015))
        shoulder.rotation_euler = (math.radians(4.0), -side * math.radians(11.0), 0.0)
        link(f"upperarm_{tag}", limb(f"upperarm_{tag}_m", 0.062, 0.052, 0.27), shoulder, m_tan)

        link(f"elbow_{tag}", lathe(f"elbow_{tag}_m", [(0.0, -0.052), (0.036, -0.030), (0.052, 0.0), (0.036, 0.030), (0.0, 0.052)], 10), shoulder, m_tan, (0.0, 0.0, -0.265))

        elbow = empty(f"arm_{tag}_1", shoulder, (0.0, 0.0, -0.27))
        link(f"forearm_{tag}", limb(f"forearm_{tag}_m", 0.052, 0.040, 0.24), elbow, m_tan)

        link(f"wrist_{tag}", lathe(f"wrist_{tag}_m", [(0.0, -0.038), (0.026, -0.022), (0.038, 0.0), (0.026, 0.022), (0.0, 0.038)], 10), elbow, m_skin, (0.0, 0.0, -0.236))

        wrist = empty(f"hand_{tag}", elbow, (0.0, 0.0, -0.24))
        hand = link(
            f"palm_{tag}",
            lathe(f"palm_{tag}_m", [(0.0, 0.02), (0.032, 0.0), (0.038, -0.04), (0.030, -0.085), (0.0, -0.105)], 10),
            wrist,
            m_skin,
        )
        hand.scale = (1.0, 0.62, 1.0)

        # Cigarette, low, in her right hand. Facing +Y, her right is +X.
        if side == 1:
            cig = empty("cig", wrist, (0.012, 0.030, -0.055))
            cig.rotation_euler = (math.radians(74.0), 0.0, math.radians(-18.0))
            link("cig_stick", lathe("cig_stick_m", [(0.0, 0.0), (0.0042, 0.002), (0.0042, 0.062), (0.0, 0.064)], 8), cig, m_cig)
            link("cig_ember", lathe("cig_ember_m", [(0.0, 0.064), (0.0045, 0.066), (0.0042, 0.072), (0.0, 0.074)], 8), cig, m_ember)

    # Neck and head.
    link("neck", limb("neck_m", 0.052, 0.048, 0.09), chest, m_skin, (0.0, 0.0, 0.50))
    head = empty("head", chest, (0.0, 0.0, HEIGHT_HEAD - HEIGHT_HIP))

    skull = link(
        "skull",
        lathe(
            "skull_m",
            [
                (0.0, -0.105),
                (0.056, -0.092),
                (0.078, -0.060),
                (0.091, -0.020),
                (0.094, 0.020),
                (0.083, 0.062),
                (0.052, 0.092),
                (0.0, 0.104),
            ],
            18,
        ),
        head,
        m_skin,
    )
    skull.scale = (1.0, 1.12, 1.0)

    """
    Hair in two pieces, and neither is a full revolution.

    A lathed shell around a head is a helmet: it closes over the face. The
    crown is a cap that comes down to the hairline all round, and the length is
    an arc that is open at the front, which is +Y.
    """
    cap = link(
        "hair_crown",
        lathe(
            "hair_crown_m",
            [(0.096, 0.082), (0.086, 0.100), (0.056, 0.116), (0.0, 0.124)],
            18,
            close_bottom=False,
        ),
        head,
        m_hair_grey,
    )
    cap.scale = (1.03, 1.13, 1.0)

    face_gap = math.radians(112.0)
    h0 = math.pi / 2 + face_gap / 2
    h1 = math.pi / 2 + 2 * math.pi - face_gap / 2
    falls = link(
        "hair_length",
        arc_shell(
            "hair_length_m",
            [(0.086, -0.215), (0.098, -0.155), (0.104, -0.080), (0.107, -0.010), (0.106, 0.042), (0.099, 0.078), (0.088, 0.098)],
            0.020,
            h0,
            h1,
            20,
        ),
        head,
        m_hair_red,
    )
    falls.scale = (1.03, 1.13, 1.0)

    nose = link(
        "nose",
        lathe("nose_m", [(0.0, -0.030), (0.013, -0.018), (0.016, 0.0), (0.011, 0.016), (0.0, 0.024)], 8),
        head,
        m_skin,
        (0.0, 0.098, -0.012),
    )
    nose.scale = (1.0, 1.5, 1.35)

    brow = link(
        "brow",
        lathe("brow_m", [(0.0, -0.008), (0.030, -0.004), (0.030, 0.006), (0.0, 0.010)], 10),
        head,
        m_skin,
        (0.0, 0.086, 0.026),
    )
    brow.scale = (2.5, 0.9, 1.0)

    # Reading glasses pushed up, in all three views of the sheet.
    glasses = link(
        "glasses",
        lathe("glasses_m", [(0.103, 0.0), (0.107, 0.004), (0.107, 0.013), (0.103, 0.017)], 20, close_bottom=False, close_top=False),
        head,
        m_glasses,
        (0.0, -0.006, 0.055),
    )
    glasses.scale = (1.02, 1.14, 1.0)

    # Viewport only. Excluded from the export selection below.
    light_data = bpy.data.lights.new(name="Key", type="AREA")
    light_data.energy = 120
    light_data.size = 2.0
    light = bpy.data.objects.new("Key", light_data)
    light.location = (1.2, -1.8, 2.4)
    bpy.context.collection.objects.link(light)

    cam_data = bpy.data.cameras.new("RosieCam")
    cam = bpy.data.objects.new("RosieCam", cam_data)
    cam.location = (0.6, -2.2, 1.5)
    cam.rotation_euler = (math.radians(86), 0.0, math.radians(16))
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.name in {"Key", "RosieCam"}:
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
