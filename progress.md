Original prompt: Lets get started with the next phases.

Historical implementation log only. Current scope and status live in
`docs/ROADMAP.md`; the step numbers below came from the retired interior asset
pipeline and are not current project phases.

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
- Parlour furniture is complete against `images/mood/1a-parlour.png`: two
  maroon fabric armchairs, a worn brown sofa, dark timber low table, shaded
  standard lamp and off CRT in a timber cabinet. The open notebook and pen on
  the table preserve the gameplay evidence holder ID `diary`.
- All six source models were fetched through BlenderMCP/Sketchfab and cached in
  ignored `assets/sourced/`; reproducible UIDs, authors and CC-BY attribution
  are recorded in `docs/CREDITS.md`.
- The imported holders preserve `armchair`, `parlourTable`, `diary`,
  `television` and `standardLamp`. The two chairs share one source and one
  procedural worn-maroon upholstery definition rather than duplicating data.
- Final combined validation passed: reception 109 meshes, parlour 73,
  staircase 143, first-floor hall 143 and room 1A 133; parlour furniture stays
  within x -6.47..-1.98m, with 0 unmaterialled meshes and 0 meshes without UVs.
- All five final regression renders were visually inspected. The parlour check
  shows the complete furniture group, exposed diary, window light and clear
  hall-side floor; its exposure lift is preview-only.
- Unit A step 4 is complete. Next scoped task: step 5, add/allocate the separate
  non-overlapping lightmap UV layer at the locked per-space resolutions.
- Added `tools/blender/unwrap_unit_a.py` for Unit A step 5. It creates a fresh
  `Lightmap` channel without replacing any albedo UV, assigns each opaque mesh
  to one deterministic per-space atlas cell and saves the ignored Unit A scene.
- Final atlas allocation: room 1A 125 meshes at 2048 (70.1% cell occupancy),
  parlour 68 at 2048 (70.0%), reception 106 at 1024 (71.2%), staircase 143 at
  1024 (71.5%) and hallway 143 at 512 (69.0%): 585 unique bake meshes total.
- Strict triangle-area validation caught real smart-projection crossings in
  several imported meshes and two degenerate diary triangles. Those meshes use
  Blender's face-level lightmap pack fallback; the final scaled atlases contain
  no overlaps, degenerates or UVs outside 0..1.
- Visually inspected all five coloured allocation diagnostics under
  `shots/unit-a-lightmap-uv-*.png`; the cells are isolated and match the locked
  dwell-time resolutions. No lighting was baked in this step.
- Production build passed and the project-native runtime capture rendered room
  1A correctly. The existing Vite chunk-size warning remains unchanged.
- Unit A step 5 is complete. Next scoped task: step 6, bake Diffuse Indirect per
  object group at 64 samples for iteration, then 256 for the accepted final.
- Added `tools/blender/bake_unit_a.py`: five resumable space-group bakes,
  Diffuse Indirect without direct or colour, Metal GPU enforcement, persistent
  data, compositor OIDN, finite/lit-pixel checks and bake-only previews.
- The first 64-sample pass exposed two problems before the final: linked library
  materials silently rejected bake image assignment, and dense imported meshes
  could have thousands of subtexel UV triangles. Baking now uses temporary local
  material copies; the allocator falls back to face packing when texel coverage
  is inadequate. The opaque sofa was also separated from true transparent
  exclusions and added to the parlour atlas.
- Reallocated and validated 586 unique opaque meshes, then reran the complete
  64-sample pass. All five bake-only previews were inspected; black triangle
  dropouts were removed and indirect falloff is coherent across each space.
- Final 256-sample timings: room 1A 315.6s, parlour 178.4s, reception 148.5s,
  staircase 195.5s and hallway 164.3s. Every EXR passed finite, non-black and
  lit-pixel checks at its locked resolution.
- Visually inspected all five final diagnostics under
  `shots/unit-a-bake-final-*.jpg`. Unit A step 6 is complete. Next scoped task:
  step 7, export one optimized interior GLB under the 60MB combined budget and
  replace the runtime lodge/room split without changing gameplay IDs.
