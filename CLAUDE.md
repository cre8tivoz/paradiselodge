# CLAUDE.md — The Paradise Lodge

Standing rules. Read every session. `docs/BRIEF.md` is the design spec, `docs/ASSETS.md` is the art and audio list.

---

## How to report

**Quiet by default.** Chat costs money. Do the work, then give the short version.

- No narration of what you are about to do, and no recap of what you just did if the diff already says it
- When a step lands: what changed, anything that needs a decision, and stop. A few lines
- Detail belongs in the commit message and the code comments, not in chat
- Speak up properly when it actually needs attention: a real bug, a design conflict, an assumption that could be wrong, or a choice only the author can make
- Do not ask permission to continue an agreed step. Finish it

## Hard rules — do not argue with these

These exist because every session so far has wasted tokens questioning them.
You will not be the one that gets it right.

1. **The design is locked.** BRIEF.md and ASSETS.md are the single source of
   truth. Do not suggest alternatives, do not ask if the author is sure, do not
   propose improvements. Every word in those files was chosen on purpose.
2. **Decisions taken during the build are settled.** The section at the bottom
   of this file exists exactly so you do not re-open them. If it is in that
   list, the answer is no.
3. **The build order is the build order.** Scene 1 is 80% of the engine.
   Do not scaffold scene 2. Do not suggest refactoring for reusability.
   Do not leave hooks for things that do not exist yet.
4. **`three` plus loaders and compression. Nothing else.** Loaders, KTX2 and
   Meshopt are in. A framework, a physics engine, a state library, a post stack
   or anything with a UI in it is out. Do not evaluate one. Do not mention one.
   (This rule used to read "one runtime dependency". The render reset revoked
   that half of it and nothing else.)
5. **No physics engine.** No Rapier, no Cannon, no Ammo. Miller walks on a
   navmesh and raycasts at things. That is the whole system.
6. **No combat.** Not in the lodge, not in the chase, not in the bar.
   If you find yourself writing a health bar, stop.
7. **No new events.** The vocabulary in CLAUDE.md is complete. If you need to
   communicate something that is not in that list, something else is wrong.
8. **Do not reorder the file structure.** Every subsystem has its directory.
   Your job is to write code inside it, not move things around.
9. **Do not add npm scripts, config files, or tooling.** Vite, TypeScript,
   three. That is the stack. The tsconfig is strict. Done.
10. **Do not leave TODO comments.** If something cannot be done now, say so
    in the commit message and move on. A TODO in code is a promise you will
    not keep.
11. **Source assets. Do not generate them and do not model them.** Poly Haven
    and Sketchfab, filtered to downloadable and CC or CC-BY, recorded in
    `docs/CREDITS.md` as you go. Prefer low to mid poly with clean UVs over
    high-poly photogrammetry: a scan has unusable UVs and will not bake. If
    nothing suitable exists, say so and stop. Do not improvise a kit box, do not
    generate a texture procedurally, and do not spend a session modelling
    furniture by hand.
12. **Stop tuning lights.** The look target is `images/mood/1a-target.png` and
    it is a photograph. It is reached by baking indirect light in Cycles, not by
    another pass over sun intensity, fill, or exposure. If you find yourself
    reaching for an `AmbientLight`, you have misread the reset.

## Output style

Terse. No preamble, no summary, no "I'll now...", no recap of what you just did.
Never explain code you just wrote unless asked.
When a step is done, say one line: what changed and whether it runs.

---

## What this is

A first-person detective game. St Kilda, 26 February 1994. Five scenes. No combat.

The player is Detective Graham Miller. You never see him until the last shot of the game.

---

## Status

Last updated 1 August 2026. **Scene 1's engine is finished, room 1A is through the render reset, and Unit A step 3 is under way.** The reception shell is assembled in the shared interior scene; the rest of the lodge is not. Update this whenever work resumes.

Gameplay is correct and is not to be touched. `src/interact`, `src/case`, `src/dialogue`, `src/npc`, `src/core`, `src/player`, `src/ui`, `src/audio` are closed. Evidence copy, gate order and the event bus are closed. The live job is `src/materials`, `src/render`, and the geometry in `src/world`. See *The render reset* below before anything else.

**The live job is Unit A: the lodge interior, one Blender scene, one bake.** Room 1A proved the pipeline and its process is not repeated per room. See *Extending the pipeline* at the bottom of this file.

Steps 1 and 2 are done and neither produced anything walkable, which is the shape of this unit: the shared surfaces and the shared joinery are made once so four rooms can draw on them. **Step 3 is under way: reception is the first assembled space. Next is the parlour shell, in the same scene.**

Repo is `github.com/cre8tivoz/paradiselodge`, branch `main`. Live at `https://paradiselodge-game.pages.dev` (Cloudflare Pages project `paradiselodge-game`). Custom domain `lodge.billyhaddad.au` not wired yet. Deploys are manual: `npm run build && wrangler pages deploy dist --project-name paradiselodge-game --branch main`.

| Step | State |
|---|---|
| 1. Player controller | Done. Walk, crouch, lean, mouse look, pointer lock |
| 2. Look raycast, one-line description | Done |
| 3. Hand rig, gloves, one examine animation | Done |
| 3b. Hand mesh | Done. Blender source + shipped glTF. See Hand mesh below |
| 4. Examine tier two | Done. **Press F** starts the clip; it runs to the end and files evidence. Esc cancels. (Was hold-to-cancel; that made the verb unusable under pointer lock — see Play fixes below) |
| 5. Case file, evidence IDs, notebook UI | Done. N opens. Examine files. Idempotent |
| 6. Room 1A, geometry, fixed 3pm sun | Done, then rebuilt by the render reset. Sourced furniture, assembled and baked in Blender, shipped as one `.glb`. See *Room 1A ships as one file* below |
| 7. Crystal + examine set | Done. Modelled Crystal glTF. Body/head/needle/sling examinable (look pads). Dress texture wired. Diary and hammer wait for parlour and yard |
| 8. Dialogue system | Done. Node graph, runner, DOM panel. Rosie is its first real user |
| 9. Approach and ground floor | Done. Street, steps, neon letterforms, facade, hall, reception, parlour, staircase, first-floor hall. 1A is placed in it. See below |
| 10. Verandah and back yard | Done. Iron lace off 1A, external stairs, yard, Hills hoist, shed, hammer. See below |
| 11. Rosie | Done. Placed, talkable, relocates on gate `body`. Two graphs. See below |
| 12. Moretti | Done. Breadcrumb follow, the tag verb, bag and hide. Diary is built and both taggables work. See below |
| 13. Objective gates, scene exit | Done. Eight gates, none of them locks. Theorise with Moretti ends the scene. See below |
| Audio | Done for scene 1. Four ambience beds, footsteps, foley, the 1A tone. All synthesised. See below |
| 14. Scene manager, save on boundary | Done. `src/core/scene.ts` + `src/core/save.ts`. Fade + localStorage on `scene:complete`. Scene 2 not built, so complete holds on black |
| 15. Cold open | Done. Title card (`src/ui/title-card.ts`), kit Commodore, two uniforms, tape lift, verbs locked until hall gate `entry` |

**Scene 1 engine checklist is complete.** Play bugs found in live testing were patched (navigation, examine, reception talk). The engine is done. The picture is not, and the picture is now the whole job.

---

## The render reset

**Done, all seven steps, for room 1A only.** What it settled is below and it is not
re-openable. What it does *not* cover is the rest of the building, which goes
through Unit A at the bottom of this file and does not repeat this process.

Four days went into tuning a directional light against `images/mood/1a-target.png` and it never got close, because the target is a photograph and the thing it has that the render did not is bounced light. That cannot be tuned in. It has to be computed once, offline, and baked.

Three standing instructions were wrong and are **revoked**. They are struck out in ASSETS.md too.

| Revoked | Now |
|---|---|
| "Everything here is authored. No procedural generation." | Source assets. Poly Haven and Sketchfab, CC0 / CC-BY, credited in `docs/CREDITS.md` |
| "One runtime dependency: `three`." | Loaders and compression are allowed. GLTFLoader, KTX2Loader, RGBELoader, Meshopt |
| Procedural surfaces off a single albedo tile | Full PBR sets only. Albedo, normal (OpenGL), roughness, AO |

**The hardware is an Apple Silicon Mac. Cycles runs on Metal, not OptiX.** Every bake number below is set for that. Do not raise them.

### Steps

One step per session. Verify with `tools/shot.mjs`. Commit after each with a real message. If a step is blocked, say so and stop, do not start the adjacent one.

