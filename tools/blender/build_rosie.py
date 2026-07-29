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

import importlib
import math
import sys

import bpy

TOOLS = "/Users/habibi/Documents/CLAUDE/paradisegame/tools/blender"
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)

import kit  # noqa: E402

importlib.reload(kit)
from kit import arc_shell, blob, clear_scene, empty, lathe, limb, link, mat, save_and_export  # noqa: E402

# Linear-ish colour, matching how the hand script writes Base Color.
SKIN = (0.639, 0.545, 0.451, 1.0)
HAIR_RED = (0.400, 0.161, 0.063, 1.0)
HAIR_GREY = (0.427, 0.404, 0.376, 1.0)
# The crown. Halfway between the two, or the grey cap reads as a swim hat
# sitting on top of red hair instead of as hair going grey.
HAIR_CROWN = (0.400, 0.271, 0.212, 1.0)
CARD_TAN = (0.463, 0.345, 0.196, 1.0)
CARD_MUSTARD = (0.612, 0.482, 0.208, 1.0)
CARD_BURGUNDY = (0.365, 0.129, 0.157, 1.0)
CARD_BROWN = (0.286, 0.212, 0.141, 1.0)
SHIRT = (0.400, 0.353, 0.345, 1.0)
SKIRT = (0.098, 0.106, 0.129, 1.0)
SHOE = (0.220, 0.176, 0.133, 1.0)
GLASSES = (0.075, 0.075, 0.075, 1.0)
# Face. Not in ASSETS.md, same class of assumption as the glove colour.
EYE = (0.055, 0.045, 0.040, 1.0)
BROW = (0.208, 0.161, 0.129, 1.0)
MOUTH = (0.341, 0.161, 0.153, 1.0)
CIGARETTE = (0.878, 0.867, 0.831, 1.0)
EMBER = (1.000, 0.290, 0.090, 1.0)

HEIGHT_HIP = 0.96
HEIGHT_SHOULDER = 1.34
HEIGHT_HEAD = 1.50


def build_export() -> None:
    clear_scene()

    m_skin = mat("skin", SKIN, 0.72)
    m_hair_red = mat("hair_red", HAIR_RED, 0.85)
    m_hair_grey = mat("hair_grey", HAIR_GREY, 0.88)
    m_hair_crown = mat("hair_crown_mat", HAIR_CROWN, 0.88)
    m_tan = mat("cardigan_tan", CARD_TAN, 0.96)
    m_mustard = mat("cardigan_mustard", CARD_MUSTARD, 0.96)
    m_burgundy = mat("cardigan_burgundy", CARD_BURGUNDY, 0.96)
    m_brown = mat("cardigan_brown", CARD_BROWN, 0.96)
    m_shirt = mat("shirt", SHIRT, 0.9)
    m_skirt = mat("skirt", SKIRT, 0.92)
    m_shoe = mat("shoe", SHOE, 0.62)
    m_glasses = mat("glasses", GLASSES, 0.28)
    m_eye = mat("eye", EYE, 0.32)
    m_brow = mat("brow", BROW, 0.9)
    m_mouth = mat("mouth", MOUTH, 0.7)
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
        # Barely proud of the knit. At 0.004 out and 0.010 thick they read as
        # plates bolted to a barrel rather than as panels knitted into it.
        prof = [
            (card_radius(z - half) + 0.0012, z - half),
            (card_radius(z) + 0.0018, z),
            (card_radius(z + half) + 0.0012, z + half),
        ]
        link(
            f"patch_{i}",
            arc_shell(f"patch_{i}_m", prof, 0.005, angle - math.radians(18.0), angle + math.radians(18.0), 10),
            chest,
            material,
        )

    # Arms. Sleeves to the wrist, hands bare.
    for side, tag in ((-1, "l"), (1, "r")):
        shoulder = empty(f"arm_{tag}_0", chest, (side * 0.198, 0.0, HEIGHT_SHOULDER - HEIGHT_HIP - 0.015))
        shoulder.rotation_euler = (math.radians(4.0), -side * math.radians(11.0), 0.0)

        """
        Deltoid. The elbow and the wrist both get a bridging lathe and the
        shoulder did not, which is why the arms read as detached once she was
        standing in a room rather than being looked at in Blender.

        The cardigan is a shell, not a solid, and its outer radius is 0.238
        against the torso's 0.216. So the sleeve crosses that shell on its way
        out and its top cap ends up floating outside the knit with the shell
        curving away inboard above it. You see straight through the join. This
        cap is wide enough to bridge from under the shell out to the sleeve.
        """
        link(
            f"deltoid_{tag}",
            lathe(
                f"deltoid_{tag}_m",
                [(0.0, -0.070), (0.048, -0.052), (0.072, -0.020), (0.078, 0.010), (0.062, 0.042), (0.0, 0.066)],
                12,
            ),
            shoulder,
            m_tan,
        )

        link(f"upperarm_{tag}", limb(f"upperarm_{tag}_m", 0.066, 0.052, 0.27), shoulder, m_tan)

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
            """
            Slightly over life size, and the ember more so.

            A 4mm cigarette is correct and it is also two pixels at the distance
            the player stands to talk to her, which makes the one prop BRIEF.md
            gives her invisible. The ember is what actually carries it, so it is
            the part that is pushed hardest.
            """
            link("cig_stick", lathe("cig_stick_m", [(0.0, 0.0), (0.0058, 0.003), (0.0058, 0.068), (0.0, 0.070)], 8), cig, m_cig)
            link("cig_ember", lathe("cig_ember_m", [(0.0, 0.068), (0.0072, 0.071), (0.0066, 0.080), (0.0, 0.083)], 8), cig, m_ember)

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
        m_hair_crown,
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
        (0.0, 0.098, -0.008),
    )
    nose.scale = (1.0, 1.5, 1.0)

    """
    Eyes, brows and a mouth.

    The head was a blank ovoid until she was actually placed, and BRIEF.md has
    the player standing close enough to talk to her, so a face that is only a
    nose reads as unfinished rather than as stylised.

    They are squashed spheres laid on the skull surface, not sockets cut into
    it. Sockets want a boolean and a boolean wants topology this mesh does not
    have. At conversation distance the difference does not survive.

    The skull is scaled 1.12 in Y, so its front surface at eye height sits at
    about y 0.097 and everything here is placed just proud of that.

    They read on colour, not on relief. Everything here is only a few
    millimetres proud, because a feature modelled deep enough to read in a clay
    render is a lump on the face once it is the same colour as the skin.

    The skin-coloured brow ridge that used to sit at z 0.026 is gone. It was
    there because there was nothing else on the face, and with real eyebrows
    above real eyes it became a third shelf between them.
    """
    face_bits = [
        ("eye_l", m_eye, (-0.042, 0.090, 0.014), 0.015, (1.35, 0.50, 0.66)),
        ("eye_r", m_eye, (0.042, 0.090, 0.014), 0.015, (1.35, 0.50, 0.66)),
        ("brow_l", m_brow, (-0.042, 0.090, 0.036), 0.015, (2.00, 0.26, 0.20)),
        ("brow_r", m_brow, (0.042, 0.090, 0.036), 0.015, (2.00, 0.26, 0.20)),
        ("mouth", m_mouth, (0.0, 0.090, -0.052), 0.013, (2.00, 0.36, 0.34)),
    ]
    for name, material, loc, radius, scale in face_bits:
        obj = link(name, blob(f"{name}_m", radius), head, material, loc)
        obj.scale = scale

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

    save_and_export(root, "rosie.blend", "rosie.glb", skip={"Key", "RosieCam"})


build_export()
