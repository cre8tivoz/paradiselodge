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

**Build state:** All five scenes are playable end-to-end across **28 gates** (8 + 5 + 5 + 5 + 5) with dynamic `'scene:transition'` progression and cross-scene `caseFile` persistence, dusk/night `post.ts` film grading across Scenes 1–5, Web Audio `Mixer`-routed 5-track soundtrack + foley/ambience, photo-mapped cast GLBs built locally via `tools/characters/build_characters.py`, split `three` vendor chunking in `vite.config.mjs`, and passing `tsc`, `vite build`, and Playwright verification suites.

Old terminology, for reference only:

- “step 13” meant Scene 1's objective-gate gameplay milestone
- “steps 6–7” meant the final lodge-interior graphics pipeline tasks
- “Room 1A” is the upstairs bedroom, not a project phase
- “Unit A” meant the lodge interior asset package
- “Unit B” meant the lodge exterior asset package

These labels are retired from active progress reporting.

## Deliverables

| Deliverable | Status | Reconciled state & verified outcome |
|---|---|---|
| **1. Scene 1 playable investigation** | **Done** | Cold open, movement, interactions, evidence, rigged Rosie, Moretti, all **8** objective gates, theorise ending, audio and save boundary work end-to-end |
| **2. Scene 1 lodge interior** | **Done** | Reception, parlour, staircase, upstairs hall and Room 1A baked in Unit A (R2 hosted); outer `lodge.ts` wall geometry offset `2.5cm` clear of `unit-a.glb` to eliminate Reception Z-fighting |
| **3. Scene 1 lodge exterior** | **Done** | Authored street facade (`lodge-exterior.glb`), verandah iron lace, back yard with Hills Hoist and shed, wet road neon streaks |
| **4. Scene 1 polish & release hardening** | **Done** | Split `three` chunk in `vite.config.mjs`; fixed Parlour `sunBeam`, `rosie.ts` head drift & `restLift`, Crystal bed/pillow placement & Room 1A dusk intensity, normalised speaker portraits (`panel.ts`), upstairs door plates (`1A`–`1C`), Parlour TV/chair/CRT placement, photo-mapped Moretti & Crystal GLBs, and removed orphaned `rosie.glb` / `wood_planks/` / dead neon flicker |
| **5. Scene 2 — Police station** | **Done** | All **5** gates verified; `aabb()` coord order fixed across walls/desks/cubicles, Moretti clearance & `station.desk` collider overlap resolved, `station.coffee_mug` gate aligned, lightweight interactive LEAP queries + `victor-record.jpg` dossier wired, shared `post.ts` precinct grade installed (no `AmbientLight`), and photo-mapped Mark & Moretti GLBs active |
| **6. Scene 3 — Victor chase** | **Done** | Cottage, slip, alley sprint, radio (**5** gates) verified; `aabb()` coord order fixed, `asphaltMaterial()` street streaks decoupled from S1 lodge neon, shared `post.ts` night-alley grade + starry dusk sky installed, and photo-mapped Victor runner active |
| **7. Scene 4 — Interrogation** | **Done** | Interview Room 1, CTR-80 tape, Sec 464A caution, exhibit confrontation (**5** gates) verified; `aabb()` fixed, turn-1 `conclude` bypass removed (requires weapon, bootprint & slip confrontation), copy aligned (`shed`), shared `post.ts` grade installed without `AmbientLight`, and photo-mapped seated Victor & Moretti GLBs active |
| **8. Scene 5 — Mahoney's and ending** | **Done** | Mahoney's Bar, cellar safe, ledger, Watchhouse epilogue (**5** gates) verified; `aabb()` fixed, `cellarDoor` pivot/hinge & blocker fixed, `mahoneys.brawl` / `exit` / `look:enter` / double-dialogue bugs resolved, Saturday/Sunday timeline & em-dash copy fixed, shared `post.ts` pub grade installed, and photo-mapped Sterling & Moretti GLBs active |
| **9. Scene-to-scene progression** | **Done** | `main.ts` handles `'scene:transition'` dynamically across Scenes 1–5 with fade/reload and `caseFile` evidence carry-over |
| **10. Hybrid soundtrack & audio engine** | **Done** | 5 ElevenLabs MP3s routed through Web Audio `Mixer` with scene crossfading and dialogue ducking (`src/audio/soundtrack.ts`); duplicate 18 MB MP3 copy in `assets/` removed; S2–S5 ambience beds, `bluestone`/`gravel` footsteps, `tapeClick`/`tapeHum`/`safeDialClick`/`cellSlam` wired |
| **11. Automated test & CI verification** | **Done** | `test-controls.mjs` and `playtest-scene1..5.mjs` repaired and passing across all **28** gates (`8+5+5+5+5`) in real headless Chromium (`closeBrowser()` teardown clean) |

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

## Stage 2 execution order (Completed)

1. **P0 Runtime Blockers — Done:** Fixed `aabb()` arg order across Scenes 2–5, `cellarDoor` hinge/blocker, `'scene:transition'` progression, S2/S4/S5 gate bypasses, duplicate Moretti, `tryTalk`/`tryExamine`, and `floors: WalkableRegion[]`.
2. **Scene 1 Quick Wins & Canon Copy — Done:** Fixed Parlour `sunBeam`, Crystal bed/pillow placement, Reception Z-fighting, `rosie.ts` head drift / `restLift`, portrait matching, Parlour CRT/chair placement, door numbers, dead neon flicker, and S4/S5 copy fixes.
3. **Scenes 2–5 Lookdev, Audio & Cast — Done:** Moved S2–S5 onto `post.ts`, removed `AmbientLight` & night voids, decoupled S3 asphalt streaks, wired `victor-record.jpg` + lightweight LEAP queries, routed `SoundtrackPlayer` through `Mixer` with S2–S5 ambience/foley, and generated/wired photo-mapped cast GLBs (`moretti`, `crystal`, `mark`, `victor`, `sterling`).
4. **Tests & Bundle/Repo Hygiene — Done:** Repaired & verified `test-controls.mjs` and `playtest-scene1..5.mjs`, deduplicated 18 MB MP3s, removed retired `rosie.glb` & duplicate `wood_planks/`, and split the `three` chunk in `vite.config.mjs`.

## Reporting rule

Every work report must name the deliverable and one concrete outcome, for
example: “Scene 1 lodge exterior — facade accepted.” Do not report “step 4” or
“next phase” without the deliverable name. Verify builds and Playwright runs directly after changes before claiming pass status.