| Step | State |
|---|---|
| 1. IBL and colour | **Done.** HDRI + PMREM, AgX, no fill lights. See *The light rig is an HDRI and one sun* |
| 2. One real material | **Done.** Poly Haven `wood_planks`, all four maps on a `MeshStandardMaterial`, `src/materials/pbr.ts` |
| 3. Source the furniture | **Done.** Fourteen models off Sketchfab through the Blender MCP, all CC-BY, all in `docs/CREDITS.md` |
| 4. Assemble 1A in Blender | **Done.** `tools/blender/build_room1a.py` |
| 5. Bake in Cycles | **Done.** Diffuse Indirect, three 2048 atlases, `tools/blender/bake_room1a.py` |
| 6. Export and load | **Done.** `tools/blender/export_room1a.py`. 10.27MB against a 25MB budget. `room1a.ts` is a loader |
| 7. Reconnect | **Done.** Every id resolves, from the deep child mesh a ray actually hits. Nothing in `src/case` or `src/interact` was edited |

### What the reset shipped, and where it deviated from the plan

Three things came out different from what the steps above predicted. All three
are settled and the reasons are load-bearing.

- **The lightmaps are half float EXR, not KTX2.** KTX2 wants an encoder and
  `toktx`, `basisu` and `gltfpack` are all absent, and rule 9 says not to add
  tooling. `EXRLoader` ships inside `three` alongside the loaders the reset
  already allowed. DWAA compression takes a 50MB bake to under 1.3MB, and half
  float carries indirect irradiance — which tops out around 20 — with decimal
  places to spare. **The furniture textures inside the `.glb` are JPEG** at
  quality 82, capped at 1024, and 512 for normal and roughness
- **`environmentIntensity` is 0.3, not the 1 this document predicted.** The
  prediction assumed the bake would say how much sky each surface sees. It does,
  for 1A. The environment is scene-wide and 1A is the only baked room in the
  building, so 1 would flood everything else. **It goes to 1 when Unit A lands**
  and the whole interior is baked
- **Geometry was never the cost.** The room came back at 42MB with the geometry
  accounting for almost none of it. Textures are the entire budget. Reduce
  resolution before you reduce triangles, every time

### The bake

**Diffuse Indirect, not Combined.** That bakes the bounce and the colour bleed and leaves the direct sun realtime, so the sun angle stays tunable afterward without rebaking. It is the difference between four bakes and twenty.

- Render device: Preferences, System, Cycles Render Devices, Metal, GPU selected. **Confirm this before baking**
- Second UV channel, lightmap pack, no overlapping faces
- 2048 x 2048 per major surface group. Not 4096
- Margin type Adjacent Faces, margin 6px
- Denoise with OpenImageDenoise. Not OptiX, that is NVIDIA only
- Persistent Data on
- **Iterate at 64 samples with denoise on.** Layout, light direction and UV problems are all visible at 64
- **Final pass only: 256.** Above that, with denoising, the difference is not visible on Metal and the time is roughly linear
- Close other applications for the final bake
- Export `.exr` at half float, DWAA. Not KTX2, there is no encoder on this machine

A few minutes per iteration bake, longer for the final. **More than about twenty minutes means the render device is on CPU. Stop and check.**

### Every failure in this pipeline is silent

Not one of the things that went wrong in steps 4 to 7 raised an error. Every
one of them reported success and wrote a plausible-looking file. **Verify
numerically or with a purpose-built render. Do not verify by eye and do not
trust a return code.** That is what `preview()` in `bake_room1a.py` is for: it
puts the lightmap back on the geometry as emission, so you are looking at the
map rather than at a room that happens to be lit.

The specific traps, because they will all recur on Unit A:

- **`bpy.ops.object.bake` starts a background job** when it is invoked from a
  viewport context. It wrote three black 2048 squares in four seconds and said
  it was fine. Pass `"EXEC_DEFAULT"`
- **Cycles wants the bake target image node active *and* selected.** Active
  alone cancels with "no active and selected image texture node found"
- **Cycles does not denoise a bake.** `cycles.use_denoising` is the render
  denoiser and does nothing here. Denoise through the compositor
- **Blender 5 moved the compositor.** `scene.node_tree` is now
  `scene.compositing_node_group`, File Output takes `directory` / `file_name`
  rather than `base_path` / `file_slots`, and it only offers multilayer EXR. A
  Viewer node plus a numpy readback is what works
- **`smart_project` then `pack_islands` in multi-object edit mode silently does
  not pack.** The bed and the wardrobe each kept the whole 0–1 square, overlapped
  everything else and baked pure black. Replaced with a deterministic shelf
  packer weighted by the square root of world surface area, which is also
  reproducible across runs
- **A prefix match misses a sourced model**, because the holder is an empty
  named `mattress` and its children are called things like `Box001_03 -
  Default_0`. Collect through the holder
- **`image.has_data` is False for a packed image** until something decodes it,
  so a size-cap loop that skips on it caps a different set of textures depending
  on what ran before it. The same export capped 33 textures standalone and 13
  after a bake, and shipped 4k normals both times it was 13
- **Scaling an image buffer without re-packing changes nothing** in the export.
  Every texture off a sourced `.glb` arrives packed
- **A `Box3` bounding box is the wrong anchor for soft furnishing.** The bottom
  of a bedspread is its drape hem and the top is a fold crest, so both ends lie.
  Anchor by median vertex height over the footprint it rests on. A pillow in the
  same import needs its own anchor, off its own lowest vertex

### Judging it

Against `images/mood/1a-target.png`. Not against "AAA", not against a memory of another game. A sourced mid-poly bed that bakes cleanly beats a photogrammetry scan that does not.

### What the reset does not touch

| | |
|---|---|
| **Gloves going on at the front door** | Done. Trigger on hall threshold, clip + foley. Leave it |
| **Play verification** | Examine → case file → Rosie parlour → tag → Moretti theorise still wants a clean pass on the live build after the press-F fix. Not a render job |
| **Textures already shipped** | Neon letterforms, magazines, map, Crystal dress stay until something sourced replaces them. `victor-record` waits for scene 2 |

### Play fixes (30 July, post step 15)

Landed after the cold open and first Cloudflare deploy. Settled — do not reintroduce the old behaviour.

- **Examine is press F, not hold-to-cancel.** `look:exit` must not cancel an in-progress examine (pointer-lock mouse drift was killing every clip before evidence filed). Look target freezes while a clip plays. Esc cancels. Evidence still files only on `examine:complete`
- **Pointer lock.** Esc calls `exitPointerLock()` and is never `preventDefault`ed. Prompt after cold open is a top hint bar, never a full-screen scrim over the look line
- **Stairs / first-floor hall.** Banister collision and rail stop three treads short of the back wall so the landing is walkable. Waist-height rail along the open stairwell on the first floor
- **Reception circulation.** Desk pulled clear of the hall opening (was &lt; player diameter). Looking at desk/ledger/phone/ashtray/keyRack while Rosie is at reception starts her graph. Desk look line says she is there
- **Room 1A layout.** Side table beside the dresser (was in the hall-door swing). Investigation props (frame, magazines, map, note, lighter) spaced on the dresser with raised invisible look pads. Crystal body files temple; head/needle/sling have look pads

### Cold open (step 15)

`src/ui/title-card.ts` — ST KILDA / 26 FEBRUARY 1994, white on black, fades then removes. Verbs (examine, talk, tag, notebook) stay locked until gate `entry` (hall box). Look still runs. Kit Commodore on the street; two VicPol kit uniforms at the tape; tape halves raise when Miller approaches.

### The lodge, and what step 9 left out

The route plays: footpath, marble steps, front door, hall, up the flight, turn at the top, 1A is the first door on the right. Down works as well as up.

Cold open street staging (Commodore, uniforms, tape lift) is in. Authored textures are on render, carpet, marble, neon letterforms.

Still scaffolding, and 1A is no longer part of it:

- **Kit geometry** for the shell, reception, the parlour, the stairs, the car, the uniforms, the iron lace and the yard. Unit A takes the interiors, Unit B takes the outside

Plan, so the numbers in `lodge.ts` mean something: **-Z is the street, +X is the side the verandah wraps onto.** The building runs x -6.5 to 6.4 and z 0 to 10.5. Ground floor at y 0, first floor at y 3.45. The flight climbs the -X half of the hall toward the back, so the passage runs *beside* it, not under it, and the stairwell above it is open on that side.

**Room 1A has two windows.** The verandah sash in its local +Z wall, and a second one in its local +X wall, which the quarter turn puts on the street elevation. A corner room with a blank front wall reads as a mistake from the footpath.

The front one is **shut and stays shut**, and it is look-only. The verandah sash is how Sterling got in and it is what the `sill` evidence hangs off; a second openable window in a room whose whole point is how somebody got in would be a second answer to a solved question.

It is cut through two walls: `FRONT_WINDOW_*` in `room1a.ts` is the hole in the room, `FIRST_WINDOW` in `lodge.ts` is the hole in the outside wall. **They have to be the same hole. Move one, move the other,** and keep the exterior one the larger of the two or the reveal cuts across the view out.

