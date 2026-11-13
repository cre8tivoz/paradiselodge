# Paradise Lodge — Delivery Roadmap

This is the canonical project plan for what is playable and what is not.
Progress is reported by deliverable name, never by an unqualified step number.

Visual direction, the character pipeline and the next picture wins are in
`docs/MOVING-FORWARD.md`. That plan supersedes older lines in this file that
lock the exterior to a 3pm daylight rig, or that treat a Blender primitive
mesh or a Mac Cycles bake as required.

## Product constraint

This is an independent companion piece for a book release, not a commercial
game. The priority is a short, authored experience with a visual standard that
stands beside *Claude of Duty*. Do not trade that visual ambition for feature
breadth, and do not introduce commercial-game infrastructure, mechanics or
pipelines that the companion piece does not need.

## Current position & locked decisions

Author decisions locked on 13 November 2026:
- **Scenes 2–5 story rewrite is canonical**: `Kenneth Sterling`, `Crystal Vance` (22), `Prince of Wales` bouncer alibi for Mark, \$800 Richmond laundry savings toward a `"Perth"` flight, and closing Sunday `27 FEBRUARY 1994` Watchhouse epilogue still (`src/ui/ending-screen.ts`).
- **5-track ElevenLabs score is locked & active**: `public/audio/soundtrack/01-theme-paradise-lodge.mp3` through `05-theme-mahoneys-end.mp3` stay, paired with procedural Web Audio foley, footsteps, and ambience beds.
- **Reception camera remains strict first person**: the third-person OTS concept (`03-reception-with-rosie.png`) is retired so Miller stays off-screen until the closing Watchhouse epilogue still.
- **Interactive depth scope (companion-piece pragmatic rule)**: keep focused, atmospheric interactions without commercial-game bloat — give `LeapTerminal` lightweight query actions (`help`, `query rakov`, `priors`, `exit`) + wire `victor-record.jpg`, enforce real evidence presentation progression in Scene 4 (`conclude` gated on weapon, bootprint, and slip), and fix Scene 5 physical cellar progression + safe inspection with procedural tumbler clicks.

**Build state:** Scene 1 is playable end-to-end with **8** gates (polished dusk look, Unit A interior on R2, authored facade, rigged Rosie idle, portraits). Scenes 2–5 geometry, dialogues, and **20** additional gates (5 each; **28 gates total** across Scenes 1–5) are scaffolded in code, but currently have **P0 runtime blockers** (`aabb()` axis-order bug, unwired `'scene:transition'` loader, gate/sequence bypasses, and stale/unverified Playwright tests) queued immediately for Stage 2.

Old terminology, for reference only:

- “step 13” meant Scene 1's objective-gate gameplay milestone
- “steps 6–7” meant the final lodge-interior graphics pipeline tasks
- “Room 1A” is the upstairs bedroom, not a project phase
- “Unit A” meant the lodge interior asset package
- “Unit B” meant the lodge exterior asset package

These labels are retired from active progress reporting.

## Deliverables

