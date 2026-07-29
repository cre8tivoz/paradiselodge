"""
Build Constable Moretti and export glTF.

Run inside Blender via MCP, same as build_rosie.py. Helpers live in kit.py.

Proportions from images/characters/moretti-sheet.png: mid thirties, average to
tall, fit without being heavy, dark short back and sides, clean shaven. Summer
uniform: pale blue short sleeve shirt with epaulettes and two chest pockets,
navy trousers, black duty belt with pouches, black boots.

ASSETS.md gives him "full, mid distance, never closer than two metres", so he
is built a notch simpler than Rosie. He gets a face anyway, because the face
work is now three lines of kit.blob and a blank head is worse than a cheap one.

**He walks, and she does not.** That is the whole difference in the rig. Rosie
is rooted at two stations and her legs never move, so she has none below the
hips. Moretti follows Miller through the building, so he has leg joints the
runtime drives: `leg_l_0` and `leg_l_1` and `foot_l`, and the same on the right.
"""

from __future__ import annotations

import importlib
import math
import sys

import bpy

TOOLS = "/Users/habibi/Documents/CLAUDE/paradisegame/tools/blender"
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)

import kit  # noqa: E402

importlib.reload(kit)
from kit import arc_shell, blob, clear_scene, empty, joint, lathe, limb, link, mat, save_and_export  # noqa: E402

# Linear-ish colour, matching how the other scripts write Base Color.
SKIN = (0.588, 0.435, 0.325, 1.0)
HAIR = (0.055, 0.043, 0.039, 1.0)
SHIRT = (0.541, 0.647, 0.792, 1.0)
# Lighter than the shirt, not darker. Darker, these read as slots cut in
# his chest and the placket and pockets together make a crucifix.
SHIRT_TRIM = (0.616, 0.722, 0.859, 1.0)
TROUSER = (0.086, 0.106, 0.180, 1.0)
LEATHER = (0.035, 0.035, 0.043, 1.0)
BOOT = (0.043, 0.043, 0.047, 1.0)
BUCKLE = (0.502, 0.510, 0.522, 1.0)
EYE = (0.043, 0.035, 0.031, 1.0)
BROW = (0.098, 0.075, 0.063, 1.0)
MOUTH = (0.365, 0.196, 0.176, 1.0)

# The section. He is 1.82, against Rosie's 1.62.
HEIGHT_HIP = 0.98
HEIGHT_SHOULDER = 1.50
HEIGHT_HEAD = 1.68

THIGH = 0.45
SHIN = 0.44
UPPER_ARM = 0.30
FOREARM = 0.27


