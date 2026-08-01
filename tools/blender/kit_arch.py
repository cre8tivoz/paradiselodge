"""
Unit A's shared joinery. Doors, windows, skirting, architrave, stairs, rails.

Not a script. Load it and call it from a space builder:

    exec(open('tools/blender/kit_arch.py').read())
    door_unit("hall_1a", axis="x", ...)

## "Model once, instance everywhere" means one function, not one mesh

The obvious reading is Blender's linked duplicates: build the door once and
share its mesh data everywhere. **That cannot be done here and the reason is
the bake.** Every copy needs its own island in the lightmap atlas, because the
door at the top of the stairs catches different light from the one into the
parlour, and two objects sharing mesh data share UVs and therefore share one
patch of the atlas. Linked duplicates and baked lighting are mutually
exclusive.

So the shared thing is the definition, not the data. Each call returns fresh
geometry at the same proportions, and the atlas gets a separate island per
copy, which is exactly what it should get.

## Everything is boxes and lathes, and that is not laziness

`build_room1a.py` settled this: a wall cut with a boolean comes back as n-gons
that the lightmap packer has to triangulate blind, and the bake wants a clean
non-overlapping unwrap far more than it wants a tidy modifier stack. Four boxes
around a hole are four clean boxes and they give the reveals for free.

What makes Victorian joinery read is not detail, it is that the mouldings step
and stand proud of the wall. A flat rectangle round a door is a hole with a
border. Three boxes of decreasing depth is an architrave.

## Data API only

The MCP addon runs without a window context, so every operator that wants an
active object fails. Meshes are built with `from_pydata`. No `bpy.ops` in here.

## Dimensions

Off `lodge.ts`, so the sourced spaces line up with the ones already standing.
Floor to floor is 3.45, walls are 0.12 thick, and the stair is 18 risers at
0.19. Change one of those here and change it there.
"""

from __future__ import annotations

import math

import bpy

# Wall thickness, and the depth every moulding is measured against.
WALL = 0.12

DOOR_WIDTH = 0.90
DOOR_HEIGHT = 2.05
# A four panel door, which is what every room in a house like this has.
DOOR_THICK = 0.042

# Moulding sections. Proud is how far each stands off the wall face, and it is
# the number that does the work: at zero it is paint, at two centimetres it
# catches the sun and throws a line of shadow down the wall.
ARCH_WIDTH = 0.085
ARCH_PROUD = 0.022
SKIRT_HEIGHT = 0.180
SKIRT_PROUD = 0.020
RAIL_HEIGHT = 0.048
RAIL_PROUD = 0.016

# Stair. RISE is fenced by the player controller's step up and step down at
# both ends, so it is not a free number. See "Where the floor is" in CLAUDE.md.
RISE = 0.19
GOING = 0.26
TREAD_THICK = 0.045
NOSING = 0.025
BALUSTER_SIDE = 0.032
BALUSTER_HEIGHT = 0.86
NEWEL_SIDE = 0.095
HANDRAIL_SIDE = 0.055


