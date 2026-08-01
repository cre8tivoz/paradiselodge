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
- Central staircase builder added from the locked `lodge.ts` dimensions: 17
  treads plus the final landing riser, 0.28 m going, 3.45 m floor-to-floor,
  inset carpet runner, brass rods, open-side balustrade and adjacent passage.
- First staircase render caught the shared flight called on the wrong width
  axis, which displaced its timber treads into the parlour. Corrected to an
  X-width/Y-going flight before acceptance; no bad geometry was retained.
- Replaced the first block-stepped rail preview with continuous raked string
  and handrail prisms; the turned balusters remain fresh bake-safe geometry.
- Final staircase render accepted: the flight, landing, adjacent passage,
  double-height walls, upper ceiling, raked joinery and hall-side trim read as
  one enclosed space. Reception and parlour regression renders remain clean.
- Combined Blender validation passed: reception 56 meshes, parlour 65 meshes,
  staircase 146 meshes, 0 unmaterialled, 0 without UVs.
- The shared `kit_arch_check.py` scene was rebuilt and visually inspected after
  extending `stair_flight`; its default positive-direction call remains valid.
- Production build passed and the project-native browser capture rendered room
  1A correctly. The existing Vite chunk-size warning is unchanged; no new
  runtime failure appeared.
- Next scoped task: assemble the first-floor hallway in this Unit A scene, then
  bring in the existing room 1A shell. Furniture sourcing remains deferred.
- First-floor hall builder added: full U-turn landing, carpeted gallery, open
  stairwell banister, two closed neighbour doors, upper trim and ceiling. The
  hall render camera is placed on the landing to prove the circulation path.
- First hall render visually confirms the landing turns right into a continuous
  upper gallery with the stairwell banister on the left and neighbour doors on
  the right. The bright front-side opening is the pending room 1A interface.
- Extended the shared door/architrave definitions with an optional base height
  so upper-storey doors remain the same fresh bake-safe geometry. The default
  ground-floor architecture check was rebuilt and remains visually correct.
- Combined Blender validation passed: reception 56 meshes, parlour 65 meshes,
  staircase 143 meshes, first-floor hall 140 meshes, 0 unmaterialled, 0 without
  UVs. The ignored working scene was restored to `assets/blender/unit-a.blend`.
- Production build and project-native runtime capture passed. The existing Vite
  chunk-size warning remains unchanged; room 1A still renders correctly.
- Next scoped task: bring the existing room 1A shell into Unit A and close the
  bright hall-side interface visible in the hallway check render.
- Overlap audit moved the rear landing entirely under the hallway owner and
  stopped the staircase's right wall at first-floor height, so the upstairs
  door openings are real and no duplicate coplanar bake surfaces remain there.
- The opened wall exposed sunlight tracing through decorative gaps in the
  shared panel-door leaf. Added its missing opaque timber core; rails and inset
  panels remain the visible face while closed doors now block direct light.
- Room 1A integration reuses the complete shipped `public/models/room1a.glb`
  once, including its already-sourced furniture and preserved object IDs. No
  room 1A asset is rebuilt or sourced again; only reception/parlour shopping is
  still deferred.
- The first fully enclosed hall preview was too dark before the shared indirect
  bake. Stair/hall check renders now use preview-only exposure compensation;
  the saved Unit A scene remains at the locked 2.8 exposure.
- Unit A step 3 is complete: reception, parlour, central staircase,
  first-floor hallway and the complete room 1A now form one contiguous Blender
  scene. The upstairs hall terminates in solid architecture and opens into 1A.
- Final combined validation passed: reception 56 meshes, parlour 65,
  staircase 143, first-floor hall 143 and room 1A 133; 0 unmaterialled meshes
  and 0 meshes without UVs. All five check renders are visually accepted.
- Next scoped task: Unit A step 4, source and place reception furniture. Room
  1A is already complete and must not be sourced again.
- Reception furniture is complete. Sketchfab/BlenderMCP supplied the panelled
  counter, bakelite phone, open hotel ledger and glass ashtray; source IDs and
  CC-BY attribution are recorded in `docs/CREDITS.md`.
- No credible downloadable period pigeonhole rack survived the search, so its
  fitted 8x4 timber joinery was built to the locked rear-wall dimensions. The
  phone source's presentation table/backdrop were discarded and its retained
  phone/cord were retinted black bakelite.
- Reception validation now proves the desk leaves a 1.57m hall-side circulation
  gap. Combined validation passed: reception 109 meshes, parlour 65,
  staircase 143, first-floor hall 143 and room 1A 133; 0 unmaterialled meshes
  and 0 meshes without UVs.
- All five regression renders were visually inspected. The reception check
  clearly shows the desk, ledger, phone, ashtray, fitted key rack and open
  circulation side; its exposure lift is preview-only and the saved scene
  remains at 2.8.
- Next scoped task: continue Unit A step 4 with parlour furniture only.