- Production build and the project-native room 1A runtime capture passed after
  the Blender-only bake work; the existing Vite chunk-size warning is unchanged.
- Added `tools/blender/export_unit_a.py` and shipped Unit A as one optimized
  31.14MB GLB plus five DWAA half-float EXRs, 34.12MB combined against the 60MB
  budget. The export contains 766 nodes, 601 mesh primitives, no cameras or
  lights, all required gameplay IDs, and `TEXCOORD_1` on all 586 baked meshes.
- Added `src/world/unit-a.ts` to load the combined interior once, restore the
  room 1A/parlour/reception/staircase/hallway atlases on UV channel 1 and expose
  the existing interaction targets. The lodge's temporary interior kit is now
  detached after the authored scene loads; its collision, floors, facade,
  front door, tape, neon, Commodore and uniforms remain in place.
- Room 1A now accepts the already-loaded Unit A scene, so its object registry,
  collision, drawer pad and separately loaded Crystal continue to use the same
  gameplay contract without loading the retired standalone room a second time.
- Production build passed. Runtime captures for room 1A, reception, parlour,
  staircase and first-floor hallway were opened and inspected. The upper flight
  visibly reaches a real landing with continuous banister and hallway, and all
  startup interaction-ID checks passed. The existing Vite chunk-size warning is
  unchanged.
- Unit A step 7 is complete. Next scoped task: Unit B exterior art, realtime
  only, beginning with the street and facade. Do not bake Unit B.
- Added the seven book-companion concept frames under `images/concept-art/`.
  The two lodge-front images are now the exterior architecture/material target:
  Victorian silhouette, arched openings, iron lace, distressed render, pink and
  cyan neon and wet-looking street. Preserve the fixed 3pm playable lighting.
- Project constraint clarified: this is a short independent companion piece for
  a book release, not a commercial game. Visual quality is the priority; no new
  systems or production pipeline are justified by the exterior deliverable.
- Scene 1 lodge exterior is in progress. The concept-led Blender facade now
  supplies the two-storey arched elevation, full iron balcony, distressed
  render, exposed side brick and pink/cyan signs over the existing collision,
  route, door and evidence. The first integrated exterior capture was opened
  and inspected; the old blank facade has been replaced.
- Added the Claude of Duty-style frame-time distribution profiler. With the
  authored facade loaded, a 240-frame moving-camera run measured 13.6 ms p50,
  14.8 ms p95 and 15.9 ms p99, with no hitches and no runtime shader compiles.
  Shader prewarming is therefore not justified. Remaining exterior work is the
  verandah, back yard and street dressing, not a new rendering system.
- Corrected the authored upper balcony/wraparound verandah junction. Its slab,
  posts and iron lace now terminate on the existing return's outer edge instead
  of crossing the middle of the playable deck; the corner route and collision
  remain continuous. Added a fixed regression shot for this junction.
- Replaced the temporary box-built car with an authored VP/VR-era Commodore
  based on the supplied front, side and rear references. The 0.31MB GLB keeps
  the existing story interaction proxy and collision while adding the correct
  long four-door silhouette, glasshouse, trim, pinstripe, lights and wheels.
- Production build and final exterior capture passed. A 240-frame moving-camera
  profile measured 14.0 ms p50, 16.2 ms p95 and 18.2 ms p99 with no hitches,
  browser errors or runtime shader compiles. The remaining Scene 1 exterior
  deliverable is back-yard and street dressing/polish.
- Corrected the Commodore after front/rear review. Removed the painted cabin
  side geometry that intruded across the glass, trimmed the roof skin to both
  screen headers and added explicit dark A/B/C pillars and window surrounds.
  Rebuilt the rear around a shallow boot lid, broad horizontal lamp panel,
  recessed plate and integrated bumper instead of the previous crude tail box.
- Added fixed front and rear Commodore regression views. Both in-game captures
  were visually inspected and the production build passed. The generic skill
  client still cannot resolve its own Playwright import; the project-native
  Playwright capture completed both real WebGL checks successfully.
