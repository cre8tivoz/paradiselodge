"""
Build room 1A in Blender and save assets/blender/room1a.blend.

Run inside Blender via MCP, same as the character scripts:

    exec(open('tools/blender/build_room1a.py').read())

Reset step 4. This replaces the kit boxes in `src/world/room1a.ts` with a real
room shell and the sourced furniture from `assets/sourced/`. Step 5 bakes it,
step 6 exports it, step 7 rewires the lookables to the loaded mesh names.

## The layout is the code's, not a fresh read of the mood board

`images/mood/1a-wide.png` is the look target and the arrangement here matches
it: door in one corner with the leaf open into the room, sash opposite with the
light coming through it, wardrobe on the blind wall, dresser under the street
window, iron single bed along the far wall with the sun crossing it, two chairs
and a rug in the beam.

Every number, though, is lifted out of `room1a.ts`, because that layout was
already derived from these images and because half of it is load bearing
elsewhere. Crystal is placed against the headboard by arithmetic in
`crystal.ts`. The sash opening has to line up with `FIRST_WINDOW` in `lodge.ts`.
The collision solids and the walkable floor are baked off these same extents.
Rearranging to taste here would cost a day of putting all of that back and would
not make the room look any more like the photograph.

## Axes

Blender is Z-up and three is Y-up, so this builds in room-local three space with
the standard swap, and `export_yup` puts it back on export:

    three (x, y, z)  ->  blender (x, -z, y)

So in here: the hall door is at +Y, the verandah and its sash are at -Y, the
street window is in the +X wall, up is +Z and the floor is z = 0.
"""

from __future__ import annotations

import math
import os

import bpy
import mathutils

ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"
SOURCED = f"{ROOT}/assets/sourced"
TEXTURES = f"{ROOT}/public/textures"
PBR = f"{TEXTURES}/pbr"
OUT_BLEND = f"{ROOT}/assets/blender/room1a.blend"
HDRI = f"{ROOT}/public/env/balcony_2k.hdr"

# ---------------------------------------------------------------------------
# Room extents. These are room1a.ts's, unchanged. Change them there first.
# ---------------------------------------------------------------------------

WIDTH = 5.2
DEPTH = 4.6
HEIGHT = 3.05
WALL = 0.14

HW = WIDTH / 2
HD = DEPTH / 2

DOOR_WIDTH = 0.9
DOOR_HEIGHT = 2.15

SASH_WIDTH = 1.35
SASH_SILL = 0.95
SASH_TOP = SASH_SILL + 1.45

VER_DOOR_X0 = 1.1
VER_DOOR_X1 = 2.0
VER_DOOR_HEIGHT = 2.15

# Street window. room1a.ts gives it in three z; +Y here is -z, so the span flips.
FRONT_Y0 = 0.39
FRONT_Y1 = 1.41
FRONT_SILL = 0.95
FRONT_TOP = 2.55

# Joinery. Heights off the floor, depths proud of the wall face.
SKIRT_H = 0.20
SKIRT_D = 0.022
RAIL_Z = 2.30
RAIL_H = 0.07
RAIL_D = 0.028
CORNICE = 0.15

# ---------------------------------------------------------------------------
# Primitives
# ---------------------------------------------------------------------------


# BlenderMCP keeps its own settings on the scene, including the Sketchfab API
# key. `read_homefile` throws the scene away, so they have to be carried across
# by hand. Losing them silently switched the asset sourcing off mid session and
# the key had to be typed in again, because it lives in the scene and nowhere
# else.
MCP_SETTINGS = (
    "blendermcp_use_polyhaven",
    "blendermcp_use_sketchfab",
    "blendermcp_sketchfab_api_key",
    "blendermcp_use_hyper3d",
    "blendermcp_hyper3d_mode",
    "blendermcp_hyper3d_api_key",
    "blendermcp_port",
    "blendermcp_server_running",
)


def clear() -> None:
    kept = {}
    old = bpy.context.scene
    for key in MCP_SETTINGS:
        if hasattr(old, key):
            kept[key] = getattr(old, key)

    bpy.ops.wm.read_homefile(use_empty=True)

    scn = bpy.context.scene
    for key, value in kept.items():
        try:
            setattr(scn, key, value)
        except (AttributeError, TypeError):
            pass
    scn.unit_settings.system = "METRIC"
    scn.unit_settings.scale_length = 1.0


_FACES = (
    (0, 1, 3, 2),  # -X
    (4, 6, 7, 5),  # +X
    (0, 4, 5, 1),  # -Y
    (2, 3, 7, 6),  # +Y
    (0, 2, 6, 4),  # -Z
    (1, 5, 7, 3),  # +Z
)


def cube(name: str, lo, hi):
    """
    Axis aligned box from two corners. Every shell piece is one of these.

    Built out of mesh data rather than `bpy.ops.mesh.primitive_cube_add`,
    because the MCP addon runs this without a window context and every operator
    that wants an active object fails in it. Data API only, no ops, except the
    glTF import and the save at the end.
    """
    verts = [
        (lo[0] if not (i & 4) else hi[0], lo[1] if not (i & 2) else hi[1], lo[2] if not (i & 1) else hi[2])
        for i in range(8)
    ]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], [list(f) for f in _FACES])
    mesh.update()
    # A UV layer per face, so the lightmap pack at step 5 has something to
    # replace rather than nothing to work from.
    mesh.uv_layers.new(name="UVMap")
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def assign(ob, mat) -> None:
    ob.data.materials.clear()
    ob.data.materials.append(mat)