def build_export() -> None:
    clear_scene()

    m_skin = mat("skin", SKIN, 0.68)
    m_hair = mat("hair", HAIR, 0.86)
    m_shirt = mat("shirt", SHIRT, 0.88)
    m_trim = mat("shirt_trim", SHIRT_TRIM, 0.88)
    m_trouser = mat("trouser", TROUSER, 0.92)
    m_leather = mat("leather", LEATHER, 0.55)
    m_boot = mat("boot", BOOT, 0.48)
    m_buckle = mat("buckle", BUCKLE, 0.34, None)
    m_eye = mat("eye", EYE, 0.32)
    m_brow = mat("brow", BROW, 0.9)
    m_mouth = mat("mouth", MOUTH, 0.7)

    root = empty("moretti_root")
    hips = empty("hips", root, (0.0, 0.0, HEIGHT_HIP))
    chest = empty("chest", hips, (0.0, 0.0, 0.0))

    # === Legs ===
    # Driven by the runtime, so every section hangs off a named empty rather
    # than being one welded piece the way Rosie's shins are.

    for side, tag in ((-1, "l"), (1, "r")):
        hip = empty(f"leg_{tag}_0", hips, (side * 0.092, 0.0, -0.04))
        link(f"thigh_{tag}", limb(f"thigh_{tag}_m", 0.088, 0.070, THIGH), hip, m_trouser)
        joint(f"knee_{tag}", 0.070, hip, m_trouser, (0.0, 0.0, -THIGH + 0.01))

        knee = empty(f"leg_{tag}_1", hip, (0.0, 0.0, -THIGH))
        link(f"shin_{tag}", limb(f"shin_{tag}_m", 0.070, 0.052, SHIN), knee, m_trouser)

        ankle = empty(f"foot_{tag}", knee, (0.0, 0.0, -SHIN))
        # Boot. Lathed round then stretched down the length of the foot, which
        # is what makes it a boot and not a bowl.
        boot = link(
            f"boot_{tag}",
            lathe(
                f"boot_{tag}_m",
                [(0.0, -0.005), (0.055, 0.005), (0.066, 0.040), (0.062, 0.075), (0.040, 0.098), (0.0, 0.105)],
                12,
            ),
            ankle,
            m_boot,
            (0.0, 0.045, -0.085),
        )
        boot.scale = (1.0, 1.75, 1.0)

    seat = link(
        "seat",
        lathe(
            "seat_m",
            [(0.0, -0.24), (0.105, -0.20), (0.140, -0.13), (0.152, -0.06), (0.150, 0.0), (0.0, 0.02)],
            18,
            close_top=False,
        ),
        hips,
        m_trouser,
    )
    seat.scale = (1.16, 0.88, 1.0)

    # === Torso ===
    # Lathed round and then flattened, because a chest is wider than it is deep
    # and a circular one reads as a barrel.

    torso = link(
        "torso",
        lathe(
            "torso_m",
            [
                (0.0, -0.09),
                (0.148, -0.06),
                (0.152, 0.0),
                (0.146, 0.10),
                (0.156, 0.22),
                (0.172, 0.34),
                (0.178, 0.44),
                (0.162, 0.50),
                (0.0, 0.54),
            ],
            22,
        ),
        chest,
        m_shirt,
    )
    torso.scale = (1.16, 0.88, 1.0)

    def shirt_radius(z: float) -> float:
        """Shirt outer radius at height z, so applied detail lies on it."""
        pts = [(0.152, 0.0), (0.146, 0.10), (0.156, 0.22), (0.172, 0.34), (0.178, 0.44)]
        if z <= pts[0][1]:
            return pts[0][0]
        for (r0, z0), (r1, z1) in zip(pts, pts[1:]):
            if z <= z1:
                t = (z - z0) / (z1 - z0)
                return r0 + (r1 - r0) * t
        return pts[-1][0]

    # Chest pockets and the button placket. Applied arcs, barely proud of the
    # shirt: at four millimetres out they read as plates bolted to a barrel.
    for deg in (68.0, 112.0):
        angle = math.radians(deg)
        z, half = 0.33, 0.055
        prof = [
            (shirt_radius(z - half) + 0.0012, z - half),
            (shirt_radius(z) + 0.0016, z),
            (shirt_radius(z + half) + 0.0012, z + half),
        ]
        pocket = link(
            f"pocket_{int(deg)}",
            arc_shell(f"pocket_{int(deg)}_m", prof, 0.004, angle - math.radians(11.0), angle + math.radians(11.0), 8),
            chest,
            m_trim,
        )
        pocket.scale = (1.16, 0.88, 1.0)

    placket = link(
        "placket",
        arc_shell(
            "placket_m",
            [(shirt_radius(0.02) + 0.001, 0.02), (shirt_radius(0.24) + 0.001, 0.24), (shirt_radius(0.46) + 0.001, 0.46)],
            0.004,
            math.pi / 2 - math.radians(5.0),
            math.pi / 2 + math.radians(5.0),
            4,
        ),
        chest,
        m_trim,
    )
    placket.scale = (1.16, 0.88, 1.0)

    # === Duty belt ===
    # Sits on the trousers, so it is a child of hips and not of chest.

    belt = link(
        "belt",
        lathe("belt_m", [(0.150, -0.09), (0.162, -0.075), (0.162, -0.020), (0.150, -0.005)], 22, close_bottom=False, close_top=False),
        chest,
        m_leather,
    )
    belt.scale = (1.16, 0.88, 1.0)

    buckle = link("buckle", blob("buckle_m", 0.026, 8), chest, m_buckle, (0.0, 0.140, -0.048))
    buckle.scale = (1.3, 0.45, 0.85)

    # Pouches. Two on the right hip, one on the left, per the sheet.
    for i, (deg, z, size) in enumerate(((28.0, -0.052, 0.036), (58.0, -0.055, 0.030), (152.0, -0.052, 0.033))):
        angle = math.radians(deg)
        r = 0.150
        pouch = link(
            f"pouch_{i}",
            blob(f"pouch_{i}_m", size, 8),
            chest,
            m_leather,
            (r * math.cos(angle) * 1.16, r * math.sin(angle) * 0.88, z),
        )
        pouch.scale = (1.0, 1.0, 1.35)

    # === Arms ===
    # Short sleeves, so the sleeve is a cuff over the top of the upper arm and
    # everything below mid bicep is skin.

    for side, tag in ((-1, "l"), (1, "r")):
        shoulder = empty(f"arm_{tag}_0", chest, (side * 0.196, 0.0, HEIGHT_SHOULDER - HEIGHT_HIP - 0.02))
        shoulder.rotation_euler = (math.radians(3.0), -side * math.radians(8.0), 0.0)

        joint(f"deltoid_{tag}", 0.078, shoulder, m_shirt, (0.0, 0.0, 0.006), 12)
        link(f"upperarm_{tag}", limb(f"upperarm_{tag}_m", 0.062, 0.050, UPPER_ARM), shoulder, m_skin)

        # Sleeve, ending mid bicep. Slightly proud of the arm under it.
        link(
            f"sleeve_{tag}",
            lathe(f"sleeve_{tag}_m", [(0.070, 0.010), (0.072, -0.030), (0.068, -0.105), (0.064, -0.120)], 12, close_bottom=False, close_top=False),
            shoulder,
            m_shirt,
        )

        # Epaulette. It is most of what says police in a silhouette.
        ep = link(f"epaulette_{tag}", blob(f"epaulette_{tag}_m", 0.030, 8), shoulder, m_trim, (0.0, 0.0, 0.028))
        ep.scale = (0.62, 1.5, 0.34)

        joint(f"elbow_{tag}", 0.052, shoulder, m_skin, (0.0, 0.0, -UPPER_ARM + 0.008))

        elbow = empty(f"arm_{tag}_1", shoulder, (0.0, 0.0, -UPPER_ARM))
        link(f"forearm_{tag}", limb(f"forearm_{tag}_m", 0.050, 0.040, FOREARM), elbow, m_skin)
        joint(f"wrist_{tag}", 0.038, elbow, m_skin, (0.0, 0.0, -FOREARM + 0.006))

        wrist = empty(f"hand_{tag}", elbow, (0.0, 0.0, -FOREARM))
        hand = link(
            f"palm_{tag}",
            lathe(f"palm_{tag}_m", [(0.0, 0.02), (0.036, 0.0), (0.042, -0.045), (0.032, -0.095), (0.0, -0.115)], 10),
            wrist,
            m_skin,
        )
        hand.scale = (1.0, 0.6, 1.0)

    # === Head ===

    link("neck", limb("neck_m", 0.058, 0.054, 0.10), chest, m_skin, (0.0, 0.0, 0.56))
    head = empty("head", chest, (0.0, 0.0, HEIGHT_HEAD - HEIGHT_HIP))

    skull = link(
        "skull",
        lathe(
            "skull_m",
            [
                (0.0, -0.108),
                (0.058, -0.094),
                (0.080, -0.062),
                (0.093, -0.020),
                (0.096, 0.020),
                (0.085, 0.062),
                (0.054, 0.092),
                (0.0, 0.104),
            ],
            18,
        ),
        head,
        m_skin,
    )
    skull.scale = (1.0, 1.10, 1.0)

    """
    Short back and sides, and it is still two pieces.

    A full revolve down to the hairline is a balaclava: at eye height the cap
    radius beats the skull radius, so the hair sits in front of the eyes. Same
    trap as Rosie's, same fix. The crown is a cap above the hairline where
    nothing can close over the face, and the back and sides are an arc that is
    open at the front.
    """
    cap = link(
        "hair_crown",
        lathe("hair_crown_m", [(0.098, 0.046), (0.089, 0.066), (0.056, 0.092), (0.0, 0.107)], 18, close_bottom=False),
        head,
        m_hair,
    )
    cap.scale = (1.02, 1.11, 1.0)

    face_gap = math.radians(124.0)
    h0 = math.pi / 2 + face_gap / 2
    h1 = math.pi / 2 + 2 * math.pi - face_gap / 2
    sides = link(
        "hair_sides",
        arc_shell("hair_sides_m", [(0.094, -0.030), (0.098, 0.006), (0.099, 0.030), (0.096, 0.052)], 0.008, h0, h1, 18),
        head,
        m_hair,
    )
    sides.scale = (1.02, 1.11, 1.0)

    nose = link(
        "nose",
        lathe("nose_m", [(0.0, -0.030), (0.014, -0.018), (0.017, 0.0), (0.012, 0.016), (0.0, 0.024)], 8),
        head,
        m_skin,
        (0.0, 0.100, -0.008),
    )
    nose.scale = (1.0, 1.5, 1.0)

    for name, material, loc, radius, scale in (
        ("eye_l", m_eye, (-0.042, 0.092, 0.014), 0.015, (1.35, 0.50, 0.62)),
        ("eye_r", m_eye, (0.042, 0.092, 0.014), 0.015, (1.35, 0.50, 0.62)),
        ("brow_l", m_brow, (-0.042, 0.092, 0.038), 0.016, (2.10, 0.26, 0.24)),
        ("brow_r", m_brow, (0.042, 0.092, 0.038), 0.016, (2.10, 0.26, 0.24)),
        ("mouth", m_mouth, (0.0, 0.092, -0.050), 0.013, (2.00, 0.34, 0.30)),
    ):
        obj = link(name, blob(f"{name}_m", radius), head, material, loc)
        obj.scale = scale

    # Viewport only. Excluded from the export selection.
    light_data = bpy.data.lights.new(name="Key", type="AREA")
    light_data.energy = 140
    light_data.size = 2.0
    light = bpy.data.objects.new("Key", light_data)
    light.location = (1.2, -1.8, 2.6)
    bpy.context.collection.objects.link(light)

    cam_data = bpy.data.cameras.new("MorettiCam")
    cam = bpy.data.objects.new("MorettiCam", cam_data)
    cam.location = (0.6, 2.6, 1.6)
    cam.rotation_euler = (math.radians(86), 0.0, math.radians(193))
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    save_and_export(root, "moretti.blend", "moretti.glb", skip={"Key", "MorettiCam"})


build_export()