The front elevation is built by scanline over the opening rectangles, not as piers, because openings there stack as well as sit side by side: 1A's window is directly over the head of the reception window. Three bays and a centred entrance, upstairs lined up over downstairs.

**Room 1A is placed, not moved.** `buildRoom1A` takes a position and a rotation and applies them before it bakes any collision box, because `Box3.setFromObject` reads the matrix chain. It sits at (4.0, 3.45, 2.6) turned a quarter turn, which puts its local -Z door onto the first-floor hall and its local +Z sash out at x = 6.3. Front and side corner room, per BRIEF.md. **Do not set `room.group.position` after the fact.** The solids are already world space and will not follow.

### The verandah is a light budget

The verandah stands between the 3pm sun and 1A's sash. That is not a side effect, it is the whole geometry: the sun comes from +X, the sash faces +X, and the verandah is in between.

**Depth and eave height are lighting numbers, not taste.** Every metre of depth costs 0.43 off the height the sun can still reach on 1A's wall. A generous 2.3 metre verandah with a low eave was measured on the bedspread at 98 against 172 for open sun, which is most of the beam gone. It is now 1.7 deep with the eave at 6.4 and almost no fall, and the bed is back at 172.

Two more things are set out against the sun and not by eye:

- **The posts.** A post throws its shadow about 0.8 further along the wall than it stands, and the sash spans z 1.93 to 3.28, so no post may sit in z 1.05 to 2.6. They are at -2.1, 0.2, 2.7, 5.0, 7.05, and the beam comes through the gap between the second and third
- **The balustrade** tops out at 4.47, below the sill at 4.40 plus the rake, so its shadow lands on the wall under the window. Raise it and it starts cutting the beam

Move any of it and check the room, not the arithmetic.

**The geometry is settled. The pixel values are not.** 98 against 172 was measured under the old rig, with a sun at 8.0 and a pile of ambient behind it. The post spacing and the balustrade height still hold, because they are about where a shadow lands and not how bright it is, but do not treat those two numbers as a target to hit again. **1A has been rebuilt and baked and the verandah has not**, so the two are now lit by different eras of the pipeline. Re-measure when Unit B replaces the verandah, against the baked room rather than against those numbers.

**Room 1A has a verandah door.** BRIEF.md says a verandah runs off 1A, and something has to run off it: the sash opens a hand's width, `pushSash` gives another inch and stops, and the toe print on the sill is what the `sill` evidence is. A detective climbing out of the murder scene's window would also be wrong. It changes nothing about how Sterling got in. He came through the sash; this is the door he did not use.

### Where the floor is

Miller now walks up and down. It is not gravity and it is not a physics engine.

- **The walkable set is the navmesh.** `WalkableRegion` is a `Box3` and a `Surface`. `groundAt(x, z, fromY)` returns the highest lid within `stepUp` above and `stepDown` below the feet, or nothing. Nothing means the move is refused, so the street and the yard need no invisible walls: they run out of floor. The edge of a landing stops Miller instead of dropping him
- **A staircase is a run of floors a step apart.** Seventeen tread lids, `RISE` under `stepUp` so the flight is not a wall, and over half of `stepDown` so coming down does not skip a tread
- **Solids are filtered by height.** A box only blocks if it overlaps the band from `stepUp` above the feet to `PLAYER.height` above them. That is what makes a lintel headroom, a tread a step, and a ground-floor wall not also a first-floor wall
- **Feet snap, the eye trails.** `position.y` lands on the exact floor so collision stays honest; `stepOffset` decays the difference out of the camera, or every tread is a jolt
- **The surface comes from the region, every frame.** `setSurface` is only the fallback now

### The light rig is an HDRI and one sun

Step 1 of the reset. `render/environment.ts` owns the fill, `render/lighting.ts` owns the sun, and there is nothing else.

Two `AmbientLight`s and a `HemisphereLight` used to stand in for bounce. **Flat fill has no direction**, so a wall facing the sash and a wall facing away from it came back the same value, and nothing in the room had shape in it anywhere the sun did not land. That is the single biggest reason it read as a render. An HDRI is that same fill measured off the real world, so it has direction and colour, and it replaced every fill light in the scene in one commit.

**Do not put an `AmbientLight` back to lift the shade.** If shade is too dark that is `environmentIntensity`. If it is the wrong colour that is the wrong HDRI.

- **The HDRI is Poly Haven `balcony`, 2k, CC0.** `public/env/`. Partly cloudy morning-afternoon on a suburban deck: trees and a tiled roof, which is both plausible fill and a plausible thing to see out a first floor sash
- **Raw equirect on `scene.background`, PMREM output on `scene.environment`.** The prefiltered chain is small and smears if you use it as the backdrop. Two textures on purpose
- **Rotated 0.62π on both.** That puts the bright quarter of the sky on +X, which is the side 1A's sash faces and where the sun comes from, so the fill agrees with the beam instead of fighting it. It is also what puts trees rather than a blue shutter in the window
- **`environmentIntensity` is 0.3, not 1.** Three applies an environment map **with no occlusion at all**, so a wall two rooms deep takes the full open sky the same as the verandah does. At 1 the interior floods and goes flat, which is the ambient failure again, better coloured. It was 0.45 and came down to 0.3 when 1A's bake landed and started supplying that room's fill honestly. **It goes to 1 when Unit A lands** and every interior surface has a lightmap saying how much sky it can see. Not before: the environment is scene-wide and four of the five interiors are still unbaked
- **`LIGHTMAP_INTENSITY` is 14, in `room1a.ts`.** The bake as measured is 1. This is the dial between a physically correct map and a room that reads right, and it is high because `environmentIntensity` is low. **The two move together.** When the environment goes to 1 this comes down
- **AgX, not ACES.** Both stop the sun clipping. ACES pulls saturated highlights toward orange, and on nicotine walls under a warm sun that made every lit surface the same amber. AgX desaturates as it rolls off, so a blown sash stays white and the bedspread stays rose where the beam is on it
- **Exposure lives in `renderer.ts`, not `core/config.ts`, and is set last.** 1.0, after the environment intensity and the sun. It is not a designer tunable, it only means anything alongside those two
- **The sun is 4.2 and its `shadow.intensity` fudge is gone.** It was 8.0 to out-shout the ambient pile and 0.72 to fake bounce back into its own shadows. The environment does both honestly now

The procedural LUT grade pass (`render/grade.ts`, `render/grade-pass.ts`) is **deleted**. It was built to correct ACES on a scene lit by ambient. Over AgX and an environment map it corrects a problem that no longer exists. Do not reinstate it.

Still true from before, and still the reason the rig is scene-scoped:

**A `DirectionalLight` lights everything in the scene wherever it sits.** Only its shadow camera is local, which is why the rig came out of `room1a.ts` the moment there was a building around it. Direction is the vector that put the beam across Crystal's bed, carried into world space. Shadow texel size is `2 * extent / mapSize`, 16 and 4096. **Change one, check the other.**

**A window has to have something bright behind it** or the eye reads the black rectangle as the exposure reference and calls the room dim. That is `scene.background` now for every opening in the building. The blown card outside 1A's sash went with the rebuild; `ROOM_1A.daylight` survives in the palette as a material colour and is no longer a card in front of a window.

**The sash has glass, and it is unlit.** Both panes started as solid timber boxes filling the opening, so the window was opaque and cast a shadow across the whole room. Barely opaque, casts nothing. **The sourced sash keeps that**, and so must reception's and the parlour's in Unit A.

### What is kit vs modelled

| Modelled glTF | Sourced and baked | Still kit primitives |
|---|---|---|
| Miller's hand, Crystal, Rosie, Moretti | Room 1A, whole | Lodge shell, reception, parlour, stairs, Commodore, uniforms, iron lace, yard |

Kit is deliberate scaffolding. `world/kit.ts` builds boxes from **extents**. Every one of those boxes is on death row and 1A's are already dead. The rest go through Unit A and Unit B.

**Replacing kit means sourcing a mesh, not modelling one and not generating a texture for one.** Image generation does not produce game-ready meshes, and hand-modelling a wardrobe is a session spent badly when a CC-BY one exists.

### Room 1A ships as one file

`public/models/room1a.glb`, 7.2MB, plus three lightmap atlases at 3.1MB. 10.27
against a 25MB budget. `src/world/room1a.ts` loads it and registers props; it
builds no geometry except one invisible look pad. Same `buildRoom1A(placement)`
signature it always had, same `Room1A` shape, so `main.ts` did not move.

