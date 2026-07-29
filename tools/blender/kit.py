"""
Shared Blender helpers for the character build scripts.

Extracted at step 12, when Moretti became the second lathed character and the
choice was one shared module or a third copy of two hundred lines.

Everything here is geometry by profile: a character is a set of revolved
outlines, because a figure built from stacked capsules reads as a snowman and
the silhouette is the whole job at the distance the player stands.

Coordinate convention, Blender Z-up, and it matches the hand:

    the character faces +Y  ->  Three -Z, which is three.js default forward
    their right is +X       ->  stays +X
    up is +Z                ->  Three +Y

The glTF exporter bakes that conversion through the whole hierarchy, not just
the root, so every joint arrives in honest three.js axes: +Y up, +X their
right, forward -Z, limbs hanging down -Y.

Named empties are what the runtime looks up after load. glTF strips dots, so
names use underscores.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy

REPO = Path("/Users/habibi/Documents/CLAUDE/paradisegame")
OUT_DIR = REPO / "public" / "models"
BLEND_DIR = REPO / "assets" / "blender"


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
    # Workbench reads diffuse_color, not the node tree. Without this a solid
    # viewport and every clay render come back grey, which is no use for
    # checking whether a face reads.
    m.diffuse_color = colour
    m.roughness = roughness
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
    An open shell swept between two angles. This is Rosie's cardigan: worn
    open, so it is an arc and not a tube, and it has real thickness at the front
    edges where a knit would.

    It is a shell. It has an inside and an outside and nothing between them, so
    anything passing through it needs its own cap or you see the join. That is
    what her deltoids are for.
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


def blob(name: str, radius: float, segs: int = 10):
    """
    A sphere, for the bits of a face and for the caps that bridge one limb
    section into the next.

    Squash it with the object's own scale. Face features are these laid on the
    skull rather than sockets cut into it, because a socket wants a boolean and
    a boolean wants topology these meshes have not got. They read on colour,
    not relief: anything modelled deep enough to show in a clay render is a
    lump once it is skin coloured.
    """
    r = radius
    profile = [
        (0.0, -r), (0.5 * r, -0.866 * r), (0.866 * r, -0.5 * r), (r, 0.0),
        (0.866 * r, 0.5 * r), (0.5 * r, 0.866 * r), (0.0, r),
    ]
    return lathe(name, profile, segs)


def joint(name: str, radius: float, parent, material, loc=(0.0, 0.0, 0.0), segs: int = 10):
    """
    The lens that bridges two limb sections, or a limb into a torso.

    Every joint on a segmented figure needs one. Rosie shipped without a
    shoulder cap and her arms read as detached the moment she was standing in a
    room, because the sleeve crossed the cardigan shell and its end cap ended
    up floating outside the knit.
    """
    r = radius
    profile = [(0.0, -r), (0.69 * r, -0.58 * r), (r, 0.0), (0.69 * r, 0.58 * r), (0.0, r)]
    return link(name, lathe(f"{name}_m", profile, segs), parent, material, loc)


def save_and_export(root, blend_name: str, glb_name: str, skip=frozenset()) -> None:
    """Write the .blend and re-export the .glb. Viewport-only objects in `skip`."""
    blend_path = BLEND_DIR / blend_name
    glb_path = OUT_DIR / glb_name

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    BLEND_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.name in skip:
            continue
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root

    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
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
    print(f"Exported {glb_path}")
    print(f"Saved {blend_path}")
    print(f"objects={len(bpy.data.objects)}")