| Deliverable | Status | Reconciled state & remaining work |
|---|---|---|
| **1. Scene 1 playable investigation** | **Done** | Cold open, movement, interactions, evidence, rigged Rosie, Moretti, all **8** objective gates, theorise ending, audio and save boundary work end-to-end |
| **2. Scene 1 lodge interior** | **Done** | Reception, parlour, staircase, upstairs hall and Room 1A baked in Unit A (R2 hosted) |
| **3. Scene 1 lodge exterior** | **Done** | Authored street facade (`lodge-exterior.glb`), verandah iron lace, back yard with Hills Hoist and shed, wet road neon streaks |
| **4. Scene 1 polish & release hardening** | **Partial** | Production build passes (`1.13 MB` JS bundle needs `three` manualChunks split). Quick wins queued: Parlour `sunBeam` intersecting Rosie, `rosie.ts` head bone `=` vs `+=` & dead `restLift`, speaker portrait variant matching (`panel.ts`), upstairs door numbers, Parlour TV/chair/CRT placement, photo-mapped Moretti & Crystal meshes, remove orphaned `rosie.glb` / `wood_planks/` / unused neon flicker |
| **5. Scene 2 — Police station** | **Partial (P0 blocked)** | World/dialogue scaffolded (`5` gates), reachable only via `?scene=scene2`. Blockers/fixes queued: `aabb()` coord order bug on walls/desks/cubicles, Moretti overlap with desk, `station.desk` collider shadowing `station.report`, premature access to report/LEAP before hammer drop, `station.coffee_mug` gate typo, `STERLING, KENNETH` (fixed), lightweight interactive LEAP commands + `victor-record.jpg`, and photo-mapped Mark/Moretti rigs |
| **6. Scene 3 — Victor chase** | **Partial (P0 blocked)** | Cottage, slip, alley sprint, radio (`5` gates) scaffolded. Blockers/fixes queued: `aabb()` coord order bug across walls/fences/cottage, `asphaltMaterial()` UV/streak bleed from S1, missing dusk/night skybox & post-process grade, and photo-mapped Victor runner |
| **7. Scene 4 — Interrogation** | **Partial (P0 blocked)** | Interview Room 1, CTR-80 tape, Sec 464A caution, interrogation (`5` gates) scaffolded. Blockers/fixes queued: `aabb()` coord order bug, immediate `conclude` turn-1 bypass (gate on confronting weapon/bootprint/slip), `"garden bed"`/`"shrubs"` vs `"shed"` copy drift, missing `post.ts` / `AmbientLight` removal, and photo-mapped seated Victor/Moretti |
| **8. Scene 5 — Mahoney's and ending** | **Partial (P0 blocked)** | Mahoney's Bar, cellar safe, ledger, Watchhouse epilogue (`5` gates) scaffolded. Blockers/fixes queued: `aabb()` coord order bug across bar/walls/cellar, `cellarDoor` rotating around world origin + missing solid blocker, `mahoneys.brawl` wired to wrong dialogue, `mahoneys.exit` reachable next to spawn, `look:enter` auto-unlocks, double `dialogue:choice`+`dialogue:end` handling, `"Friday"` -> `"Saturday"` night & em-dash copy fixes, and photo-mapped Sterling/Moretti |
| **9. Scene-to-scene progression** | **Broken (P0)** | `SceneManager` emits `scene:transition`, but nothing handles loading Scenes 2–5 dynamically or carrying `caseFile` evidence across boundaries; Scenes 1–4 fade to black and hang |
| **10. Hybrid soundtrack & audio engine** | **Partial** | 5 approved ElevenLabs MP3s active via `HTMLAudioElement`, plus Web Audio footsteps (`Scene 1`), foley, `cellSlam`. Queued: route `SoundtrackPlayer` through Web Audio `Mixer` for true crossfade & dialogue ducking, deduplicate 18 MB copy in `assets/` vs `public/`, add `bluestone`/`gravel` footsteps (fix S3/S5 `'floorboard'`), gate S1 `Ambience` outside Scene 1 + add S2–S5 beds & tape/safe clicks |
| **11. Automated test & CI verification** | **Broken / Unverified** | `playtest-scene1..5.mjs` and `test-controls.mjs` cover **28** gates (8+5+5+5+5), not 27. `test-controls.mjs` has stale `.dialogue-panel`/parlour selectors/coords, headless Chromium needs SwiftShader flags, and S2–S5 scripts bypass walking via state helpers. Must repair & run after Stage 2 P0 fixes |

## Scene 1 lodge exterior acceptance

The primary facade references are
`images/concept-art/01-title-card-the-paradise-lodge.png` and
`images/concept-art/02-miller-at-the-lodge-exterior.png`.

The exterior succeeds when it has:

- the strong two-storey Victorian silhouette, arched openings and full-width
  iron-lace balcony shown in the references
- distressed cream render, damp staining, exposed side brick and enough surface
  variation to hold close first-person views
- pink Paradise Lodge neon, cyan Rooms to Let neon, marble entry and
  wet-road reflections, including crisp neon streaks
- dusk as the default picture, golden hour into dusk. `?look=day` keeps the
  3pm rig. The references guide architecture, materials and colour
- one authored exterior asset integrated over the existing collision and
  gameplay route; no new mechanics. No new Mac bake

## Stage 2 execution order

1. **P0 Runtime Blockers**: Fix `aabb()` arg order across `scene2-station.ts`, `scene3-laneway.ts`, `scene4-interview.ts`, `scene5-pub.ts`; fix `cellarDoor` hinge & solid blocker; wire `'scene:transition'` scene reloading; fix S2/S4/S5 gate & sequence bypasses, duplicate Moretti, `tryTalk`/`tryExamine`, and `floors: WalkableRegion[]`.
2. **Scene 1 Quick Wins & Canon Copy**: Fix Parlour `sunBeam`, `rosie.ts` head drift / `restLift`, portrait matching, Parlour CRT/chair placement, door numbers, dead neon flicker, and S4/S5 timeline/em-dash/editorialising copy fixes.
3. **Scenes 2–5 Lookdev, Audio & LEAP**: Bring S2–S5 onto `post.ts`, strip `AmbientLight` & night voids, fix S3 asphalt streaks, wire `victor-record.jpg`, add lightweight LEAP queries, route `SoundtrackPlayer` through `Mixer` with crossfade + S2–S5 ambience/foley (`bluestone`/`gravel`/tape/safe).
4. **Tests & Bundle/Repo Hygiene**: Fix `test-controls.mjs` and E2E playtests (verified in real headless Chromium), deduplicate 18 MB MP3s, remove retired `rosie.glb` & unused `wood_planks/`, and split `three` chunk in `vite.config.mjs`.

## Reporting rule

Every work report must name the deliverable and one concrete outcome, for
example: “Scene 1 lodge exterior — facade accepted.” Do not report “step 4” or
“next phase” without the deliverable name. Verify builds and Playwright runs directly after changes before claiming pass status.