| Role | Path |
|---|---|
| Build the Blender scene | `tools/blender/build_room1a.py` |
| Bake it | `tools/blender/bake_room1a.py` |
| Export it | `tools/blender/export_room1a.py` |
| Blender source | `assets/blender/room1a.blend` — **gitignored, 190MB.** Rebuilt by the build script from `assets/sourced/`, which is rebuilt from the uids in `docs/CREDITS.md` |
| Raw bake | `assets/bake/*.exr` — gitignored, 50MB each |
| Shipped | `public/models/room1a.glb`, `public/textures/bake/*.exr` |

Four things about the loader are not obvious and all four cost a session:

- **`Texture.channel = 1`.** It defaults to 0, so the lightmap sampled through
  the wallpaper's UVs and printed the atlas cells on the walls as rectangles.
  `lightMap` and `aoMap` read the second UV set, which is `uv1` in current three
  and was `uv2` before r151
- **`flipY = true`.** Three turns `flipY` off for every texture arriving *inside*
  a `.glb`, which makes false look obviously right. These do not arrive inside
  it: they are EXRs Blender wrote bottom-left. False gave a black ceiling and put
  the floor's bounce on the wall behind the bed
- **Materials are cloned per `${source.uuid}:${group}`**, because one material
  (`timber`) spans two atlases and a shared `MeshStandardMaterial` can only carry
  one `lightMap`
- **The bake group lists are duplicated** between `room1a.ts` and
  `bake_room1a.py`. A glTF carries no idea of which atlas a mesh belongs to.
  **Change one, change the other**, or a mesh comes back unlit and nothing says so

**Layout:** dresser under the street window, side table beside it on the same
wall (not by the bed head — that sat in the hall-door swing). Frame, magazines,
map, note and lighter spaced along the dresser top, each with a raised invisible
look pad so the ray hits the prop and not the timber. Twelve examine clips still
apply. `SPREAD_TOP` is where Crystal lies and it is measured off the loaded
room, not off Blender and not off the old kit bed.

### Added outside the build order

- **Run.** Shift plus forward, standing only. 4.6 against a 2.2 walk. Refused when moving backwards, strafing, or crouched. No stamina, because there are no fail states. It exists for the scene 3 chase
- **Drag to look.** Pointer lock is still preferred and still tried first. Embedded preview panes and some sandboxed documents refuse it outright with `WrongDocumentError`, so holding the left button turns the view instead, and the prompt says which one you are getting

### Scaffolding, and when it goes

| Thing | Goes at |
|---|---|
| ~~Kit room 1A and its furniture~~ | **Gone.** Reset steps 3, 4 and 6 |
| ~~`ROOM_1A.daylight`, the blown card outside the sash~~ | **Gone.** There is a real sky behind the window |
| Kit reception, parlour, stairs, first-floor hall | Unit A. One Blender scene, one bake, one `.glb` |
| Kit facade / Commodore / uniforms / lace / yard tufts | Unit B, and **not baked.** Realtime only out there |
| `world/kit.ts` itself | When the last box is replaced. Not before, it is holding up four rooms |
| The pointer lock prompt and its CSS | When the real HUD lands |
| `window.__lodge` dev handle | Stays. It is `import.meta.env.DEV` only, and the capture tooling wants it |

---

### Rosie, placed

`src/npc/rosie.ts` is the only file that knows about `rosie.glb`. She is one figure with two stations, not two figures, because BRIEF.md's parlour beat only lands if the player was told where she would be and she is there.

| | Reception | Parlour |
|---|---|---|
| Stands at | (3.5, 0, 3.15), yaw 0 | (-3.05, 0, 0.75), yaw π |
| Graph | `rosie.reception` | `rosie.parlour` |

**She is not in `main.ts`'s static lookable list.** Her look line and her graph both change when she moves and `Lookable` is readonly by design, so she is registered through `registerRosie()` and re-registered on relocation. The HUD's description lookup now asks the registry instead of a snapshot map, or her line goes stale the moment she moves.

Her collision box goes into the solver **by reference**. The solver reads `min` and `max` every frame and precomputes nothing, so she rewrites that one `Box3` in place and it follows her.

**She relocates on gate `body` (needle + temple filed), not on reaching the first floor.** Gate 1 is Miller working the body in 1A with his back to the door, so the move cannot be seen. It also matches what she told him at the desk. An older note said first-floor; that was a stand-in and it is wrong — do not restore it.

The parlour has her standing at the street window rather than in an armchair. There is no seated pose on this mesh, and an armchair would put her below Miller's eyeline for the one conversation in scene 1 that carries information.

**The cigarette is not set dressing, so it is staged per station.** `Station.restLift` is where her hand sits between drags, 0 hanging and 1 at her mouth. Reception is 0.62 and the parlour is 0.1. That is a visibility number, not a mannerism: the counter is at 1.06 and a hanging hand is at 0.82, so an arm at rest puts the one prop she has behind the desk where nobody ever sees it. At 0.62 it rests at 1.23, nine centimetres clear.

#### The idle is procedural, and there are no clips on this mesh

She is rooted at both stations, so there is no walk cycle and no path. What is left is the difference between a mannequin and a person standing still: breath, weight shift, head tracking, and one drag on the cigarette every fourteen seconds.

The drag pose was **solved, not eyeballed**. Her shoulder is 0.57 from the cigarette and her mouth is 0.26 from her shoulder, so the arm has to fold to under half its length and there is very little slack in the joints. The `rotation.y` term is the one that is not obvious: her arm hangs down -Y, so that rolls the humerus about its own length and decides which way the elbow carries the forearm when it closes. Without it the shoulder has to drag the whole arm across the chest, which is a hand over the mouth and not a drag on a cigarette.

#### What placing her found in the mesh

All of it was invisible in Blender and obvious the moment she was standing in a room, which is the general lesson: **check a character in the engine, at the distance the player stands, before calling the mesh done.** All fixed in `build_rosie.py` and re-exported.

- **The arms were detached at the shoulder.** The elbow and the wrist each get a bridging lathe and the shoulder got nothing. The cardigan is a shell at radius 0.238 against the torso's 0.216, so the sleeve crossed that shell on its way out and its top cap floated outside the knit with the shell curving away inboard above it. You could see straight through the join. Fixed with a `deltoid_l` / `deltoid_r` cap wide enough to bridge from under the shell out to the sleeve
- **The face was a blank ovoid.** Eyes, brows and a mouth, as squashed spheres laid on the skull rather than sockets cut into it, because a socket wants a boolean and a boolean wants topology this mesh has not got. They read on colour, not relief: anything modelled deep enough to show in a clay render is a lump once it is skin coloured. The old skin-coloured brow ridge is gone, it became a third shelf between the eyes and the new brows
- **The knitted patches stood off the cardigan like plates.** 4mm proud and 10mm thick. Now 1.5mm and 5mm, and wider, so they read as panels knitted in
- **The cigarette was two pixels.** Correct at 4mm and useless at conversation distance. Stick and ember both up about 40%, ember more, since the ember is what actually carries it
- **The crown of her hair read as a grey swim cap.** Now a red-grey mid tone, so it goes grey rather than wearing a hat

`mat()` now also writes `diffuse_color`. Workbench reads that and not the node tree, so every clay render came back grey, which is no use for judging whether a face reads.

---

### Moretti follows a breadcrumb trail

`src/npc/moretti.ts`. Miller drops a crumb every 0.36 metres and Moretti walks the crumbs in order, holding two metres back.

**That is the whole navigation system and it is deliberate.** The walkable set is axis-aligned boxes, not a graph, so there is nothing to run A* over without building a graph first. A trail gets the stairs, the doorways and the verandah for nothing, because Miller has already proved every step of the route is walkable by standing on it. Every move still resolves against the collision solver, so the trail says where to go and not where he ends up.

Three things it needed before it worked, all found by walking the route:

- **He yields.** An offsider holding station two metres back is standing exactly where Miller walks when Miller turns round, and on a staircase that is a wall. Inside `YIELD` he backs off along the line away from Miller. The solver refuses anything that runs out of floor, so on a flight he retreats down it
- **He rejoins the trail at the nearest crumb, not the oldest.** Walking the queue from the front assumes he is always at the old end of it, and yielding breaks that completely: he ends up beside the newest crumb with the whole outbound route still queued in front, and the moment Miller stops he sets off to walk it again from the beginning. Distance is full 3D, because the staircase passes within a metre of the hall below it in plan
- **He turns to face Miller when he is standing still.** Otherwise he holds station with his back to you and the head tracking cannot save it, because Miller is usually directly behind him and that is past where a neck goes

**His collision box is empty while he is walking.** He resolves against the same solver Miller does, so a solid of his own ejects him from himself every frame. He is only ever an obstacle worth having when he is standing still, which is exactly when it is back.

### Tag, and what it does not do

The fourth verb. **G**, not a second meaning for F: F is already a hold and a press, and a taggable object is examinable too.

