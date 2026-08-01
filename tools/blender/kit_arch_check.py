"""
Build one of everything in `kit_arch.py` and render it.

    exec(open('tools/blender/kit_arch_check.py').read())

Writes `shots/kit-arch.jpg`: a wall with a doorway, skirting and picture rail,
and a flight of stairs with a balustrade beside it, all on the real linked
materials.

This exists because every failure in this pipeline is silent and two of them
turned up here. A door built by rotating its corner coordinates and feeding
them back in as a min and a max is an axis aligned box of a turned door, and it
rendered as a slab standing across the opening. A stair with its risers at the
back of each tread is an open tread stair you can see the wall through. Neither
raised anything. Both were obvious in one render.

It throws the current scene away, so save first.
"""

import bpy, math, os
ROOT = "/Users/habibi/Documents/CLAUDE/paradisegame"

# Fresh scene, then link the shared library so the demo uses the real surfaces.
kept = {}
for k in ("blendermcp_use_polyhaven","blendermcp_use_sketchfab","blendermcp_sketchfab_api_key",
          "blendermcp_use_hyper3d","blendermcp_hyper3d_mode","blendermcp_hyper3d_api_key",
          "blendermcp_port","blendermcp_server_running"):
    if hasattr(bpy.context.scene, k): kept[k]=getattr(bpy.context.scene,k)
bpy.ops.wm.read_homefile(use_empty=True)
for k,v in kept.items():
    try: setattr(bpy.context.scene,k,v)
    except Exception: pass

LIB = f"{ROOT}/assets/blender/materials.blend"
with bpy.data.libraries.load(LIB, link=True) as (src, dst):
    dst.materials = list(src.materials)
mats = {m.name: m for m in bpy.data.materials}
print("linked:", sorted(mats))

exec(open(f"{ROOT}/tools/blender/kit_arch.py").read())

timber = mats["timber_dark"]
plaster = mats["plaster_nicotine"]
carpet = mats["carpet_runner"]
boards = mats["boards_worn"]

# A back wall to put the joinery against, with a doorway hole left in it.
for tag, x0, x1 in (("l", -3.0, -0.55), ("r", 0.55, 3.0)):
    ob = cube(f"wall_{tag}", (x0, 0.0, 0.0), (x1, WALL, 2.9)); assign(ob, plaster)
ob = cube("wall_over", (-0.55, 0.0, DOOR_HEIGHT), (0.55, WALL, 2.9)); assign(ob, plaster)
ob = cube("floor", (-3.0, -3.2, -0.02), (3.0, 0.0, 0.0)); assign(ob, boards)

door_unit("door", timber, "x", 0.0, 0.0, WALL, open_angle=-0.62)
skirting("skirt_l", timber, "x", -3.0, -0.64, 0.0, -1)
skirting("skirt_r", timber, "x", 0.64, 3.0, 0.0, -1)
picture_rail("rail", timber, "x", -3.0, 3.0, 0.0, -1, 2.25)

# The flight runs in -Y (toward the camera) and is 1.3 wide in X.
treads, risers = stair_flight("stair", carpet, timber, "x", -2.9, -1.6, -2.6, 0.0, 7)
# The rail runs along the GOING, not the width. Passing the width axis here is
# what put a raking balustrade across the treads instead of beside them.
balustrade("bal", timber, "y", -2.6, -2.6 + 7 * GOING, -1.62, RISE, rise_per_u=RISE / GOING)
newel("newel", timber, -1.62, -2.66, 0.0, 1.05)

print("objects built:", len(bpy.data.objects))

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.scene.collection.objects.link(cam)
cam.location = (4.4, -6.2, 2.35)
cam.rotation_euler = (math.radians(82), 0, math.radians(34))
cam_data.lens = 30
bpy.context.scene.camera = cam

sun_data = bpy.data.lights.new("sun", type="SUN")
sun_data.energy = 3.5
sun = bpy.data.objects.new("sun", sun_data)
bpy.context.scene.collection.objects.link(sun)
sun.location = (3, -5, 6)
sun.rotation_euler = (math.radians(48), math.radians(10), math.radians(-35))

scn = bpy.context.scene
scn.render.engine = "CYCLES"; scn.cycles.device = "GPU"; scn.cycles.samples = 64
scn.render.resolution_x, scn.render.resolution_y = 1100, 780
scn.render.image_settings.file_format = "JPEG"
scn.view_settings.view_transform = "AgX"
if scn.world is None:
    scn.world = bpy.data.worlds.new("World")
scn.world.use_nodes = True
scn.world.node_tree.nodes["Background"].inputs[0].default_value = (0.45,0.5,0.58,1)
scn.world.node_tree.nodes["Background"].inputs[1].default_value = 1.2
out = f"{ROOT}/shots/kit-arch.jpg"
scn.render.filepath = out
bpy.ops.render.render(write_still=True)
print("wrote", out, os.path.getsize(out))