# ---------------------------------------------------------------------------
# Materials
#
# Every texture is box projected off world position rather than off UVs. The
# shell is a few dozen separate boxes and a per-face unwrap would put a seam at
# every joint between them; world projection makes the wallpaper run through a
# corner and the boards run under the bed. It also means the tile scale is in
# metres, which is the only scale worth arguing about.
#
# The bake at step 5 writes indirect light into its own UV set and does not
# touch these, so this costs nothing later.
# ---------------------------------------------------------------------------


def _image(path: str, srgb: bool = True):
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
    return img


def _projected(nt, metres: float):
    """World position into a mapping node, scaled so one tile is `metres`."""
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1 / metres,) * 3
    nt.links.new(geo.outputs["Position"], mapping.inputs["Vector"])
    return mapping


def _box_tex(nt, mapping, path: str, srgb: bool):
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = _image(path, srgb)
    node.projection = "BOX"
    node.projection_blend = 0.25
    node.extension = "REPEAT"
    nt.links.new(mapping.outputs["Vector"], node.inputs["Vector"])
    return node


def flat_material(name: str, rgb, rough: float):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = rough
    m.diffuse_color = (*rgb, 1)
    return m


def tiled_material(name: str, path: str, rough: float, metres: float, value: float = 1.0):
    """
    One authored tile as albedo. Stand-in until the surface gets a PBR set.

    `value` lifts it. The authored tiles were drawn to look right under two
    AmbientLights and they are a stop or so too dark for a room that is now
    carrying its own bounce, which reads as grime rather than as shade.
    """
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    mapping = _projected(nt, metres)
    tex = _box_tex(nt, mapping, path, True)
    out = tex.outputs["Color"]
    if abs(value - 1.0) > 1e-3:
        hsv = nt.nodes.new("ShaderNodeHueSaturation")
        hsv.inputs["Value"].default_value = value
        nt.links.new(out, hsv.inputs["Color"])
        out = hsv.outputs["Color"]
    nt.links.new(out, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    return m


def sheet_material(name: str, path: str):
    """
    One image, mapped through the mesh's own UVs, filling it once.

    Everything else in this room is box projected off world position, which is
    right for a surface that tiles and wrong for a document. The map and the
    note are things Miller reads: the whole image has to land on the sheet, the
    right way up, exactly once.
    """
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = _image(path, True)
    tex.extension = "CLIP"
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.88
    return m


def pbr_material(name: str, set_id: str, metres: float):
    """A full Poly Haven set: albedo, OpenGL normal, roughness, occlusion."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    mapping = _projected(nt, metres)
    base = f"{PBR}/{set_id}/{set_id}"
    nt.links.new(_box_tex(nt, mapping, f"{base}_diff_2k.jpg", True).outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(_box_tex(nt, mapping, f"{base}_rough_2k.jpg", False).outputs["Color"], bsdf.inputs["Roughness"])
    nrm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(_box_tex(nt, mapping, f"{base}_nor_gl_2k.jpg", False).outputs["Color"], nrm.inputs["Color"])
    nt.links.new(nrm.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def glass_material():
    m = bpy.data.materials.new("glass")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = 0.03
    bsdf.inputs["Transmission Weight"].default_value = 1.0
    # Near 1 on purpose. Real glass refracts, and refraction through a flat pane
    # at this thickness only buys a bent verandah post and a slower bake.
    bsdf.inputs["IOR"].default_value = 1.02
    return m


# ---------------------------------------------------------------------------
# Shell
# ---------------------------------------------------------------------------


def wall(name, axis, near, far, span, openings, mat):
    """
    One wall, built as the rectangles left over around its openings.

    Not a boolean. A wall cut with a boolean comes back as n-gons the lightmap
    packer has to triangulate blind, and step 5 wants a clean non-overlapping
    unwrap more than it wants a tidy modifier stack. Four boxes round a hole are
    four clean boxes, and they give the reveals for free.

    `span` is (lo, hi) along the wall. `openings` is (lo, hi, z0, z1) each.
    """
    lo, hi = span
    made = []

    def piece(a, b, z0, z1, tag):
        if b - a < 1e-4 or z1 - z0 < 1e-4:
            return
        if axis == "x":
            made.append(cube(f"{name}_{tag}", (a, near, z0), (b, far, z1)))
        else:
            made.append(cube(f"{name}_{tag}", (near, a, z0), (far, b, z1)))

    cursor = lo
    for i, (a, b, z0, z1) in enumerate(sorted(openings)):
        piece(cursor, a, 0, HEIGHT, f"pier{i}")
        piece(a, b, 0, z0, f"under{i}")
        piece(a, b, z1, HEIGHT, f"over{i}")
        cursor = b
    piece(cursor, hi, 0, HEIGHT, "end")

    for p in made:
        assign(p, mat)
    return made


def build_shell(wallpaper, plaster, boards, timber):
    parts = []

    floor = cube("floor", (-HW, -HD, -0.02), (HW, HD, 0.0))
    assign(floor, boards)
    parts.append(floor)

    ceiling = cube("ceiling", (-HW, -HD, HEIGHT), (HW, HD, HEIGHT + 0.02))
    assign(ceiling, plaster)
    parts.append(ceiling)

    parts += wall(
        "wall_hall", "x", HD, HD + WALL, (-HW, HW),
        [(-DOOR_WIDTH / 2, DOOR_WIDTH / 2, 0, DOOR_HEIGHT)], wallpaper,
    )
    parts += wall(
        "wall_verandah", "x", -HD - WALL, -HD, (-HW, HW),
        [
            (-SASH_WIDTH / 2, SASH_WIDTH / 2, SASH_SILL, SASH_TOP),
            (VER_DOOR_X0, VER_DOOR_X1, 0, VER_DOOR_HEIGHT),
        ],
        wallpaper,
    )
    parts += wall(
        "wall_street", "y", HW, HW + WALL, (-HD, HD),
        [(FRONT_Y0, FRONT_Y1, FRONT_SILL, FRONT_TOP)], wallpaper,
    )
    parts += wall("wall_blind", "y", -HW - WALL, -HW, (-HD, HD), [], wallpaper)

    # Skirting and picture rail, run as continuous strips inside the four walls.
    # The reveals cut them in reality; at this distance an unbroken strip is
    # worth more than mitred joinery, and the bake does not care.
    for tag, z0, z1, d in (("skirt", 0.0, SKIRT_H, SKIRT_D), ("rail", RAIL_Z, RAIL_Z + RAIL_H, RAIL_D)):
        for s in (
            cube(f"{tag}_hall", (-HW, HD - d, z0), (HW, HD, z1)),
            cube(f"{tag}_verandah", (-HW, -HD, z0), (HW, -HD + d, z1)),
            cube(f"{tag}_street", (HW - d, -HD, z0), (HW, HD, z1)),
            cube(f"{tag}_blind", (-HW, -HD, z0), (-HW + d, HD, z1)),
        ):
            assign(s, timber)
            parts.append(s)

    # Cornice. A box turned 45 degrees about its own length is a cove as far as
    # a 3pm sun cares, and it is what stops the wall meeting the ceiling in a
    # hard line, which is the single thing that most says "render".
    c = CORNICE / 2
    for tag, long_axis in (("hall", "x"), ("verandah", "x"), ("street", "y"), ("blind", "y")):
        if long_axis == "x":
            half = WIDTH / 2
            at = (0.0, HD - c if tag == "hall" else -HD + c, HEIGHT - c)
            box = cube(f"cornice_{tag}", (-half, -c, -c), (half, c, c))
            rot = mathutils.Euler((math.pi / 4, 0, 0))
        else:
            half = DEPTH / 2
            at = (HW - c if tag == "street" else -HW + c, 0.0, HEIGHT - c)
            box = cube(f"cornice_{tag}", (-c, -half, -c), (c, half, c))
            rot = mathutils.Euler((0, math.pi / 4, 0))
        box.data.transform(rot.to_matrix().to_4x4())
        box.location = at
        assign(box, plaster)
        parts.append(box)

    return parts


def build_doors(timber):
    """
    Both leaves, standing open into the room, hinged at a jamb.

    Neither is a collider in the runtime and neither needs to be here. They are
    in shot from the doorway camera and they are what makes the room read as
    somewhere a detective has just walked into.
    """
    parts = []
    leaf = cube("door", (0, -0.02, 0), (DOOR_WIDTH - 0.04, 0.02, DOOR_HEIGHT - 0.04))
    leaf.location = (-DOOR_WIDTH / 2, HD - 0.06, 0)
    # Negative. room1a.ts turns this leaf -1.75 in three, and a yaw about
    # three's Y is a yaw about Blender's Z with the sign flipped, because
    # +Y here is -Z there. Get it wrong and the door stands open in the hall.
    leaf.rotation_euler = (0, 0, -1.75)
    assign(leaf, timber)
    parts.append(leaf)

    ver_w = VER_DOOR_X1 - VER_DOOR_X0
    ver = cube("verandahDoor", (-(ver_w - 0.04), -0.02, 0), (0, 0.02, VER_DOOR_HEIGHT - 0.04))
    ver.location = (VER_DOOR_X1, -HD + 0.06, 0)
    ver.rotation_euler = (0, 0, -1.7)
    assign(ver, timber)
    parts.append(ver)
    return parts


def _window(timber, glass, axis, inside, outward, u0, u1, z0, z1, lift, name):
    """
    One double hung sash, with the joinery a Victorian one actually has.

    The first pass was a rectangle of square boxes and it read as a hole with a
    black border. What makes a window read is the surround, not the glass:
    a moulded architrave standing proud of the wall, a sill that projects into
    the room with an apron under it, and two sashes of different depths so the
    meeting rails overlap. All of that is still boxes, but they are the right
    boxes and they step.

    `axis` is which way the opening runs. `inside` is the room face of the wall
    and `outward` is +1 or -1 along the depth axis, so the same code builds the
    verandah sash in the -Y wall and the street one in the +X wall.

    `lift` is how far the lower sash is pushed up. The verandah one is open a
    hand's width and that gap is the whole reason the `sill` evidence exists.
    The street one is shut and stays shut.
    """
    parts = []

    def bx(tag, ua, ub, da, db, za, zb, mat):
        """Box in window space: u along the wall, d into it, z up."""
        a = inside + outward * da
        b = inside + outward * db
        lo_d, hi_d = min(a, b), max(a, b)
        if axis == "x":
            ob = cube(f"{name}_{tag}", (ua, lo_d, za), (ub, hi_d, zb))
        else:
            ob = cube(f"{name}_{tag}", (lo_d, ua, za), (hi_d, ub, zb))
        assign(ob, mat)
        parts.append(ob)
        return ob

    # Architrave: a wide flat board round the opening with a bead standing proud
    # of it. Two steps is the difference between moulding and a picture frame.
    arch, bead = 0.105, 0.042
    for tag, w, d0, d1 in (("arch", arch, -0.024, 0.0), ("bead", bead, -0.038, -0.024)):
        bx(f"{tag}_l", u0 - w, u0, d0, d1, z0 - 0.02, z1 + w, timber)
        bx(f"{tag}_r", u1, u1 + w, d0, d1, z0 - 0.02, z1 + w, timber)
        bx(f"{tag}_head", u0 - w, u1 + w, d0, d1, z1, z1 + w, timber)

    # Sill and apron. The sill runs past the architrave at both ends, because a
    # sill that stops flush with the reveal is a shelf and not a sill.
    bx("sill", u0 - arch - 0.035, u1 + arch + 0.035, -0.085, WALL, z0 - 0.055, z0, timber)
    bx("apron", u0 - arch, u1 + arch, -0.020, 0.0, z0 - 0.155, z0 - 0.055, timber)

    def leaf(tag, za, zb, da, bottom, top):
        db = da + 0.042
        stile, meet = 0.038, 0.048
        ua, ub = u0 + 0.010, u1 - 0.010
        bx(f"{tag}_stile_l", ua, ua + stile, da, db, za, zb, timber)
        bx(f"{tag}_stile_r", ub - stile, ub, da, db, za, zb, timber)
        bx(f"{tag}_rail_b", ua, ub, da, db, za, za + bottom, timber)
        bx(f"{tag}_rail_t", ua, ub, da, db, zb - top, zb, timber)
        # Glass sits in the middle of the section, not on the front of it.
        gd = da + 0.019
        bx(f"{tag}_glass", ua + stile, ub - stile, gd, gd + 0.004,
           za + bottom, zb - top, glass)
        return meet

    pane = (z1 - z0) / 2
    # Two depths, so the sashes pass each other the way they really do.
    leaf("lower", z0 + lift, z0 + lift + pane, 0.055, 0.058, 0.048)
    leaf("upper", z1 - pane, z1, 0.108, 0.048, 0.042)
    return parts


def _group(name: str, parts):
    """
    Parent a run of loose parts to an empty so the runtime has one node to name.

    Both windows are two dozen boxes. `src/interact` raycasts and then resolves
    what it hit by object id, and "the sash" has to be one id, not twenty four.
    The empty exports as a node and the parts arrive under it.
    """
    holder = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(holder)
    for part in parts:
        part.parent = holder
    bpy.context.view_layer.update()
    return holder


def build_sash(timber, glass):
    """
    Both windows, built here rather than sourced.

    Nothing downloadable is a Victorian double hung sash, and this one has to
    line up with `FIRST_WINDOW` in `lodge.ts` to the centimetre or the reveal
    cuts across the view out. The sourced window pack stays in assets/sourced as
    a reference for the mouldings.

    One over one, no glazing bars, because that is what 1a-target.png has.
    """
    parts = _window(
        timber, glass, "x", -HD, -1.0,
        -SASH_WIDTH / 2, SASH_WIDTH / 2, SASH_SILL, SASH_TOP, 0.11, "sash",
    )
    # The verandah sill is a lookable in room1a.ts and the `sill` evidence hangs
    # off it, so it keeps that exact name through the export. It also stays out
    # of the sash group, because the sash is a thing you push and the sill is a
    # thing you look at, and they are two different examines.
    bpy.data.objects["sash_sill"].name = "sill"
    _group("sash", [p for p in parts if p.name != "sill"])

    front = _window(
        timber, glass, "y", HW, 1.0,
        FRONT_Y0, FRONT_Y1, FRONT_SILL, FRONT_TOP, 0.0, "front",
    )
    _group("frontWindow", front)
    return parts + front


# ---------------------------------------------------------------------------
# Sourced furniture
# ---------------------------------------------------------------------------

# fit: which world axis to scale by, and what it should measure in metres.
# rot: yaw applied before measuring. at: footprint centre. on: what the base
# sits on, floor unless it is standing on the dresser.
FURNITURE = {
    # 1.86, not room1a.ts's 2.02. The kit wardrobe was 0.55 deep and the
    # sourced one is 0.82, so the old centre put its back 0.11 through the hall
    # wall. Furniture goes where its back lands, not where its middle does.
    "wardrobe": {"fit": ("z", 2.05), "rot": math.pi, "at": (-2.0, 1.86)},
    "bed": {"fit": ("y", 2.0), "rot": math.pi, "at": (-1.45, -0.15)},
    # Back to the street wall, long side along it. At a quarter turn it stood
    # with its 1.25 into the room and 0.18 of it through the wall.
    "dresser": {"fit": ("z", 1.42), "rot": math.pi, "at": (2.26, 0.90)},
    # Named for the runtime, sourced from the `bedside` slot. Node names are
    # the interface `src/interact` resolves by, so they win over the slot name.
    "sideTable": {"src": "bedside", "fit": ("z", 0.62), "rot": 0.0, "at": (2.20, -0.10)},
    "chair": {"fit": ("z", 0.92), "rot": 2.6, "at": (-0.15, -1.55)},
    "chair2": {"src": "chair", "fit": ("z", 0.92), "rot": -2.2, "at": (0.85, -1.35)},
    # The five things on the dresser top. `on` is the bench, measured off the
    # sourced dresser rather than carried over from the kit one, and they run
    # along its length in front of the mirror.
    "frame": {"fit": ("z", 0.19), "rot": 0.5, "at": (2.28, 0.50), "on": 0.66},
    "magazines": {"fit": ("y", 0.30), "rot": -0.2, "at": (2.25, 0.80), "on": 0.66},
    "lighter": {"fit": ("z", 0.08), "rot": 0.9, "at": (2.38, 0.62), "on": 0.66},
    "syringe": {"fit": ("y", 0.115), "rot": 1.2, "at": (-1.05, 0.10), "on": 0.60},
    # Two sheets of the same sourced paper, retextured. The map and the note are
    # things Miller reads, so what matters is the authored image on them; the
    # geometry is a sheet of paper and a sheet of paper is a sheet of paper.
    "map": {
        "src": "paper", "fit": ("y", 0.30), "rot": 0.35, "at": (2.28, 1.08),
        "on": 0.66, "lay": 2.0, "texture": "map-pins",
    },
    "note": {
        "src": "paper", "fit": ("y", 0.17), "rot": -0.6, "at": (2.24, 1.34),
        "on": 0.66, "lay": -1.5, "texture": "note",
    },
}


def _place_mattress(lo, hi, springs, top, ticking):
    """
    The mattress, sourced.

    It was a box. A box under a draped spread is a box under a draped spread,
    and worse, Crystal lies on this bed at runtime: a grey slab with a hard edge
    is the thing she would be staged against, and every centimetre of it would
    be wrong forever once the room is baked and exported.

    Sketchfab's quilted single, retextured to ticking. Scaled to the frame's
    interior on both axes independently, because a mattress is cut to fit a bed
    and this one came off a wider one. Its top lands exactly where the box's did,
    so the spread and the pillow anchor off the same number as before.
    """
    before = {o.name for o in bpy.data.objects}
    bpy.ops.import_scene.gltf(filepath=f"{SOURCED}/mattress.glb")
    new = [o for o in bpy.data.objects if o.name not in before]

    holder = bpy.data.objects.new("mattress", None)
    bpy.context.scene.collection.objects.link(holder)
    for r in [o for o in new if o.parent is None]:
        r.parent = holder
    bpy.context.view_layer.update()

    want_x = (hi.x - lo.x) - 0.20
    want_y = (hi.y - lo.y) - 0.28
    want_z = top - springs
    size = world_bounds(new)[1] - world_bounds(new)[0]
    holder.scale = (
        want_x / size.x if size.x > 1e-6 else 1.0,
        want_y / size.y if size.y > 1e-6 else 1.0,
        want_z / size.z if size.z > 1e-6 else 1.0,
    )
    bpy.context.view_layer.update()

    mlo, mhi = world_bounds(new)
    mid = (mlo + mhi) / 2
    holder.location = (
        holder.location.x + ((lo.x + hi.x) / 2 - mid.x),
        holder.location.y + ((lo.y + hi.y) / 2 - mid.y),
        holder.location.z + (springs - mlo.z),
    )
    bpy.context.view_layer.update()

    for ob in new:
        if ob.type == "MESH":
            assign(ob, ticking)
    return holder


def build_bedding(bed_holder, spread, linen, ticking):
    """
    The mattress, the spread and the pillow, measured rather than eyeballed.

    Three passes at this were wrong in three different ways, all because the
    bedding was being positioned off its bounding box and a bounding box tells
    you nothing useful about cloth. The bottom of the box is the hem of the
    drape, which hangs most of the way to the floor. The top of it is the crest
    of a fold. Neither is the surface that has to touch the mattress, and both
    left the spread floating over the bed with daylight under it.

    So the mattress is a fixed thickness, and both cloth meshes are then dropped
    onto it by asking their own vertices where they are:

    - the spread by the **median height of its vertices over the mattress
      footprint**, because most of a spread is the flat that lies on the bed,
      and a median ignores both the folds above it and the drape below it
    - the pillow by **its own lowest vertex**, on its own, because it is a
      separate mesh that in the source sat on a thicker mattress than this one
      and inherited a fifteen centimetre hover from it

    Doing them together is what kept failing. They are one import and two
    objects, and they need two anchors.

    Crystal still comes from `crystal.ts` at runtime and is deliberately not
    here. She is not part of the room and she must not be baked into it.
    """
    lo, hi = world_bounds(bed_holder.children_recursive)
    # The springs sit a little under half way up the frame. A sprung Victorian
    # single carries a deep kapok mattress, and this number is also what stops
    # the sourced spread having to drape further than it was modelled to.
    springs = lo.z + (hi.z - lo.z) * 0.42
    top = springs + 0.185

    mattress = _place_mattress(lo, hi, springs, top, ticking)
    mlo, mhi = world_bounds(mattress.children_recursive)

    before = {o.name for o in bpy.data.objects}
    bpy.ops.import_scene.gltf(filepath=f"{SOURCED}/bedding.glb")
    new = [o for o in bpy.data.objects if o.name not in before]

    holder = bpy.data.objects.new("bedding", None)
    bpy.context.scene.collection.objects.link(holder)
    for r in [o for o in new if o.parent is None]:
        r.parent = holder
    bpy.context.view_layer.update()

    blo, bhi = world_bounds(new)
    if (bhi - blo).y > 1e-6:
        holder.scale = ((hi.y - lo.y - 0.16) / (bhi - blo).y,) * 3
    bpy.context.view_layer.update()

    # Then widen it on its own. Length is what sets the scale, because a spread
    # that is short reads as a towel, and at that scale this one came up narrow
    # enough to leave a bare strip of ticking down one side whichever way it was
    # thrown. Stretching cloth across its width by a sixth is not visible. A bed
    # half made is.
    # Wide enough to cover the mattress and turn down its sides, and no wider.
    # At frame width plus a third of a metre the drape cleared the mattress
    # entirely, passed through the iron side rail and hung in mid air beside the
    # bed. The spread has to be measured against the mattress, not the frame.
    blo, bhi = world_bounds(new)
    if (bhi - blo).x > 1e-6:
        holder.scale.x *= ((mhi.x - mlo.x) + 0.17) / (bhi - blo).x
    bpy.context.view_layer.update()

    # Centre it on the frame in plan. Height is settled per mesh, below.
    blo, bhi = world_bounds(new)
    mid = (blo + bhi) / 2
    holder.location = (
        holder.location.x + ((lo.x + hi.x) / 2 - mid.x),
        # Down the bed toward the foot. The spread is thrown rather than
        # made, and the head end is where the pillow goes anyway.
        holder.location.y + ((lo.y + hi.y) / 2 - mid.y) - 0.10,
        holder.location.z,
    )
    bpy.context.view_layer.update()

    meshes = sorted(
        (o for o in new if o.type == "MESH"),
        key=lambda o: -(o.dimensions.x * o.dimensions.y * o.dimensions.z),
    )
    spread_mesh, pillow_mesh = meshes[0], (meshes[1] if len(meshes) > 1 else None)

    def heights(ob, over_mattress: bool):
        """World z of every vertex, optionally only those over the mattress."""
        m = ob.matrix_world
        pts = [m @ v.co for v in ob.data.vertices]
        if over_mattress:
            inside = [
                p.z for p in pts
                if mlo.x + 0.02 < p.x < mhi.x - 0.02 and mlo.y + 0.02 < p.y < mhi.y - 0.02
            ]
            if inside:
                return sorted(inside)
        return sorted(p.z for p in pts)

    def drop(ob, delta: float):
        ob.matrix_world = mathutils.Matrix.Translation((0, 0, delta)) @ ob.matrix_world
        bpy.context.view_layer.update()

    flat = heights(spread_mesh, True)
    drop(spread_mesh, (top + 0.015) - flat[len(flat) // 2])

    if pillow_mesh is not None:
        drop(pillow_mesh, (top + 0.010) - heights(pillow_mesh, False)[0])

    assign(spread_mesh, spread)
    if pillow_mesh is not None:
        assign(pillow_mesh, linen)
    return holder


def build_rug(carpet):
    """The rug in the sun path. It is in the target photograph and it is the
    only thing in the room the beam actually lands on at floor level."""
    rug = cube("rug", (-0.65, -1.0, 0.0), (0.95, 1.2, 0.014))
    rug.rotation_euler = (0, 0, -0.08)
    assign(rug, carpet)
    return rug


def world_bounds(objects):
    lo = mathutils.Vector((1e9, 1e9, 1e9))
    hi = mathutils.Vector((-1e9, -1e9, -1e9))
    for o in objects:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(c)
            for i in range(3):
                lo[i] = min(lo[i], w[i])
                hi[i] = max(hi[i], w[i])
    return lo, hi


def place(slot: str, spec: dict):
    """
    Import one sourced asset and put it in the room.

    Nothing off Sketchfab shares a unit or an orientation, so nothing here
    trusts the file. Three of the eleven are in metres and the rest are in
    inches, centimetres or millimetres. The asset is parented to an empty,
    turned, measured, scaled until one known dimension is right, measured again,
    and dropped so its base sits on the floor with its footprint where the
    layout says.
    """
    src = spec.get("src", slot)
    before = {o.name for o in bpy.data.objects}
    bpy.ops.import_scene.gltf(filepath=f"{SOURCED}/{src}.glb")
    new = [o for o in bpy.data.objects if o.name not in before]

    holder = bpy.data.objects.new(slot, None)
    bpy.context.scene.collection.objects.link(holder)
    for r in [o for o in new if o.parent is None]:
        r.parent = holder

    # `lay` tips a sheet onto the surface it is lying on.
    #
    # The sourced paper is modelled as a quad in Blender's XZ plane, so it wants
    # a quarter turn about X. It does not get one: `assets/sourced/paper.glb`
    # was exported Y-up and comes back through the same conversion, which has
    # already laid it flat. Turning it again stood both sheets on edge against
    # the wall.
    tilt = math.radians(spec.get("lay", 0.0))
    holder.rotation_euler = (tilt, 0, spec["rot"])
    bpy.context.view_layer.update()

    axis, target = spec["fit"]
    lo, hi = world_bounds(new)
    current = {"x": (hi - lo).x, "y": (hi - lo).y, "z": (hi - lo).z}[axis]
    if current > 1e-6:
        holder.scale = (target / current,) * 3
    bpy.context.view_layer.update()

    lo, hi = world_bounds(new)
    mid = (lo + hi) / 2
    x, y = spec["at"]
    holder.location = (
        holder.location.x + (x - mid.x),
        holder.location.y + (y - mid.y),
        holder.location.z + (spec.get("on", 0.0) - lo.z),
    )
    bpy.context.view_layer.update()

    texture = spec.get("texture")
    if texture is not None:
        paper = sheet_material(f"paper_{slot}", f"{TEXTURES}/{texture}.jpg")
        for ob in new:
            if ob.type == "MESH":
                assign(ob, paper)
    return holder


# ---------------------------------------------------------------------------
# Sun, sky, camera
# ---------------------------------------------------------------------------


def build_verandah_proxy(timber):
    """
    A stand-in verandah outside the sash, for the bake and nothing else.

    Not decoration and not optional. CLAUDE.md's *The verandah is a light
    budget* is the whole argument: the verandah stands between the 3pm sun and
    1A's sash, and its depth, its eave height and the spacing of its posts were
    all set against what they do to the beam on the bed. Bake this room with an
    open sky outside and the indirect map comes back with a stop and a half more
    light in it than the runtime will ever have, and every shadow the posts
    throw across the floor is missing.

    Numbers are `verandah.ts`'s, carried into room local:

        local = R_y(-pi/2) . (world - (4.0, 3.45, 2.6))

    so the deck face at world x 6.37 lands at local z 2.37, the outer edge at
    8.05 lands at 4.05, the eave at world y 6.4 lands at 2.95, and the five
    posts at world z -2.1, 0.2, 2.7, 5.0 and 7.05 land at local x 4.7, 2.4,
    -0.1, -2.4 and -4.45.

    Everything here goes in a `proxy` collection. Step 6 exports the room
    collection and leaves this behind.
    """
    proxy = bpy.data.collections.new("proxy")
    bpy.context.scene.collection.children.link(proxy)

    def add(ob):
        bpy.context.scene.collection.objects.unlink(ob)
        proxy.objects.link(ob)
        assign(ob, timber)
        return ob

    inner, outer = -2.37, -4.05
    eave, roof = 2.95, 3.15
    rail_top = 1.02

    add(cube("proxy_deck", (-5.6, outer, -0.06), (5.6, inner, 0.0)))
    add(cube("proxy_roof", (-5.6, outer - 0.25, eave), (5.6, inner, roof)))
    for x in (4.7, 2.4, -0.1, -2.4, -4.45):
        add(cube(f"proxy_post_{x}", (x - 0.07, outer + 0.28, 0.0), (x + 0.07, outer + 0.42, eave)))
    add(cube("proxy_rail", (-5.6, outer + 0.30, rail_top - 0.06), (5.6, outer + 0.40, rail_top)))
    add(cube("proxy_balustrade", (-5.6, outer + 0.33, 0.10), (5.6, outer + 0.37, rail_top - 0.06)))

    # The first floor hall behind the door. Same argument as the verandah: the
    # hall is an enclosed passage in `lodge.ts`, and left as a hole it turns the
    # doorway into a second window onto an open sky. A five sided box with no
    # light in it is what is actually on the other side of that door.
    h0, h1 = HD + WALL, HD + WALL + 2.4
    add(cube("proxy_hall_floor", (-3.0, h0, -0.06), (3.0, h1, 0.0)))
    add(cube("proxy_hall_ceiling", (-3.0, h0, HEIGHT), (3.0, h1, HEIGHT + 0.06)))
    add(cube("proxy_hall_back", (-3.0, h1 - 0.06, 0.0), (3.0, h1, HEIGHT)))
    add(cube("proxy_hall_left", (-3.0, h0, 0.0), (-2.94, h1, HEIGHT)))
    add(cube("proxy_hall_right", (2.94, h0, 0.0), (3.0, h1, HEIGHT)))
    return proxy


def build_sun():
    """
    The fixed 3pm sun, carried in from `render/lighting.ts` rather than aimed.

    That file's direction is world space and room 1A is turned a quarter turn
    inside the building, so it comes back to room local as

        local = (-z_world, y_world, x_world)

    which is (-0.4, -0.365, -0.847) in three and (-0.4, 0.847, -0.365) here
    after the Z-up swap. That travels toward +Y, so it comes *from* -Y, which is
    the verandah wall, and it comes in through the sash. That is the whole point
    of the room.

    Energy is in W/m2 and has nothing to do with three's 4.2, which is a
    multiplier. Clear afternoon sun through glass is a few units here.
    """
    d = mathutils.Vector((-0.4, 0.847, -0.365)).normalized()
    data = bpy.data.lights.new("sun", type="SUN")
    data.energy = 7.0
    data.angle = math.radians(0.9)
    data.color = (1.0, 0.906, 0.78)
    sun = bpy.data.objects.new("sun", data)
    bpy.context.scene.collection.objects.link(sun)
    sun.location = (2.0, 6.0, 5.0)
    sun.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return sun


def build_world():
    """
    The same HDRI the runtime uses, turned so the same part of it is out the
    same window.

    Not the same number, though, and not a converted one either. The runtime
    rotates by 0.62pi in world space, this file is room local, room 1A is a
    quarter turn inside the building, and the two packages do not agree on where
    u starts on an equirectangular map. Converting between them gave a stucco
    wall out the sash.

    So both numbers were set the same way: by rendering the sweep and looking
    out the window. 0.62pi in three and 0 here both land on the cypresses, which
    is the leafy thing 1a-target.png has outside.
    """
    world = bpy.data.worlds.new("room1a")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes["Background"]
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(HDRI, check_existing=True)
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Rotation"].default_value = (0, 0, 0.0)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    return world


def build_camera():
    """
    The `1a` shot out of `src/dev/shots.ts`, so a Cycles render and a
    tools/shot.mjs capture frame the same thing and can go side by side.

    That shot puts Miller's feet at world (3.55, 3.45, 1.05) with yaw pi + 0.55
    and pitch -0.1, and his eye 1.7 above that. Room 1A sits at world
    (4.0, 3.45, 2.6) turned a quarter turn, so

        local = R_y(-pi/2) . (world - origin) = (1.55, 1.7, -0.45)

    in three, and local yaw is world yaw minus pi/2.
    """
    data = bpy.data.cameras.new("shot_1a")
    data.sensor_fit = "VERTICAL"
    data.angle_y = math.radians(70)
    data.clip_start = 0.05
    cam = bpy.data.objects.new("shot_1a", data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (1.55, 0.45, 1.7)

    yaw = math.pi + 0.55 - math.pi / 2
    pitch = -0.1
    look = mathutils.Vector((
        -math.sin(yaw) * math.cos(pitch),
        math.cos(yaw) * math.cos(pitch),
        math.sin(pitch),
    ))
    cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam

    # A second camera in the hall doorway, framed like images/mood/1a-wide.png.
    # Not a shot the game ever takes: it is here so the whole room can be
    # checked in one render, since `shot_1a` has the wardrobe and the dresser
    # behind it.
    wide_data = bpy.data.cameras.new("wide_1a")
    wide_data.sensor_fit = "VERTICAL"
    wide_data.angle_y = math.radians(62)
    wide_data.clip_start = 0.05
    wide = bpy.data.objects.new("wide_1a", wide_data)
    bpy.context.scene.collection.objects.link(wide)
    wide.location = (0.30, 1.95, 1.62)
    wide.rotation_euler = mathutils.Vector((-0.34, -1.0, -0.14)).normalized().to_track_quat("-Z", "Y").to_euler()

    # And a third, in the far corner looking back at the hall wall, because the
    # wardrobe, the dresser and both doors are behind the other two.
    back_data = bpy.data.cameras.new("back_1a")
    back_data.sensor_fit = "VERTICAL"
    back_data.angle_y = math.radians(66)
    back_data.clip_start = 0.05
    back = bpy.data.objects.new("back_1a", back_data)
    bpy.context.scene.collection.objects.link(back)
    back.location = (-0.10, -1.85, 1.62)
    back.rotation_euler = mathutils.Vector((0.30, 1.0, -0.16)).normalized().to_track_quat("-Z", "Y").to_euler()
    return cam


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------


def build() -> None:
    clear()

    wallpaper = tiled_material("wallpaper", f"{TEXTURES}/wallpaper-floral.jpg", 0.92, 0.52, 1.45)
    plaster = flat_material("plaster", (0.72, 0.66, 0.56), 0.95)
    timber = tiled_material("timber", f"{TEXTURES}/timber-dark.jpg", 0.72, 0.9, 1.2)
    boards = pbr_material("floorboards", "wood_planks", 1.5)
    carpet = tiled_material("carpet", f"{TEXTURES}/carpet-brown.jpg", 0.95, 1.4)
    spread = tiled_material("spread", f"{TEXTURES}/bedspread-rose.jpg", 0.9, 0.55, 1.15)
    linen = flat_material("linen", (0.74, 0.70, 0.62), 0.88)
    # Dark. Ticking is a grey striped cotton, and at anything like a clean
    # mattress grey this slab caught the 3pm sun and read as a lit white box in
    # the middle of the room.
    ticking = flat_material("ticking", (0.26, 0.24, 0.20), 0.94)
    glass = glass_material()

    build_shell(wallpaper, plaster, boards, timber)
    build_doors(timber)
    build_sash(timber, glass)
    placed = {slot: place(slot, spec) for slot, spec in FURNITURE.items()}
    build_bedding(placed["bed"], spread, linen, ticking)
    build_rug(carpet)
    build_verandah_proxy(timber)

    build_sun()
    build_world()
    build_camera()

    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "GPU"
    scn.cycles.samples = 64
    scn.cycles.use_denoising = True
    scn.render.use_persistent_data = True
    scn.render.resolution_x = 1280
    scn.render.resolution_y = 960
    scn.view_settings.view_transform = "AgX"
    # Exposed for the interior, which is what the target photograph is and why
    # its windows are blown. Preview only: a Diffuse Indirect bake writes raw
    # radiance and does not care what the view transform does with it.
    scn.view_settings.exposure = 2.8

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)


build()