**Tag files nothing.** Examine files, the way every clue in the game does, and the case file holds knowledge rather than objects. What tagging changes is that the object leaves the scene in a bag, which is what gates 6 and 7 read. So the diary and the hammer are both examinable *and* taggable, and neither rule bends.

`sendTo` takes the object **and somewhere to stand**. Walking straight at a tagged object does not work: he steers into the first armchair between him and it and wedges there, because a straight line is not a route. Miller's own feet are the approach point, because Miller had to be within arm's length to tag it, so that spot is reachable by construction and the object may not be. The trail is frozen at tag time, so Miller wandering off afterwards does not drag him away from the job.

There is a stall timeout. If something the route did not know about blocks him, he bags from where he got to. A constable frozen against a chair is a worse outcome than one who reaches a little further.

**A lookable's position is its bounding box centre, not `getWorldPosition`.** Most kit props are a Group left at the origin with their parts placed by world-space extents, so the group origin is the middle of the building. Found by tagging the diary and watching Moretti set off for the front hall. Examine anchors its hand clip the same way and had the same latent bug.

---

### The gates are not locks

`src/case/gates.ts`. Eight gates from BRIEF.md's table, evaluated independently, and **not one of them refuses the player anything.**

BRIEF.md puts the ordering in the geometry rather than in code. Gate 4 comes before gate 7 because the yard is only reachable down the verandah stairs, so you cannot reach the hammer without having walked past them. Nothing enforces that and nothing needs to.

What the gates are for is knowing when the scene is finished, which is the one thing the world cannot say by its shape. The only consequence of the set being complete is that Moretti has something to say.

**Every gate has to be reachable without knowing it exists.** That is the trap in the whole file. Gate 5 first hung off Rosie's 2am answer, which was one branch of a hub the player could finish without ever picking it, and a gate behind an optional branch is a fail state for anybody who asked her something else. The bang is now the first thing she says in the parlour, unprompted, which is better writing anyway: it is the thing on her mind, so it is the thing she says.

The tracker subscribes to the bus itself rather than being poked from `main.ts`. The one fact that is not an event is where Miller is standing, and gate 0 is a `Box3` over the ground-floor hall because every route to the staircase crosses it. **Keep that box in step with `lodge.ts` by hand.**

`tag:bagged` is recorded here, so the `bagged` set that lived in `main.ts` is gone.

**Rosie moves on gate 1, not on a position check.** Gate 1 is Miller working the body, so he is in 1A with his back to the door and the move cannot be seen from anywhere in the building. It also honours what she told him at the desk: she is in the parlour by the time he comes back down, because she went while he was busy.

### Moretti is the objective display

No map, no marker, no checklist. A notebook page listing outstanding gates would be a quest log wearing a different hat, so the way the player finds out where they are is to turn round and ask the constable.

He has two graphs and the gates pick which:

| | |
|---|---|
| `moretti.standby` | Until the last gate. One line, and **deliberately not a list.** He does not name the unfinished room and he does not count anything off, because either turns the scene into errands |
| `moretti.theorise` | The exit. Reaching its last node emits `scene:complete` |

**Miller speaks in the theorise graph.** First time in the game, and the player still never sees him.

It stops where scene 1's evidence stops: two sets of hands in one room, one of them tidying up, and a hammer left at the bottom of the stairs. **No name.** Victor is scene 2 and Sterling is scene 4, and a player handed a name here has been handed the end of the game in the first half hour. The last line is an instruction rather than a conclusion, because scene 2 opens with walking the hammer to forensics.

Moretti is de-registered on completion, so the exit cannot be replayed.

---

## Crystal mesh

| Role | Path |
|---|---|
| **Original Blender file** | `assets/blender/crystal.blend` |
| Build script | `tools/blender/build_crystal.py` |
| Shipped runtime mesh | `public/models/crystal.glb` |
| Modelling reference | `images/characters/crystal-sheet.png` |

ASSETS.md rates her **"full, very close"**, the only character in the game rated that high, because the player crouches over her and turns her head.

**She is modelled standing and laid down by the runtime.** Every helper in `kit.py` lathes around Z and runs limbs down -Z, so modelling her horizontal would mean fighting the toolkit for nothing. The pose is baked into the joints in Blender and `crystal.ts` carries the transform.

That transform is **two nested groups on purpose.** Euler order makes a combined lay-down and turn-along-the-bed ambiguous to read and easy to get 90 degrees wrong. `root` carries the yaw along the bed, `tilt` lays her on her back. After the tilt her standing up axis runs +Z and her standing forward becomes +Y, so a point at standing height `h` sits at `z = h`, and **her back is 0.13 below the root** — which is why the root goes at spine height and not on the mattress. `CRYSTAL_SPINE_OFFSET` and `CRYSTAL_LENGTH` are exported so `room1a.ts` places her against the headboard without repeating the arithmetic.

She has no update. No breath, no tracking, no clip. Head, arm, needle and sling are named nodes so an examine lands on each, and that is the whole runtime.

### What the passes cost

- **The arms were mirrored.** `R_y` on a limb hanging down -Z gives `(-sin, 0, -cos)`, so a *negative* Y rotation swings it toward +X, which on her left arm is inward across her chest. The first build had both arms folded over her. Every other script writes `-side * radians(...)` for exactly this reason
- **The skirt is flattened to 0.58 along her front-to-back axis, and that is the most important number on her.** A lathed cone is a lampshade. Standing you forgive it; lying on her back it was holding a perfect bell forty centimetres off the mattress. Squashing it is what turns a solid of revolution into cloth that has given up
- **The hair was a yellow helmet.** Far too saturated, and it read worst from directly above, which is exactly where the player looks at her from
- **Her left arm was abducted far enough to hang off the mattress.** 34 degrees standing is 34 degrees off a bed that is only 1.35 wide

### Rigor, lividity, and what of it is visible

Rigor is why the pose is not slack: the limbs are set, the fingers are not curled, nothing sags.

Lividity is the part that is easy to get wrong. Blood settles to the lowest point and she is on her back, so the pooling is against the bedspread where **nobody can ever see it**. What the player can see from above is her hands, so the skin is waxy and pale everywhere and the hands and lower forearms carry the colour. Nothing about her is gory.

**Her eyes are closed.** Truthful at twelve hours, and the kinder choice: a corpse staring up at a player crouched over her turns the scene into a horror beat, and BRIEF.md wants the room beautiful and the violence already over.

**The temple is meant to be nearly invisible.** BRIEF.md puts it under the hair. The head turn is what earns it: turned, the 3pm sun rakes across the left temple and the fringe still half hides it. If it reads from the doorway it is too big or too dark, and the examine has nothing left to tell you.

The dress uses `crystal-dress` from `public/textures/`. Look pads on head, arm, needle and sling make close examines aimable. The body itself is examinable and files temple (same clip as the head).

---

## Textures

**Full PBR only, from here.** A single albedo tile with a roughness number guessed beside it is what `surfaces.ts` still does on the rest of the lodge and it is revoked. A material is albedo, normal (OpenGL, not DirectX), roughness and AO, sourced as a set at 2k, and all four go on the `MeshStandardMaterial`. `src/materials/pbr.ts` is the loader and Poly Haven `wood_planks` on 1A's floor is the proof.

**`lightMap` and `aoMap` read the second UV set, which is `uv1` in current three, not `uv2`.** That rename has broken this in every project that predates it. Check the attribute name on the loaded geometry before assuming the map is not working — and check `Texture.channel`, which is the other half of it and defaults to 0.

**What ships is capped.** 1024 for colour, 512 for normal and roughness, JPEG at 82 inside the `.glb`. The sourced models arrive with 4k sheets on furniture nobody gets within a metre of, and unexported the room was 42MB with the geometry accounting for almost none of it. Textures are the budget.

Everything below this line describes the authored tiles that are still on the lodge outside room 1A. They stay until something sourced replaces them.

`public/textures/`, loaded through `src/materials/textures.ts`. Processed out of `images/assets/` with `sips`, resized to power-of-two and saved as JPEG, which took 6.5 MB of PNG down to 1 MB.

**Windows, not crops.** Every source is a photograph of a whole thing rather than a tidy asset, so each use takes a sub-rectangle through `offset` and `repeat` instead of the region being cut out and baked into the file. The numbers are read off the picture by eye and can be nudged in code. `windowed()` clones the texture, because `offset` lives on the texture and two props windowing the same source would otherwise fight over it; clones share the upload so it costs nothing.

**`colorSpace = SRGBColorSpace` is not optional.** Three has needed it on every colour map since r152, and without it a photograph comes back pale and chalky, which reads as a bug in the lighting rather than in the texture.

Windows are measured from the **top**, because that is how you read them off an image. `windowed` flips into three's bottom-left origin so no call site has to think about it.