def cube(name: str, lo, hi):
    """
    Axis aligned box from two opposite corners.

    Mesh data, not `primitive_cube_add`, because there is no window context.
    """
    verts = [
        (lo[0], lo[1], lo[2]), (lo[0], lo[1], hi[2]),
        (lo[0], hi[1], lo[2]), (lo[0], hi[1], hi[2]),
        (hi[0], lo[1], lo[2]), (hi[0], lo[1], hi[2]),
        (hi[0], hi[1], lo[2]), (hi[0], hi[1], hi[2]),
    ]
    faces = [
        (0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
        (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3),
    ]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def lathe(name: str, profile, segs: int = 16):
    """
    Spin a profile of (radius, height) pairs about Z. Turned balusters and
    newel caps, and nothing else in here needs it.
    """
    verts = []
    faces = []
    for r, z in profile:
        for s in range(segs):
            a = 2 * math.pi * s / segs
            verts.append((r * math.cos(a), r * math.sin(a), z))
    for ring in range(len(profile) - 1):
        for s in range(segs):
            n = (s + 1) % segs
            a = ring * segs + s
            b = ring * segs + n
            c = (ring + 1) * segs + n
            d = (ring + 1) * segs + s
            faces.append((a, b, c, d))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def assign(ob, mat) -> None:
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    _box_uv(ob, float(mat.get("tile_metres", 1.0)))


def _box_uv(ob, tile_metres: float) -> None:
    """
    Give generated architecture a real-scale albedo UV map.

    The linked material library reads its image textures from the active UV
    layer. `from_pydata` creates none, so a material can be linked, assigned and
    rendered without error while every map samples one point. Project each face
    on its dominant plane and divide by the material's real tile size. The bake
    adds a separate non-overlapping lightmap layer later.
    """
    mesh = ob.data
    if len(mesh.uv_layers) > 0:
        return
    scale = max(tile_metres, 0.001)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        normal = polygon.normal
        axis = max(range(3), key=lambda i: abs(normal[i]))
        for loop_index in polygon.loop_indices:
            co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            if axis == 0:
                uv = (co.y / scale, co.z / scale)
            elif axis == 1:
                uv = (co.x / scale, co.z / scale)
            else:
                uv = (co.x / scale, co.y / scale)
            uv_layer.data[loop_index].uv = uv


def _span(axis: str, u0: float, u1: float, d0: float, d1: float, z0: float, z1: float):
    """
    Corners for a box described along a wall.

    `u` runs along the wall, `d` through it, `z` up. One helper so a piece in
    an X wall and the same piece in a Y wall are the same code, which is what
    stopped room 1A's two windows drifting apart.
    """
    if axis == "x":
        return (u0, d0, z0), (u1, d1, z1)
    return (d0, u0, z0), (d1, u1, z1)


def _point(axis: str, u: float, d: float, z: float):
    """A single point in the same wall space `_span` uses."""
    return (u, d, z) if axis == "x" else (d, u, z)


def architrave(name, mat, axis, u0, u1, z_head, face, outward, base=0.0):
    """
    The moulded surround on one face of an opening.

    Two jambs and a head, each three boxes stepping out from the wall. The step
    is the whole thing: it is what turns a hole into a doorway.

    `face` is the wall surface it sits on and `outward` is +1 or -1 into the
    room from there.
    """
    parts = []
    steps = ((0.0, ARCH_PROUD * 0.45, 0.0), (ARCH_PROUD * 0.45, ARCH_PROUD * 0.8, 0.012),
             (ARCH_PROUD * 0.8, ARCH_PROUD, 0.026))
    for i, (da, db, inset) in enumerate(steps):
        a = face + outward * da
        b = face + outward * db
        w = ARCH_WIDTH - inset
        for tag, ua, ub in (
            ("jamb_l", u0 - ARCH_WIDTH, u0 - ARCH_WIDTH + w),
            ("jamb_r", u1 + ARCH_WIDTH - w, u1 + ARCH_WIDTH),
        ):
            lo, hi = _span(
                axis, ua, ub, min(a, b), max(a, b), base, base + z_head + ARCH_WIDTH
            )
            ob = cube(f"{name}_{tag}{i}", lo, hi)
            assign(ob, mat)
            parts.append(ob)
        lo, hi = _span(
            axis, u0 - ARCH_WIDTH, u1 + ARCH_WIDTH, min(a, b), max(a, b),
            base + z_head + ARCH_WIDTH - w, base + z_head + ARCH_WIDTH,
        )
        ob = cube(f"{name}_head{i}", lo, hi)
        assign(ob, mat)
        parts.append(ob)
    return parts


def door_unit(name, mat, axis, centre, wall_near, wall_far, open_angle=0.0,
              width=DOOR_WIDTH, height=DOOR_HEIGHT, base=0.0):
    """
    A doorway: architrave on both faces, and a four panel leaf.

    `open_angle` in radians, 0 shut. Room 1A's two doors both stand open
    against the wall, which is what a scene with a body in it looks like, and
    it also means the leaf never blocks the only way out.

    The leaf is not collidable and must not be. `room1a.ts` leaves doors out of
    its solids list on purpose: a leaf you can walk through beats a room you
    cannot leave.
    """
    parts = []
    u0, u1 = centre - width / 2, centre + width / 2

    parts += architrave(
        f"{name}_arch_in", mat, axis, u0, u1, height, wall_near, -1, base=base
    )
    parts += architrave(
        f"{name}_arch_out", mat, axis, u0, u1, height, wall_far, 1, base=base
    )

    # The leaf.
    #
    # Built flat and shut, then hung on an empty at the hinge and turned.
    # **A rotated box is not a box.** The first pass computed the leaf's
    # corners at the open angle and fed them back in as a min and a max, which
    # is an axis aligned bounding box of a turned door: it rendered as a fat
    # slab standing across the opening with its panels poking out the side.
    # Anything that turns gets a parent.
    mid = (wall_near + wall_far) / 2
    leaf = bpy.data.objects.new(f"{name}_leaf", None)
    bpy.context.scene.collection.objects.link(leaf)
    leaf.location = _point(axis, u0, mid, base)
    leaf.rotation_euler = (0.0, 0.0, open_angle if axis == "x" else -open_angle)

    # A panel door is still a solid door. The stiles, rails and inset panels
    # describe its face, but without a thin opaque core direct sun traces every
    # decorative join onto the wall behind it.
    lo, hi = _span(axis, 0.0, width, -DOOR_THICK * 0.16, DOOR_THICK * 0.16, 0.0, height)
    backing = cube(f"{name}_backing", lo, hi)
    assign(backing, mat)
    backing.parent = leaf
    parts.append(backing)

    stiles = (
        ("stile_hinge", 0.0, 0.11, 0.0, height),
        ("stile_lock", width - 0.11, width, 0.0, height),
        ("rail_b", 0.11, width - 0.11, 0.0, 0.20),
        ("rail_m", 0.11, width - 0.11, 0.86, 1.02),
        ("rail_t", 0.11, width - 0.11, height - 0.12, height),
    )
    for tag, a, b, za, zb in stiles:
        lo, hi = _span(axis, a, b, -DOOR_THICK / 2, DOOR_THICK / 2, za, zb)
        ob = cube(f"{name}_{tag}", lo, hi)
        assign(ob, mat)
        ob.parent = leaf
        parts.append(ob)

    # The two panels between the rails, set back inside the leaf so each one
    # catches a line of shadow at its edge. Without them it is a slab.
    for tag, za, zb in (("panel_b", 0.22, 0.84), ("panel_t", 1.04, height - 0.14)):
        lo, hi = _span(axis, 0.13, width - 0.13, -DOOR_THICK / 4, DOOR_THICK / 4, za, zb)
        ob = cube(f"{name}_{tag}", lo, hi)
        assign(ob, mat)
        ob.parent = leaf
        parts.append(ob)
    return parts


def skirting(name, mat, axis, u0, u1, face, outward):
    """
    A skirting run. Two steps, taller than it looks right to make it: a
    Victorian skirt is 180mm and modern eyes read that as too big until it is
    next to a 3.4 metre ceiling.
    """
    parts = []
    for i, (da, db, z0, z1) in enumerate((
        (0.0, SKIRT_PROUD, 0.0, SKIRT_HEIGHT - 0.03),
        (0.0, SKIRT_PROUD * 0.6, SKIRT_HEIGHT - 0.03, SKIRT_HEIGHT),
    )):
        a = face + outward * da
        b = face + outward * db
        lo, hi = _span(axis, u0, u1, min(a, b), max(a, b), z0, z1)
        ob = cube(f"{name}_{i}", lo, hi)
        assign(ob, mat)
        parts.append(ob)
    return parts


def picture_rail(name, mat, axis, u0, u1, face, outward, height):
    """The rail the wallpaper stops at. One step, small, and it is the line
    that tells you the ceiling is high."""
    a = face + outward * 0.0
    b = face + outward * RAIL_PROUD
    lo, hi = _span(axis, u0, u1, min(a, b), max(a, b), height, height + RAIL_HEIGHT)
    ob = cube(name, lo, hi)
    assign(ob, mat)
    return [ob]


def stair_flight(
    name,
    tread_mat,
    riser_mat,
    axis,
    u0,
    u1,
    start,
    base,
    count,
    going=GOING,
    rise=RISE,
    direction=1.0,
):
    """
    A run of treads with risers and a nosing.

    `start` is where the bottom tread's face is along the going axis and `base`
    is the floor it climbs from. `direction` lets the same definition climb in
    either world-axis direction; `going` and `rise` allow a caller to preserve
    the dimensions of an existing runtime stair. Returns the treads separately
    so the caller can hand them to the navmesh: the player controller walks a
    staircase as a run of floors a step apart, not as a ramp.
    """
    treads, risers = [], []
    for i in range(count):
        z = base + (i + 1) * rise
        g0 = start + direction * i * going
        g1 = g0 + direction * going
        # The nosing is the overhang at the front of the tread. It is 25mm and
        # it is the difference between a staircase and a stack of slabs.
        ga = min(g0 - direction * NOSING, g1)
        gb = max(g0 - direction * NOSING, g1)
        lo, hi = _span(axis, u0, u1, ga, gb, z - TREAD_THICK, z)
        t = cube(f"{name}_tread{i}", lo, hi)
        assign(t, tread_mat)
        treads.append(t)

        # The riser closes the step, so it goes **under the nosing at the front**
        # of its own tread, not at the back. Put it at the back and every step
        # has a gap under it the depth of the going: that is an open tread
        # stair, which is a 1960s thing, and you can see the wall through it.
        ga = min(g0, g0 + direction * 0.022)
        gb = max(g0, g0 + direction * 0.022)
        lo, hi = _span(axis, u0, u1, ga, gb, z - rise, z - TREAD_THICK)
        r = cube(f"{name}_riser{i}", lo, hi)
        assign(r, riser_mat)
        risers.append(r)
    return treads, risers


def baluster(name, mat, x, y, base):
    """One turned spindle. A square block top and bottom with a lathed belly,
    which is the cheapest thing that reads as turned rather than as dowel."""
    parts = []
    for tag, z0, z1 in (("foot", 0.0, 0.10), ("neck", BALUSTER_HEIGHT - 0.09, BALUSTER_HEIGHT)):
        h = BALUSTER_SIDE / 2
        ob = cube(f"{name}_{tag}", (x - h, y - h, base + z0), (x + h, y + h, base + z1))
        assign(ob, mat)
        parts.append(ob)

    r = BALUSTER_SIDE * 0.62
    profile = [
        (BALUSTER_SIDE / 2, 0.10), (r, 0.17), (r * 0.66, 0.30), (r * 0.92, 0.44),
        (r * 0.70, 0.58), (r * 0.80, 0.68), (BALUSTER_SIDE / 2, BALUSTER_HEIGHT - 0.09),
    ]
    ob = lathe(f"{name}_turn", profile)
    ob.location = (x, y, base)
    assign(ob, mat)
    parts.append(ob)
    return parts


def balustrade(name, mat, axis, u0, u1, cross, base, rise_per_u=0.0, spacing=0.17):
    """
    A run of balusters with a handrail over them.

    `rise_per_u` is how much the rail climbs per metre along the run, so the
    same function does a level landing rail and a raking stair rail. On a stair
    it is RISE / GOING.
    """
    parts = []
    n = max(2, int(abs(u1 - u0) / spacing))
    step = (u1 - u0) / n
    for i in range(n + 1):
        u = u0 + i * step
        z = base + (u - u0) * rise_per_u
        x, y = (u, cross) if axis == "x" else (cross, u)
        parts += baluster(f"{name}_b{i}", mat, x, y, z)

    # The handrail, as short segments that follow the rake. One long box would
    # be level and would float at one end and bury itself at the other.
    h = HANDRAIL_SIDE / 2
    for i in range(n):
        ua, ub = u0 + i * step, u0 + (i + 1) * step
        za = base + (ua - u0) * rise_per_u + BALUSTER_HEIGHT
        zb = base + (ub - u0) * rise_per_u + BALUSTER_HEIGHT
        lo, hi = _span(axis, min(ua, ub), max(ua, ub), cross - h, cross + h,
                       min(za, zb), max(za, zb) + HANDRAIL_SIDE)
        ob = cube(f"{name}_rail{i}", lo, hi)
        assign(ob, mat)
        parts.append(ob)
    return parts


def newel(name, mat, x, y, base, height):
    """The post at the bottom of the flight. Square, heavy, with a cap."""
    h = NEWEL_SIDE / 2
    parts = [cube(f"{name}_post", (x - h, y - h, base), (x + h, y + h, base + height))]
    parts.append(cube(f"{name}_cap", (x - h * 1.25, y - h * 1.25, base + height),
                      (x + h * 1.25, y + h * 1.25, base + height + 0.045)))
    for ob in parts:
        assign(ob, mat)
    return parts
