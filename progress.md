Original prompt: Lets get started with the next phases.

## 1 August 2026

- Scope: Unit A step 3, reception assembly first. Preserve all closed gameplay systems.
- BlenderMCP is listening on `127.0.0.1:9876`; Sketchfab status must be checked without printing credential values.
- BlenderMCP scene and Sketchfab integration verified. Credential values were not printed.
- Added `tools/blender/build_unit_a.py`: reception shell only, using linked Unit A materials and shared joinery. Furniture remains out of scope until step 4.
- First render verified the shell after correcting its camera. Blender metadata then exposed zero UV layers on all generated architecture.
- Added metre-scaled box UV generation to `kit_arch.assign`; this is the albedo UV layer. The later bake still adds its own non-overlapping lightmap layer.
- Rebuilt and visually inspected `shots/kit-arch.jpg`; the boards, carpet and timber maps now tile at real scale.
- Rebuilt and visually inspected `shots/unit-a-reception.jpg`; the open hall entry, street sash, trim, wall thickness and direct-light path are present.
- Final Blender validation passed: 56 meshes, 0 unmaterialled, 0 without UVs. The ignored working scene is `assets/blender/unit-a.blend`.
- The generic web-game client stalled in its injected virtual-time loop; the project-native `tools/shot.mjs` path completed and its runtime 1A capture was visually inspected with no new console failure.
- Next scoped task: add the parlour shell to this same Unit A scene. Do not source furniture until all contiguous shells are assembled.