### The documents live in the case file

The photograph, the diary page and the note are the three things in scene 1 Miller actually reads, so `EvidenceDef.image` names a texture and the notebook renders it.

**The case file is the only place the photo can be seen.** ASSETS.md has Miller set the frame back down face down, exactly as found, so the print is never face up in the room. Putting it in the notebook is not a workaround: the case file holds knowledge, and a print of a photograph is knowledge a 1994 detective would be carrying. It also leans on the period rule that makes the clue work at all, that photographs are prints, which is why the frame can lie face down and leave a dust ring.

The notebook uses an `<img>` and not the three.js texture. It is DOM over the canvas like the rest of the HUD, and the browser already has the file. The same window the props use is reproduced with an oversized child in an `overflow: hidden` box.

### The neon is letterform plates

`neon-sign.png` and `neon-sign-2.png` are isolated letterforms on black (keyed to alpha in `neonPlate()`). Additive plane over the board; flicker swaps A/B. `neon-sign-facade.png` is the old whole-facade photograph — **reference only**, not wired as a material.

---

## Audio

`src/audio/`. Four files and no assets: **every sound in the game is synthesised through Web Audio and no audio file ships.** ASSETS.md asks for exactly that, and it also means scene 1's whole soundtrack is a few hundred lines with no download and no loading state.

| File | Owns |
|---|---|
| `mixer.ts` | One `AudioContext`, three buses, the shared noise buffer |
| `ambience.ts` | Four beds, crossfaded on where Miller stands. Plus the 1A tone |
| `footsteps.ts` | One synthesised step per `player:footstep` |
| `foley.ts` | The verbs. Sash, wardrobe, paper, lighter, bag, gloves |

**It cannot start itself.** A browser refuses to run an `AudioContext` until the user has interacted, and it refuses *silently*: the context exists, its state is `suspended`, and everything you schedule is discarded with no error anywhere. So `audio.unlock()` rides the click that asks for pointer lock, plus the mousedown for the drag-to-look fallback and the first keydown for anyone who reaches for WASD first. Ambience only starts its voices once the context is actually running, and retries every frame until it is.

**A step is two sounds, not one.** The scuff is a few milliseconds of noise shaped by what is underfoot; the weight is a low thump that barely changes, because it is Miller and not the floor. Splitting them is what lets carpet and marble be the same man on different floors. `speed` off the event separates a walk from a run, which is why running never needed an event of its own. Timber gets a creak on some steps, landing *after* the weight, because a board gives way under load and not on contact.

**Foley plays on `examine:start`, not on complete.** The hand animation is the action, and `examine:complete` is when the text lands, by which time the hand has already pushed the sash. Starting with the clip is what makes the hand look like it is touching something.

**Nothing scores a discovery, and nothing ever may.** ASSETS.md: "Never score the discoveries. No sting when Miller finds the temple. The absence is the effect." There is no handler for `evidence:filed` in this directory. The needle and the temple examine in silence.

**Room 1A's bed is nearly empty on purpose.** Distant traffic through the sash and flies, and that is all. BRIEF.md's claim for that room is that it is beautiful and everything in it happened in the dark; filling it with atmosphere argues with the light. The flies are the only sound in the scene that says what has happened, and they are quiet enough to miss.

The 1A tone is three sine waves a few cents apart on a low D through a lowpass, on a bus trimmed to 0.16. ASSETS.md wants "a single sustained low tone you cannot quite identify as music", so if you can name the pitch it is too loud. It fades in with the room and reacts to nothing.

`zoneAt` in `ambience.ts` carries hand-maintained copies of the building bounds, same as the gate box in `gates.ts`. **Move the building, move both.** The verandah is deliberately lumped in with the yard: it is outdoors and it looks at the same street.

No events were added. Footsteps and foley subscribe to the bus themselves; ambience is the only part that needs telling anything, because where Miller is standing is not an event.

---

## Decisions taken during the build

Settled. Do not re-litigate these without a reason.

- `three` is pinned to `0.180.0`. `npm install three` gives r185 and breaks the locked stack silently
- `strict` and `noImplicitOverride` were added to `tsconfig.json` by hand. The current Vite vanilla-ts template ships without `strict`
- Everything solid lives under a `world` group. The camera is a sibling of it and Miller's hands are children of the camera. That split is what keeps his own hands out of the look raycast. Do not raycast the whole scene, and do not solve it with render layers: a light in three only illuminates objects sharing its layer, so a layer split silently unlights the hands. That is the reference repo's viewmodel bug, reproduced
- Wrist roll goes through a wrist pivot, never the hand root. Rolling the root swings the forearm across the camera
- No new events were added. A run is told from a walk by the `speed` already carried in `player:footstep`
- **`BoxCollisionSolver` is height-aware, and the walkable set is what decides where Miller can stand.** It used to resolve in XZ only, which made every solid a full-height wall wherever it sat and meant a door lintel bricked up a doorway at floor level. That is fixed and it is what a two-storey building needed. See *Where the floor is* above. It is still boxes and still a pushout rather than a swept test
- **A ceiling has to cast shadow.** A lid built without `castShadow` lets the 3pm sun straight through it and lights the wall below from above, in a hard slab that reads as a render fault. Found on a hall ceiling, will recur on every room built from here
- **Fill is an HDRI, never an `AmbientLight`.** Reset step 1. Flat fill has no direction, so it lights a wall facing the window and a wall facing away from it identically. See *The light rig is an HDRI and one sun*
- **Tone mapping is AgX and exposure lives in `render/renderer.ts`.** Not ACES, and not in `core/config.ts`. Exposure is set after the environment intensity and the sun, never before
- **`environmentIntensity` below 1 is a stand-in for occlusion, not a taste call.** Three applies an environment map with no occlusion, so interiors flood at 1. It is 0.3 and it goes to 1 when **every** interior is baked, which is the end of Unit A, not the end of 1A
- **Indirect light is a lightmap on `uv1` with `Texture.channel = 1` and `flipY = true`.** Both are wrong by default for a map that arrives beside a `.glb` rather than inside one. See *Room 1A ships as one file*
- **Lightmaps are half float EXR, not KTX2.** No encoder on this machine and rule 9 says not to add one. `EXRLoader` is already in the `three` package
- **A baked room is a `.glb` and a loader, never a geometry builder.** `room1a.ts` is the shape every other space copies: same signature, same registry, no primitives except look pads
- **Baked geometry cannot be instanced.** Shared mesh data is shared UVs is one patch of the atlas, and the same door in two rooms needs two lightmaps. Reuse is a function that builds fresh geometry, never a linked duplicate. This is why `kit_arch.py` is a module and not a `.blend` full of instanced parts
- `LOOP.maxDelta` is 0.05 and is a collision guard, not just a tab-out guard. Collision is a pushout, not a swept test. Raise it, or raise `runSpeed`, and check the arithmetic in the comment or Miller goes through a wall on a stalled frame

Assumptions, flagged, cheap to change:

- **Glove colour.** ASSETS.md gives none and the palette has no token for one. `HANDS.glove` is pale cream latex, period correct for 1994. One value
- **`sun-shadow`.** ASSETS.md lists `#6E6croll`, which is not a colour. The note in that table says `#6E6255`. That is what the palette uses
- **The date is settled.** BRIEF.md still carries it as the one open decision, but ASSETS.md and both title cards say 26 February 1994. That section of BRIEF.md can go
- **Look sensitivity** is 0.0022 rad/px, picked blind, shared between pointer lock and drag. Untuned
- **`EXTERIOR.sky` is no longer the backdrop.** The HDRI is. The token is still in the palette and still used as a material colour in a couple of places; it stops being the thing behind the building
- **`EXTERIOR.bitumen`, `signBoard`, `grassDry`, `weed`, `paling`, `corrugate`, `rust`.** None of them in ASSETS.md, all guessed. `grassDry` is khaki because it is the end of February. Every one of them is a stand-in for a sourced PBR set
- **The stair is 18 risers at 0.19.** Steepish for a grand staircase, and it is what fits a 3.45 floor-to-floor in a hall this deep. `RISE` is fenced by `stepUp` and `stepDown` at both ends
- **Overlays own their own hiding.** The look line hides itself on `casefile:open` and `dialogue:start`. The pointer lock prompt asks `dialogue.isActive`, not `dialoguePanel.isOpen`, because the runner sets its state *before* it emits and the panel opens on the callback *after*, so a panel check runs one step too early
- **Examine is press F, run to completion.** Hold-to-cancel and cancel-on-`look:exit` made the verb dead under pointer lock. Esc cancels. BRIEF.md still says hold; the implementation that ships is press-to-start
- **Visual upgrades need sourced glTF and a bake.** Not image-gen tiles, not more light tuning. Hand, Crystal, Rosie, Moretti and the whole of room 1A are through that route; the rest of the lodge is not
- **`LIGHTMAP_INTENSITY` is 14 against a bake measured at 1.** It is high because `environmentIntensity` is low, and the two come back together at the end of Unit A

