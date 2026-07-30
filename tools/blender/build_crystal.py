"""
Build Crystal and export glTF.

Run inside Blender via MCP, same as the others. Helpers live in kit.py.

Proportions from images/characters/crystal-sheet.png: 28, petite, blonde
shoulder-length wave with a fringe, cream floral tea dress with cap sleeves and
a V neck, flared skirt above the knee, cream low block heels, a thin gold chain,
a bracelet on her right wrist.

ASSETS.md rates her **"full, very close"**, the only character in the game rated
that high, because the player crouches over her and turns her head. It also asks
for "twelve hours dead. Lividity and rigor visible."

## She is built standing and laid down by the runtime

Every helper in kit.py lathes around Z and runs limbs down -Z, so modelling her
already horizontal would mean fighting the whole toolkit. She is built upright in
the same convention as Rosie and Moretti, with the pose baked into the joint
rotations, and `crystal.ts` rotates the root to lay her on the bed.

The pose is baked rather than driven because she never moves. There is no idle,
no head tracking and no clip: she is a prop with a very good silhouette.

## What twelve hours does, and what of it is visible

Rigor is why the pose is not slack. The limbs are set, the fingers are not
curled, and nothing sags.

Lividity is the part that is easy to get wrong. Blood settles to the lowest
point, and she is on her back, so the pooling is against the bedspread where
nobody can see it. What the player can see from above is her hands, which are
dependent over the edge of the arm, and the pallor everywhere else. So the skin
is waxy and pale and the hands carry the colour. Nothing here is gory.

The temple is deliberately hard to see. BRIEF.md: "Blunt trauma, left temple,
under the hair." If it reads from the doorway, the examine has nothing to tell
you.
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
# Pale and waxy. A living version of her would be warmer than this.
SKIN = (0.612, 0.549, 0.494, 1.0)
# Hands and the lower forearms, where the blood has gone.
LIVID = (0.435, 0.376, 0.400, 1.0)
HAIR = (0.541, 0.475, 0.361, 1.0)
HAIR_DEEP = (0.435, 0.372, 0.271, 1.0)
# ROOM_1A.crystalDress, #E8E2D6. The floral is a texture and it is not here yet.
DRESS = (0.910, 0.886, 0.839, 1.0)
DRESS_SHADE = (0.839, 0.808, 0.753, 1.0)
SHOE = (0.878, 0.847, 0.780, 1.0)
GOLD = (0.722, 0.588, 0.310, 1.0)
LASH = (0.208, 0.169, 0.145, 1.0)
LIP = (0.541, 0.404, 0.388, 1.0)
# The temple. Dark, small, and mostly under the fringe.
BRUISE = (0.267, 0.180, 0.196, 1.0)

# She is 1.62 and slight, against Rosie's 1.62 heavy and Moretti's 1.82.
HEIGHT_HIP = 0.93
HEIGHT_SHOULDER = 1.30
HEIGHT_HEAD = 1.47

UPPER_ARM = 0.27
FOREARM = 0.24
THIGH = 0.42
SHIN = 0.40


def build_export() -> None:
    clear_scene()

    m_skin = mat("skin", SKIN, 0.74)
    m_livid = mat("livid", LIVID, 0.76)
    m_hair = mat("hair", HAIR, 0.82)
    m_hair_deep = mat("hair_deep", HAIR_DEEP, 0.84)
    m_dress = mat("dress", DRESS, 0.88)
    m_dress_shade = mat("dress_shade", DRESS_SHADE, 0.88)
    m_shoe = mat("shoe", SHOE, 0.6)
    m_gold = mat("gold", GOLD, 0.34, None)
    m_lash = mat("lash", LASH, 0.6)
    m_lip = mat("lip", LIP, 0.7)
    m_bruise = mat("bruise", BRUISE, 0.8)

    root = empty("crystal_root")
    hips = empty("hips", root, (0.0, 0.0, HEIGHT_HIP))
    chest = empty("chest", hips, (0.0, 0.0, 0.0))

    # === Legs ===
    # Rigor, so they are straight and slightly apart rather than relaxed.

    for side, tag in ((-1, "l"), (1, "r")):
        hip = empty(f"leg_{tag}_0", hips, (side * 0.072, 0.0, -0.05))
        hip.rotation_euler = (0.0, -side * math.radians(3.5), 0.0)
        link(f"thigh_{tag}", limb(f"thigh_{tag}_m", 0.072, 0.055, THIGH), hip, m_skin)
        joint(f"knee_{tag}", 0.050, hip, m_skin, (0.0, 0.0, -THIGH + 0.01))

        knee = empty(f"leg_{tag}_1", hip, (0.0, 0.0, -THIGH))
        link(f"shin_{tag}", limb(f"shin_{tag}_m", 0.055, 0.038, SHIN), knee, m_skin)

        ankle = empty(f"foot_{tag}", knee, (0.0, 0.0, -SHIN))
        # Low block heel, per the sheet. Court shoe, rounded toe, small bow.
        shoe = link(
            f"shoe_{tag}",
            lathe(
                f"shoe_{tag}_m",
                [(0.0, -0.004), (0.040, 0.004), (0.048, 0.028), (0.044, 0.056), (0.030, 0.074), (0.0, 0.080)],
                12,
            ),
            ankle,
            m_shoe,
            (0.0, 0.032, -0.062),
        )
        shoe.scale = (1.0, 1.75, 1.0)
        heel = link(f"heel_{tag}", blob(f"heel_{tag}_m", 0.020, 8), ankle, m_shoe, (0.0, -0.032, -0.070))
        heel.scale = (1.0, 0.9, 1.5)
        bow = link(f"bow_{tag}", blob(f"bow_{tag}_m", 0.012, 8), ankle, m_shoe, (0.0, 0.058, -0.018))
        bow.scale = (1.6, 0.55, 0.45)

    # === Dress ===
    # A tea dress is a fitted bodice and a flared skirt, and the flare is the
    # whole silhouette. One lathe, because it is a body of revolution.

    """
    The skirt is flattened, and that is the single most important number on her.

    A lathed cone is a lampshade. Standing that reads as a stiff A line and you
    forgive it; lying on her back it is unmistakable, because fabric on a bed
    collapses onto the bed and hers was holding a perfect bell forty centimetres
    off the mattress. Squashing it along her front-to-back axis is what turns a
    solid of revolution into cloth that has given up.
    """
    skirt = link(
        "skirt",
        lathe(
            "skirt_m",
            [
                (0.0, 0.0),
                (0.226, 0.002),
                (0.234, 0.020),
                (0.228, 0.046),
                (0.186, 0.148),
                (0.158, 0.236),
                (0.141, 0.300),
                (0.134, 0.336),
            ],
            22,
            close_bottom=False,
        ),
        root,
        m_dress,
        (0.0, 0.0, 0.58),
    )
    skirt.scale = (1.06, 0.58, 1.0)

    # Bodice. Narrow at the waist and it is the waist that says petite.
    torso = link(
        "torso",
        lathe(
            "torso_m",
            [
                (0.0, -0.09),
                (0.128, -0.06),
                (0.134, 0.0),
                (0.126, 0.07),
                (0.122, 0.14),
                (0.136, 0.24),
                (0.142, 0.31),
                (0.126, 0.37),
                (0.0, 0.40),
            ],
            22,
        ),
        chest,
        m_dress,
    )
    torso.scale = (1.08, 0.86, 1.0)

    """
    The V neck.

    A shallow cone of skin let into the front of the bodice, rather than a hole
    cut in it, for the same reason the faces are laid on and not booleaned: the
    bodice is a lathe and a boolean wants topology it has not got. From the
    angles the player sees her at, an inset panel and a cut are the same thing.
    """
    vee = link(
        "neckline",
        lathe("neckline_m", [(0.0, -0.075), (0.044, -0.030), (0.058, 0.010), (0.060, 0.028)], 12, close_top=False),
        chest,
        m_skin,
        (0.0, 0.070, 0.302),
    )
    vee.scale = (1.30, 0.32, 1.0)

    # Cap sleeves. Short, and they sit on the shoulder rather than round the arm.
    for side, tag in ((-1, "l"), (1, "r")):
        cap = link(
            f"sleeve_{tag}",
            lathe(f"sleeve_{tag}_m", [(0.062, 0.014), (0.066, -0.020), (0.060, -0.058), (0.052, -0.070)], 12, close_bottom=False, close_top=False),
            chest,
            m_dress_shade,
            (side * 0.148, 0.0, 0.300),
        )
        cap.rotation_euler = (0.0, -side * math.radians(12.0), 0.0)

    # === Arms ===
    """
    The pose, and it is the reason the room reads as staged.

    Her right arm is straight down at her side. Her left is out from the body
    with the forearm turned so the inside of the elbow faces up, which is where
    the tie is and where the needle is seated. Nobody lies like that by accident,
    and BRIEF.md's `sling` line is that nobody ties one that neatly one-handed
    either.
    """
    """
    Out is -side, not a hardcoded sign.

    R_y on a limb hanging down -Z gives (-sin, 0, -cos), so a negative Y
    rotation swings it toward +X. On her left arm that is inward across the
    chest, which is how the first pass ended up with both arms folded over her.
    Every other build script writes `-side * radians(...)` for this reason.
    """
    arm_swing = {"l": 25.0, "r": 6.0}
    arm_forward = {"l": 8.0, "r": 2.0}
    elbow_pose = {"l": math.radians(-26.0), "r": math.radians(-5.0)}

    for side, tag in ((-1, "l"), (1, "r")):
        shoulder = empty(f"arm_{tag}_0", chest, (side * 0.148, 0.0, HEIGHT_SHOULDER - HEIGHT_HIP - 0.02))
        shoulder.rotation_euler = (
            math.radians(arm_forward[tag]),
            -side * math.radians(arm_swing[tag]),
            0.0,
        )
        joint(f"deltoid_{tag}", 0.062, shoulder, m_skin, (0.0, 0.0, 0.004), 12)
        link(f"upperarm_{tag}", limb(f"upperarm_{tag}_m", 0.050, 0.040, UPPER_ARM), shoulder, m_skin)
        joint(f"elbow_{tag}", 0.041, shoulder, m_skin, (0.0, 0.0, -UPPER_ARM + 0.008))

        elbow = empty(f"arm_{tag}_1", shoulder, (0.0, 0.0, -UPPER_ARM))
        elbow.rotation_euler = (elbow_pose[tag], 0.0, 0.0)
        # The forearm goes livid toward the wrist. Blood settles to the lowest
        # point and her hands are the lowest thing a player can actually see.
        link(f"forearm_{tag}", limb(f"forearm_{tag}_m", 0.040, 0.030, FOREARM), elbow, m_skin)
        joint(f"wrist_{tag}", 0.029, elbow, m_livid, (0.0, 0.0, -FOREARM + 0.006))

        wrist = empty(f"hand_{tag}", elbow, (0.0, 0.0, -FOREARM))
        hand = link(
            f"palm_{tag}",
            lathe(f"palm_{tag}_m", [(0.0, 0.016), (0.028, 0.0), (0.033, -0.038), (0.025, -0.082), (0.0, -0.098)], 10),
            wrist,
            m_livid,
        )
        hand.scale = (1.0, 0.58, 1.0)
        # Fingers, as one block. Rigor, so they are not curled.
        fingers = link(f"fingers_{tag}", blob(f"fingers_{tag}_m", 0.028, 8), wrist, m_livid, (0.0, 0.0, -0.108))
        fingers.scale = (1.0, 0.42, 1.15)

    # Gold bracelet, right wrist, per the sheet.
    link(
        "bracelet",
        lathe("bracelet_m", [(0.030, 0.0), (0.033, 0.003), (0.033, 0.011), (0.030, 0.014)], 16, close_bottom=False, close_top=False),
        bpy.data.objects["hand_r"],
        m_gold,
        (0.0, 0.0, 0.014),
    )

    # === The tie and the needle ===
    """
    Both hang off her left arm and both are separate named nodes, because
    `main.ts` registers them as their own lookables and each has its own examine
    clip and its own evidence ID.

    The tie is above the elbow and it is still tight, which is the tell. The
    syringe is seated in the crook at an angle nobody would choose.
    """
    arm_l = bpy.data.objects["arm_l_0"]
    sling = link(
        "sling",
        lathe("sling_m", [(0.046, -0.014), (0.050, -0.010), (0.050, 0.010), (0.046, 0.014)], 14, close_bottom=False, close_top=False),
        arm_l,
        mat("rubber", (0.098, 0.094, 0.090, 1.0), 0.55),
        (0.0, 0.0, -0.150),
    )
    sling.scale = (1.0, 1.0, 1.0)
    # The tucked end. BRIEF.md: "tucked under itself", and it is the one detail
    # on her that is evidence of care rather than of violence.
    tuck = link("sling_tuck", blob("sling_tuck_m", 0.014, 8), arm_l, mat("rubber_tuck", (0.086, 0.082, 0.078, 1.0), 0.55), (0.0, 0.048, -0.150))
    tuck.scale = (1.6, 0.7, 0.5)

    needle = empty("needle", bpy.data.objects["arm_l_1"], (0.0, 0.030, -0.030))
    needle.rotation_euler = (math.radians(58.0), 0.0, math.radians(-24.0))
    m_glass = mat("syringe", (0.855, 0.867, 0.878, 1.0), 0.32)
    m_steel = mat("steel", (0.690, 0.702, 0.714, 1.0), 0.26)
    link("needle_barrel", lathe("needle_barrel_m", [(0.0, 0.0), (0.0075, 0.003), (0.0075, 0.062), (0.0, 0.065)], 10), needle, m_glass)
    link("needle_plunger", lathe("needle_plunger_m", [(0.0, 0.062), (0.011, 0.066), (0.011, 0.074), (0.0, 0.077)], 10), needle, m_glass)
    link("needle_tip", lathe("needle_tip_m", [(0.0035, 0.0), (0.0035, -0.004), (0.0009, -0.030), (0.0, -0.032)], 8), needle, m_steel)

    # === Head ===

    link("neck", limb("neck_m", 0.046, 0.043, 0.085), chest, m_skin, (0.0, 0.0, 0.42))
    head = empty("head", chest, (0.0, 0.0, HEIGHT_HEAD - HEIGHT_HIP))

    skull = link(
        "skull",
        lathe(
            "skull_m",
            [
                (0.0, -0.104),
                (0.054, -0.092),
                (0.076, -0.060),
                (0.089, -0.019),
                (0.094, 0.021),
                (0.083, 0.061),
                (0.052, 0.090),
                (0.0, 0.102),
            ],
            18,
        ),
        head,
        m_skin,
    )
    skull.scale = (0.97, 1.10, 1.0)

    """
    Hair. Three pieces, same reasoning as Rosie's two.

    A full revolve down to the hairline is a swim cap, so the crown is a cap
    above it, the length is an arc open at the face, and the fringe is a short
    arc across the forehead. The sheet has a soft shoulder-length wave with a
    fringe, and the fringe matters twice over: it is most of what makes her read
    as 1994, and it is what half hides the temple.
    """
    cap = link(
        "hair_crown",
        lathe("hair_crown_m", [(0.096, 0.028), (0.091, 0.058), (0.058, 0.090), (0.0, 0.106)], 18, close_bottom=False),
        head,
        m_hair,
    )
    cap.scale = (1.03, 1.10, 1.0)

    face_gap = math.radians(122.0)
    h0 = math.pi / 2 + face_gap / 2
    h1 = math.pi / 2 + 2 * math.pi - face_gap / 2
    falls = link(
        "hair_length",
        arc_shell(
            "hair_length_m",
            [(0.072, -0.150), (0.086, -0.110), (0.096, -0.060), (0.101, -0.008), (0.099, 0.036), (0.092, 0.066)],
            0.020,
            h0,
            h1,
            20,
        ),
        head,
        m_hair,
    )
    falls.scale = (1.04, 1.11, 1.0)

    # The fringe. A short arc across the front, under the crown.
    fringe = link(
        "hair_fringe",
        arc_shell(
            "hair_fringe_m",
            [(0.090, 0.010), (0.096, 0.040), (0.092, 0.064)],
            0.014,
            math.pi / 2 - math.radians(62.0),
            math.pi / 2 + math.radians(62.0),
            12,
        ),
        head,
        m_hair_deep,
    )
    fringe.scale = (1.04, 1.11, 1.0)

    nose = link(
        "nose",
        lathe("nose_m", [(0.0, -0.026), (0.011, -0.015), (0.013, 0.0), (0.009, 0.014), (0.0, 0.020)], 8),
        head,
        m_skin,
        (0.0, 0.095, -0.008),
    )
    nose.scale = (1.0, 1.45, 1.0)

    """
    The face, and she is dead, so it is closed.

    Eyes shut rather than open. It is the truthful choice at twelve hours and it
    is also the kinder one: a corpse with open eyes staring at a player who is
    crouched over her turns the scene into a horror beat, and BRIEF.md wants the
    room to read as beautiful and the violence to be over.

    The lids are skin, slightly proud, with a lash line under them. The mouth is
    barely parted.
    """
    for name, material, loc, radius, scale in (
        ("lid_l", m_skin, (-0.040, 0.090, 0.014), 0.016, (1.30, 0.50, 0.50)),
        ("lid_r", m_skin, (0.040, 0.090, 0.014), 0.016, (1.30, 0.50, 0.50)),
        ("lash_l", m_lash, (-0.040, 0.091, 0.005), 0.015, (1.25, 0.36, 0.14)),
        ("lash_r", m_lash, (0.040, 0.091, 0.005), 0.015, (1.25, 0.36, 0.14)),
        ("brow_l", m_hair_deep, (-0.040, 0.089, 0.036), 0.015, (1.70, 0.26, 0.17)),
        ("brow_r", m_hair_deep, (0.040, 0.089, 0.036), 0.015, (1.70, 0.26, 0.17)),
        ("mouth", m_lip, (0.0, 0.089, -0.046), 0.013, (1.75, 0.30, 0.30)),
    ):
        obj = link(name, blob(f"{name}_m", radius), head, material, loc)
        obj.scale = scale

    """
    The temple.

    Her left, which is -X, and it is meant to be nearly invisible: BRIEF.md puts
    it "under the hair", and the whole point of the examine is that Miller finds
    something the room does not advertise. If you can see this from the doorway
    it is too big or too dark.
    """
    temple = link("temple_wound", blob("temple_wound_m", 0.019, 10), head, m_bruise, (-0.077, 0.040, 0.026))
    temple.scale = (0.5, 1.15, 1.05)

    # Small gold studs, per the sheet.
    for side, tag in ((-1, "l"), (1, "r")):
        stud = link(f"earring_{tag}", blob(f"earring_{tag}_m", 0.008, 6), head, m_gold, (side * 0.091, 0.010, -0.050))
        stud.scale = (0.7, 1.0, 1.0)

    # Thin chain, per the sheet. A ring at the base of the throat.
    chain = link(
        "necklace",
        lathe("necklace_m", [(0.052, 0.0), (0.055, 0.002), (0.055, 0.008), (0.052, 0.010)], 20, close_bottom=False, close_top=False),
        chest,
        m_gold,
        (0.0, 0.0, 0.395),
    )
    chain.scale = (1.06, 0.9, 1.0)

    # Viewport only. Excluded from the export selection.
    light_data = bpy.data.lights.new(name="Key", type="AREA")
    light_data.energy = 130
    light_data.size = 2.0
    light = bpy.data.objects.new("Key", light_data)
    light.location = (1.2, -1.8, 2.4)
    bpy.context.collection.objects.link(light)

    cam_data = bpy.data.cameras.new("CrystalCam")
    cam = bpy.data.objects.new("CrystalCam", cam_data)
    cam.location = (0.5, 2.4, 1.45)
    cam.rotation_euler = (math.radians(86), 0.0, math.radians(192))
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    save_and_export(root, "crystal.blend", "crystal.glb", skip={"Key", "CrystalCam"})


build_export()
