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
- Added the parlour shell to the same Unit A scene: carpet, nicotine plaster,
  dark timber trim, two fixed double-hung street sashes and the open hall entry.
  Furniture remains deferred to Unit A step 4.
- Generalised the reception sash builder so both rooms use the same fresh-geometry
  definition without linked bake geometry.
- Rebuilt and visually inspected both `shots/unit-a-reception.jpg` and
  `shots/unit-a-parlour.jpg`.
- Blender validation passed for the combined scene: reception 56 meshes,
  parlour 65 meshes, 0 unmaterialled, 0 without UVs.
- Production build passed. The project-native runtime capture also completed and
  room 1A rendered correctly; the existing Vite chunk-size warning remains.
- Next scoped task: assemble the central staircase in this same Unit A scene.
  Do not source furniture yet.