---

## Hand mesh

Done. Segmented gloved right hand authored in Blender, exported as glTF. Both files are in the repo.

| Role | Path |
|---|---|
| **Original Blender file** | `assets/blender/miller-hand.blend` |
| Build script | `tools/blender/build_miller_hand.py` |
| Shipped runtime mesh | `public/models/miller-hand.glb` |
| Modelling reference | `images/characters/miller-hands.png` |

- Runtime: `rig.ts` loads the glTF and drives named joints (`index_j0` … `thumb_j1`). `clip.ts`, `clips.ts`, and `hands.ts` stay mesh-agnostic
- Left hand is the same mesh with `scale.x = -1` and double-sided materials
- Joint names use underscores. The glTF exporter strips dots
- Curl closes into the palm on **negative** `rotation.x`
- Rebuild: with Blender MCP on TCP `localhost:9876`, execute the build script. It writes the `.blend` and re-exports the `.glb`
- Blender autosaves (`*.blend1`) are gitignored. Keep the `.blend`

---

## Rosie mesh

Modelled in Blender and exported as glTF, same workflow as the hand. Placed and wired at step 11, and revised once she was in the room. See *Rosie, placed* above.

| Role | Path |
|---|---|
| **Original Blender file** | `assets/blender/rosie.blend` |
| Build script | `tools/blender/build_rosie.py` |
| Shipped runtime mesh | `public/models/rosie.glb` |
| Modelling reference | `images/characters/rosie-sheet.png` |

- **Lathed profiles, not stacked capsules.** A capsule figure reads as a snowman, and the player stands close enough to talk to her. The silhouette is the whole job
- Built facing Blender **+Y**, which is Three **-Z** after the Yup export, so she arrives on three.js default forward. Her right hand is +X in both, which is where the cigarette is
- **The exporter bakes the Yup conversion through the whole hierarchy, not just the root.** So unlike the hand, every joint on this mesh is in honest three.js axes: +Y up, +X her right, forward -Z, limbs hanging down -Y. Check the glTF before assuming either convention on the next character
- Joints for the runtime: `rosie_root`, `hips`, `chest`, `head`, `arm_l_0` / `arm_l_1` / `hand_l`, `arm_r_0` / `arm_r_1` / `hand_r`, `cig`, `cig_ember`. Underscores, because the exporter strips dots
- The cardigan is an open **arc**, not a tube. A revolve closes over the front and there is no cardigan left. Same trap on hair: a full revolve is a helmet that closes over the face, so the length is an arc open at the front and only the crown is a full cap
- **An arc shell is a shell.** It has an inside and an outside and nothing between them, so anything passing through it needs its own cap or you see the join. That is what the deltoids are for
- She faces **+Y**, so a Blender front view is a camera on +Y looking back down -Y, `rotation_euler = (90°, 0, 180°)`. The obvious camera at -Y renders her back, and her back is symmetrical enough to pass for a front at a glance
- Rebuild: Blender MCP on TCP `localhost:9876`, `exec(open('tools/blender/build_rosie.py').read())`. Writes the `.blend` and re-exports the `.glb`

---

## Stack — locked

```
Engine      Three.js r180, WebGL2
Language    TypeScript, strict. No any, no ! assertions
Build       Vite
Deploy      Cloudflare Pages, static, own project on a subdomain of billyhaddad.au
            Not inside the author site's Astro build
Lighting    HDRI through PMREM, one directional sun, AgX. Indirect is baked
            in Cycles, offline, and shipped as a map. No realtime GI
Assets      Sourced. Poly Haven and Sketchfab, CC0 / CC-BY, credited
            glTF 2.0. Textures JPEG inside the .glb, lightmaps half
            float EXR beside it. KTX2 the day there is an encoder
Audio       Web Audio API
Physics     None. No library, no engine
```

**No physics engine.** Miller walks on a navmesh and raycasts at things. There are no rigid bodies, no ragdolls, no projectiles. If you find yourself wanting Rapier or Cannon, you have misread the design.

**No framework.** No React, no Vue. The HUD is DOM and CSS over the canvas.

**`three` plus loaders and compression.** GLTFLoader, KTX2Loader, RGBELoader and the Meshopt decoder are in, and they all ship inside the `three` package already. Anything with a runtime of its own is out.

---

## Do not build

This list exists because the genre invites all of it and none of it belongs.

- Combat of any kind. No weapons, no health, no damage
- An inventory, item screen, or item combining
- Free-form physics grabbing. Hand interactions are bespoke animations
- Pursuit or flee AI. The scene 3 chase is a scripted set piece with a fixed path
- A dialogue camera that leaves first person
- Fail states. The player cannot lose. They can only be slow
- Procedurally generated *layout*. Every room is authored and placed by hand. This is not the revoked rule: what was revoked is authoring every surface and mesh yourself, not authoring the level
- A map or quest marker. Rosie points, the geometry does the rest
- Realtime GI, SSAO, or any other attempt to compute bounce at 60fps. It is baked in Cycles and shipped as a map

---

## Folder structure

```
src/
  core/         engine loop, input, config, scene manager
  render/       renderer setup, environment (IBL), lighting
  world/        level loaders, prop registries, what kit is left
  materials/    material library, textures
  player/       controller, camera, hands
  interact/     raycast, look, examine, tag
  case/         evidence model, case file, notebook UI
  dialogue/     node graph, runner
  npc/          Rosie, Moretti, background actors
  ui/           HUD, notebook, title cards
  audio/        mixer, ambience, footsteps, spatial
docs/
  BRIEF.md          design spec
  ASSETS.md         art and audio list
  CREDITS.md        every sourced asset, its author and its licence
  IMAGE-PROMPTS.md  generation prompts
  SETUP.md          environment and deploy
images/
  characters/   generated reference sheets. Modelling reference only, never shipped
  assets/       generated textures. Processed copies go to public/textures/
  mood/         palette and location reference. 1a-target.png is the look target
assets/
  blender/      original .blend sources. Keep these; export into public/
                room1a.blend is the exception: 190MB, gitignored, rebuilt
  sourced/      Sketchfab downloads. Gitignored. A cache, not a source of
                truth: docs/CREDITS.md holds the uid that re-fetches each one
  bake/         raw 32 bit Cycles output, 50MB a sheet. Gitignored
tools/
  blender/      scripts that build, bake or export those .blend files.
                build_materials.py and kit_arch.py are Unit A's shared
                surfaces and shared joinery, called by every space
  shot.mjs      headless capture. Verify every step with it
public/
  env/          HDRIs (balcony_2k.hdr)
  models/       shipped glTF
  textures/
    bake/       shipped lightmaps. Half float EXR, DWAA
  audio/
```

**Three directories under `assets/` are gitignored and all three are reproducible.** `sourced/` from the uids in CREDITS, `room1a.blend` from `build_room1a.py`, `bake/` from `bake_room1a.py`. What is committed is what ships and the scripts that make it.

**Nothing sourced gets committed without a row in `docs/CREDITS.md`.** Author, source URL, licence. Add it in the same commit as the asset, not afterward.

### The images folder

`/images/characters/` holds a generated reference sheet per character, named `<character>-sheet.png`. Build geometry and materials against these. If a sheet is missing, say so and stop. Do not invent a placeholder character and do not proceed on a guess.

`/images/assets/` holds generated textures at working size. When one is final it gets resized to power-of-two and copied to `public/textures/`. The original stays where it is.

One subsystem per directory. A subsystem never reaches into another's internals. They talk through the event bus in `core/`.

---

## Event vocabulary

Emit and listen. Do not add events without adding them here.

```
scene:load        { id }
scene:complete    { id }
gate:unlocked     { gateId }

look:enter        { objectId }
look:exit         { objectId }
examine:start     { objectId }
examine:complete  { objectId }
tag:requested     { objectId }
tag:bagged        { objectId }

evidence:filed    { evidenceId, sourceObject }
casefile:open     {}
casefile:close    {}

dialogue:start    { nodeId, speaker }
dialogue:choice   { nodeId, optionId }
dialogue:end      { nodeId }

player:footstep   { position, surface, speed }
player:state      { stance }
```

---

## The four verbs

Look, examine, talk, tag. That is the whole game.

**Look** is a centre-screen raycast. It writes a one-line surface description. It never creates evidence and it never signals importance.

**Examine** is held input on a looked-at object. It plays a bespoke hand animation, then writes the tier-two text. Only this creates evidence.

**Talk** opens a dialogue node. Camera stays in first person.

**Tag** calls Moretti over. He bags it. Miller does not carry it.

