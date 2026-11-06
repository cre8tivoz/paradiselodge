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

## Current position

The game design covers five scenes. All five scenes are fully implemented, verified,
and playable end-to-end with persistent saves:
- **Scene 1 (The Paradise Lodge)**: Interior, complete exterior dressing, all 8 gates.
- **Scene 2 (St Kilda CID Station Bullpen)**: Forensics intake, Mark interview, interactive LEAP CRT terminal, all 5 gates.
- **Scene 3 (14 Regent St, Prahran)**: Weatherboard cottage, dropped slip, bluestone alley sprint, VHF radio arrest, all 5 gates.
- **Scene 4 (Interview Room 1)**: Sanyo CTR-80 recorder, Section 464A caution, exhibit confrontation, Victor confession, all 5 gates.
- **Scene 5 (Mahoney's Bar & Ending)**: Public bar, brawl distraction, collar grab, cellar floor safe, extortion ledger, cell slam foley, chiaroscuro Watchhouse ending, all 5 gates.

Old terminology, for reference only:

- “step 13” meant Scene 1's objective-gate gameplay milestone
- “steps 6–7” meant the final lodge-interior graphics pipeline tasks
- “Room 1A” is the upstairs bedroom, not a project phase
- “Unit A” meant the lodge interior asset package
- “Unit B” meant the lodge exterior asset package

These labels are retired from active progress reporting.

## Deliverables

| Deliverable | Status | Definition of done |
|---|---|---|
| **1. Scene 1 playable investigation** | **Done** | Cold open, movement, interactions, evidence, Rosie, Moretti, all eight objective gates, theorise ending, audio and save boundary work from start to finish |
| **2. Scene 1 lodge interior** | **Done** | Reception, parlour, staircase, upstairs hall and Room 1A are Blender-authored, furnished, baked, integrated and under the 60MB asset budget |
| **3. Scene 1 lodge exterior** | **Done** | Authored street facade, verandah iron lace, back yard with Hills Hoist and shed, wet road neon streaks, and curated Rosie placements |
| **4. Scene 1 release candidate** | **Done** | Interior/exterior lighting balanced, automated playtests passing (8/8 gates), performance profiled, production build zero-error |
| **5. Scene 2 — Police station** | **Done** | Playable forensics handoff, coffee urn, Manila case folder, interactive LEAP green-phosphor CRT terminal, Mark interview, all 5 gates |
| **6. Scene 3 — Victor chase** | **Done** | Prahran worker cottage, dropped betting slip, scripted 30m bluestone alley chase, Victor fence vault, VHF radio arrest, all 5 gates |
| **7. Scene 4 — Interrogation** | **Done** | Sanyo CTR-80 cassette recorder, Crimes Act Sec 464A caution, claw hammer and bootprint confrontation, Victor confession, all 5 gates |
| **8. Scene 5 — Mahoney's and ending** | **Done** | Public bar, pool table brawl distraction, collar grab for cellar key, Chub floor safe, extortion ledger, cell door slam foley, chiaroscuro Watchhouse ending screen |
| **9. Neo-noir soundtrack (Out of plan)** | **Done** | 5 period-authentic audio tracks in `assets/audio/soundtrack/` streamed via `SoundtrackPlayer` with scene-based crossfading |
| **10. Procedural foley engine (Out of plan)** | **Done** | Web Audio API mathematical synthesizers for surface footsteps, cassette recorder clicks/hum, safe tumbler dial, and Watchhouse cell door slam |
| **11. Automated test suite (Out of plan)** | **Done** | Headless Playwright Chromium test suites (`playtest-scene1.mjs` through `playtest-scene5.mjs`, `test-controls.mjs`) covering all 27 gates and physical browser controls |

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

## Project Completion Status

All 5 scenes designed in `BRIEF.md` have been built, connected, and verified:

1. **Scene 1 (The Paradise Lodge)**: Complete interior, finished exterior with back yard & verandah dressing, all 8 gates passing.
2. **Scene 2 (St Kilda CID Station)**: Bullpen, forensics, Manila folder, interactive LEAP CRT terminal, Mark interview, all 5 gates passing.
3. **Scene 3 (14 Regent St & Chase)**: Cottage interior, dropped slip, 30m alley chase, VHF radio arrest, all 5 gates passing.
4. **Scene 4 (Interview Room 1)**: CTR-80 tape recorder, Section 464A caution, exhibit confrontation, confession, all 5 gates passing.
5. **Scene 5 (Mahoney's Bar & Ending)**: Public bar, brawl distraction, cellar key collar grab, Chub floor safe, extortion ledger, Watchhouse cell door slam foley, chiaroscuro ending screen, all 5 gates passing.
6. **Soundtrack & Audio Engine**: 5-track period neo-noir soundtrack streamed with seamless crossfading, procedural Web Audio foley for footsteps, tape clicks, safe tumblers, and iron cell slam.
7. **Automated Verification**: End-to-end automated playtest suite (`playtest-scene1.mjs` through `playtest-scene5.mjs`) and browser human controls test (`test-controls.mjs`) passing 100%.

The codebase builds cleanly with zero TypeScript errors and is ready for deployment. Cloudflare Pages is the primary release target; wiring `lodge.billyhaddad.au` remains an optional DNS routing step.

## Reporting rule

Every work report must name the deliverable and one concrete outcome, for
example: “Scene 1 lodge exterior — facade accepted.” Do not report “step 4” or
“next phase” without the deliverable name.