Miller touches things. He does not pocket them. He can turn the photo frame over. He cannot take it.

---

## Writing rules

All in-game text follows these. No exceptions.

- Australian English
- No em dashes
- Contractions throughout
- No editorialising. Never tell the player something is suspicious, strange, or important
- No echo-padding in dialogue
- Trust the player

Wrong:

> The rubber tie has been suspiciously tied in a neat, careful knot, which suggests someone else may have done it.

Right:

> The tie's neat. Even tension, tucked under itself. Nobody does that one-handed with their teeth.

---

## Build order

Do not scaffold five scenes. Scene 1 is roughly 80% of the engine and everything after it is content in the same systems.

**Spaces before the people who stand in them.** The original order had Rosie and Moretti before the lodge they inhabit, which is not buildable: Rosie belongs at reception and in the parlour, Moretti follows Miller through the whole house, and neither room existed. Building the rooms first also unblocks the diary and the hammer, which are the last two evidence IDs and are waiting on the parlour and the yard.

### Engine — done

1. Player controller. Walk, crouch, lean. First person, no body — **done**
2. Look raycast and the one-line description — **done**
3. Hand rig and gloves. One contextual examine animation, proven on a single object — **done**
4. Examine tier two, held input — **done**
5. Case file. Evidence IDs, notebook UI — **done**
6. Room 1A. Geometry, fixed 3pm sun — **done**
7. Crystal as a prop. Twelve room 1A clips. Six evidence IDs file here; diary and hammer wait — **done**
8. Dialogue system — **done**

### Spaces

9. **The approach and the ground floor.** Street, entry, marble steps, neon sign, reception, hallway, central staircase, parlour. This is the route in and the route back down — **done**
10. **Verandah and back yard.** Iron lace off 1A, external stairs down, overgrown yard, Hills hoist, shed. Gate 4 lives here, and it is deliberately before the hammer — **done**

The navmesh landed with step 9, as a set of walkable boxes rather than triangles. See *Where the floor is*. It is what Moretti has to follow on, so it wanted doing before he arrives and not after.

### People

11. **Rosie.** At reception on the way in, relocated to the parlour on the way back down — **done**
12. **Moretti.** Breadcrumb follow, tag and bag — **done**

### Sequencing

13. Objective gates, scene exit — **done**
14. Scene manager, save on scene boundary — **done**
15. Cold open sequence, last — **done**

**The engine build order is finished.** Steps 1 to 15 all landed. Nothing on that list is open.

### What comes next is not step 16

The render reset is done and it covered one room. Scene 2 does not start until the
rest of scene 1 is through the same pipeline. **Next is Unit A**, below.

---

## Extending the pipeline to the rest of scene 1

**Room 1A is the proof. Do not repeat its process per room.** Two units follow,
and Unit A comes entirely before Unit B.

### UNIT A — the lodge interior. One Blender scene, one bake.

Reception, parlour, central staircase, first-floor hallway, room 1A.

These are contiguous and light travels between them. **Baked separately they
will seam at every doorway**, which is the whole reason this is one scene and
not five repeats of the reset.

Order of work:

1. **Shared material library first. Done.** `assets/blender/materials.blend`,
   six surfaces off five Poly Haven sets, built by
   `tools/blender/build_materials.py`. Gitignored at 41MB and rebuilt by that
   script, which fetches from the Poly Haven API itself. **Every space links
   this file. It does not copy it.** Three things it settled:
   - **The addon's downloader leaves the normal map unconnected**, and nothing
     reports it. The material renders fine and is a flat photograph of a wall.
     The script wires all four maps itself
   - **Only four of the seven maps are kept.** `nor_dx` is the DirectX normal
     and would light every bump as a dent, `arm` duplicates maps that are
     already separate, `Displacement` needs subdivision to mean anything. AO is
     kept and left unwired, because the Cycles bake computes occlusion for real
     and multiplying the baked-in kind in as well darkens every crevice twice
   - **`plaster_cornice` is `plaster_nicotine` with a tint above 1.** A tint is
     a multiply and can only darken, and at 0.88 the cornice rendered nine
     percent off the wall, which is the same wall twice
2. **Shared kit pieces. Done.** `tools/blender/kit_arch.py` — doors and
   architrave, skirting, picture rail, stair treads and risers, turned
   balusters, handrail, newel. `kit_arch_check.py` builds one of everything
   against the linked library and renders it to `shots/kit-arch.jpg`.
   Dimensions come off `lodge.ts` so the new spaces line up with what is
   already standing. Three things it settled:
   - **"Instance everywhere" cannot mean Blender instances.** Every copy needs
     its own island in the lightmap atlas, and two objects sharing mesh data
     share UVs and therefore share one patch of it. Linked duplicates and baked
     lighting are mutually exclusive. What is shared is the *definition*: one
     function, fresh geometry per call
   - **A rotated box is not a box.** The door leaf was built by computing its
     corners at the open angle and handing them back as a min and a max, which
     is the axis aligned bounding box of a turned door and rendered as a slab
     standing across the opening. Anything that turns gets an empty for a
     parent, and the parent is what turns
   - **A riser closes the step, so it sits under the nosing at the front of its
     own tread.** At the back, every step has a gap the depth of the going and
     you can see the wall through the staircase
3. **Assemble all five spaces in one scene. Under way.** Correct relative
   positions, real wall thickness, doorways open. Reception and parlour are
   assembled by `tools/blender/build_unit_a.py` and verified in
   `shots/unit-a-reception.jpg` and `shots/unit-a-parlour.jpg`. The builder also
   caught and fixed a silent
   shared-kit failure: generated architecture had no albedo UV layer, so linked
   PBR maps sampled one point. `kit_arch.assign` now creates metre-scaled box
   UVs; the later bake adds a separate lightmap layer. **Next is the central
   staircase.**
   Room 1A already exists — bring it in after the contiguous shells are present
4. **Source furniture per space**, same rules as before. Reception: desk,
   pigeonhole key rack, bakelite phone, ledger, ashtray. Parlour: two armchairs,
   sofa, low table, standard lamp, TV in a timber cabinet. **Stairs and hallway
   get nothing. They are transit**
5. **Lightmap density by dwell time, not floor area.** 1A 2048, parlour 2048,
   reception 1024, stairs 1024, hallway 512. The hallway is six seconds of
   walking. Do not give it hero resolution
6. **Bake Diffuse Indirect, 64 while iterating, 256 final.** Persistent Data on.
   **Bake per object group, not the whole scene at once**, or a failure at 90%
   costs you the lot
7. **Export as one `.glb`.** Under 60MB for the whole interior. It loads once,
   behind the title card

### UNIT B — exteriors. No baking.

Street and facade, verandah, back yard.

- **Realtime only.** HDRI environment plus the one directional sun
- **No lightmaps, no indirect bake.** If contact shadows read badly, bake ambient
  occlusion to vertex colours or a low-res AO map. That is the only bake
  permitted out here
- Separate `.glb` from the interior

The facade needs the neon sign as an emissive material, the police tape, the
Commodore and the marble steps. Everything else out there is silhouette and can
be low poly.

### Rules for both units

- **Unit A entirely before Unit B**
- **Do not re-source a material that exists in `materials.blend`. Link it**
- **Keep every existing object id.** `src/interact` and `src/case` do not change.
  That was step 7's test and it is still the test
- **One space assembled per session.** Commit after each
- If the interior `.glb` goes over 60MB, **reduce texture resolution before you
  reduce geometry.** Textures are the cost. The reset measured that: 42MB of
  room, almost none of it triangles
- Report: what changed, the shot path, whether it builds. Nothing else

---

## Performance target

60 fps at 1080p. These are small interiors with a fixed sun and no dynamic combat. If you are under 60, you have over-built the render pipeline, not under-optimised it.

Do not add TAA, GTAA, cascaded shadow maps, motion blur, SSAO, or any realtime GI. **One directional light with a shadow map, an HDRI through PMREM, and a baked indirect map** is enough and it is the correct amount. Everything expensive happens in Cycles, once, on the author's machine.

Budget for room 1A was **under 25MB** of glTF and lightmap together. It ships at 10.27. The whole lodge interior out of Unit A gets **60MB**, loaded once behind the title card.

---

## Miller ages

Forty days pass between scene 1 and scene 5. The player never sees his face, so the wear is carried by the hands and the environment.

| Scene | Cuffs | Gloves | Car |
|---|---|---|---|
| 1 | Clean, buttoned | Fresh | Washed |
| 2 | Buttoned | None | Dusty |
| 3 | Rolled once | None | Dirty |
| 4 | Rolled, grubby | None | Not seen |
| 5 | Rolled, worse | None | Filthy |

Same coffee cup in scenes 2 and 4. Do not draw attention to any of it.
