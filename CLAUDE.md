# CLAUDE.md - The Paradise Lodge

Standing rules for a session. Read this, then `docs/MOVING-FORWARD.md`.

`docs/MOVING-FORWARD.md` is the plan for the picture, the lighting and the characters. It supersedes every older rule that banned image-to-3D, post-processing, fill lights or generated assets, or that required Blender primitive characters and Cycles bakes on a Mac. Those bans are revoked. Do not put them back. The long bake diary that used to live in this file is history, and it is in git if a number from the Room 1A bake is ever needed. It is not an instruction.

Story, scene order, the four verbs and the case are `docs/BRIEF.md`. The art list is `docs/ASSETS.md`. Where either file still describes the old mesh method or a required Mac bake, `docs/MOVING-FORWARD.md` wins.

## How to report

Quiet by default. Do the work, then give the short version.

- No narration of what you are about to do
- When a step lands: what changed, anything that needs a decision, and stop
- Speak up for a real bug, a design conflict, or a choice only the author can make
- Do not ask permission to continue an agreed step

## What this is

A short companion piece for a book release. Not a commercial game. Do not accumulate commercial-game systems.

First-person detective story. St Kilda, 26 February 1994. Five scenes. No combat. The player is Detective Graham Miller. You never see him until the last shot.

A resident, Crystal, is dead in room 1A, staged as an overdose. It is not one. Constable Moretti follows and bags. Rosie Lodge manages the house. The case, the cast and the scene beats are in `docs/BRIEF.md`. Do not name Victor or Sterling in scene 1. The player is not handed the ending in the first half hour.

| Scene | What it is |
|---|---|
| 1 | The lodge. Cold open, investigation, theorise with Moretti. Playable |
| 2 | Police station. Forensics, Victor's record, Mark's statement. Not built |
| 3 | Victor chase. Scripted path, forced outcome. No pursuit AI, no fail state |
| 4 | Interrogation. Sterling |
| 5 | Mahoney's. Arrest, cell door, the only shot of Miller |

## Status

Scene 1 gameplay is complete and stays that way until a task opens it. The default picture is the dusk code look: practicals, grade, wet street. `?look=day` restores the 3pm HDRI and the baked interior.

The live Rosie is `public/models/rosie.glb`. The rigged replacement, `public/models/rosie-rigged.glb`, is in the repo and is not wired. Source art is `art-source/characters/rosie/`. The look-test harness is `tools/lookdev/` and is not part of the game build.

Repo: `github.com/cre8tivoz/paradiselodge`, branch `main`. Live at `https://paradiselodge-game.pages.dev` (Cloudflare Pages project `paradiselodge-game`). Custom domain `lodge.billyhaddad.au` is not wired. Deploys are manual:

```bash
npm run build && wrangler pages deploy dist --project-name paradiselodge-game --branch main
```

Pages previews use the same build: `npm run build`, output `dist`.

The Unit A interior is the R2 object `models/unit-a-4ae83b93.glb`. `src/world/unit-a.ts` owns the public URL. `vite.config.mjs` deletes `models/unit-a.glb` from `dist` so Pages does not reject the 31 MB file. Do not remove that guard. CORS for the bucket is `cloudflare/r2-cors.json`.

## Commands

```bash
npm run dev       # Vite
npm run build     # tsc && vite build → dist
npm run preview
```

`three` is pinned to `0.180.0` in the lockfile. `npm install three` without the pin moves the stack. Do not do that.

Node 20+. No new npm scripts, config files or tooling. The stack is Vite, TypeScript and three, plus the loaders and post passes that already ship inside three.

## Code conventions

- TypeScript `strict`, `noImplicitOverride`. No `any`. No non-null assertions.
- Imports at the top of the module. An inline import needs a real cycle, and a comment that says so.
- `switch` on a union or enum ends in a `never` check.
- One subsystem per directory. Subsystems talk through the event bus in `src/core/`. They do not reach into each other.
- Do not add events. The list below is complete. A run is the `speed` already on `player:footstep`.
- Australian English in game text. Contractions. No em dashes. No editorialising. Never tell the player something is suspicious, strange or important. Trust the player.
- Do not leave TODO comments.

## Folder structure

Do not reorder it. Write code inside the directory that already owns the job.

```
src/
  core/        loop, input, config, scene manager, save
  render/      renderer, dusk look, post, day-mode IBL and sun
  world/       level loaders, what kit is left
  materials/   library, textures, dusk look materials
  player/      controller, camera, hands
  interact/    raycast, look, examine, tag
  case/        evidence, gates, notebook
  dialogue/    node graph, runner
  npc/         Rosie, Moretti
  ui/          HUD, title card
  audio/       mixer, ambience, footsteps, foley. All synthesised. No audio files
docs/          BRIEF, ASSETS, MOVING-FORWARD, CREDITS, ROADMAP, SETUP
images/        sheets, concept art, mood. Reference. Committed
art-source/    character source (FBX, textures, Mixamo). Not loaded by the game
public/        models, textures, env. What the game fetches
tools/lookdev/ look-test harness. Not in the game build
tools/blender/ historical room and kit scripts
assets/blender/ .blend sources that are still the only copy of old meshes
```

`assets/sourced/`, `assets/bake/`, `assets/blender/room1a.blend`, `assets/blender/materials.blend` and `assets/blender/unit-a.blend` are gitignored and reproducible from the scripts and `docs/CREDITS.md`. Do not commit them.

## The four verbs

Look, examine, talk, tag.

**Look** is a centre-screen raycast and a one-line description. It never files evidence.

**Examine** files evidence. The build is press F, the clip runs to the end, Esc cancels. `look:exit` must not cancel a clip (pointer-lock drift was killing every examine). BRIEF.md still says hold. The shipped verb is press F. Evidence files only on `examine:complete`.

**Talk** opens a dialogue node. The camera stays in first person.

**Tag** is G. Moretti bags the object. Tag files nothing. Examine files. Miller does not carry the diary or the hammer.

## Event vocabulary

```
scene:load { id }
scene:complete { id }
gate:unlocked { gateId }

look:enter { objectId }
look:exit { objectId }
examine:start { objectId }
examine:complete { objectId }
tag:requested { objectId }
tag:bagged { objectId }

evidence:filed { evidenceId, sourceObject }
casefile:open {}
casefile:close {}

dialogue:start { nodeId, speaker }
dialogue:choice { nodeId, optionId }
dialogue:end { nodeId }

player:footstep { position, surface, speed }
player:state { stance }
```

## Do not build

- Combat, weapons, health, damage
- An inventory, item screen, or item combining
- Free-form physics grabbing, or a physics engine. No Rapier, no Cannon, no Ammo. Miller walks a navmesh of boxes and raycasts
- Pursuit or flee AI. The scene 3 chase is a fixed path
- A dialogue camera that leaves first person
- Fail states
- A map, quest marker, or checklist of gates
- A framework, or anything with a UI runtime of its own. The HUD is DOM and CSS over the canvas
- Realtime GI. Screen-space AO and bloom in `src/render/post.ts` are the grade, not a bounce solver
- A new Cycles bake on a Mac

## Picture

Dusk is the default. `readLookMode()` returns `'day'` only for `?look=day` or `?daylight=1`.

Dusk is code: tungsten practicals, nicotine and timber, height haze, wet road, neon, and the film grade (GTAO, bloom, grain, vignette, split-tone). Tone mapping on that path is `NoToneMapping`. The grade owns the curve. DOF is off in play. Composer pixel ratio is capped at 1.25. Shadow maps do not update every frame. Lights in rooms the player is not in are off.

Day mode is the balcony HDRI, one sun, AgX, and the existing lightmaps. `environmentIntensity` is 0.3 and Room 1A's `LIGHTMAP_INTENSITY` is 14. Those two move together. Do not retune one on its own, and do not add an `AmbientLight`.

Room 1A is placed by `buildRoom1A(placement)`. Do not set `room.group.position` afterwards. The collision boxes are already in world space.

Performance target: about 16 ms a frame at 1080p on a base M1. Details and the next picture wins are in `docs/MOVING-FORWARD.md`.

## Gameplay that already ships

Leave it alone unless the task is about it. The expensive facts, so they are not rediscovered by breaking them:

- Everything solid is under a `world` group. The camera is a sibling. The hands are children of the camera, which keeps them out of the look ray. Do not raycast the whole scene. Do not split them onto another render layer: a light only illuminates its own layer, and the hands go black.
- Wrist roll goes through a wrist pivot, never the hand root.
- The walkable set is `WalkableRegion` boxes. `groundAt` picks a floor. No floor means the move is refused. Stairs are tread lids. Solids block only in the band from the feet to the head, which is what keeps a lintel from bricking the doorway.
- `LOOP.maxDelta` is 0.05. Collision is a pushout, not a swept test. Raising it, or `runSpeed`, puts Miller through a wall on a stalled frame.
- Run is Shift plus forward, standing only. Refused backwards, strafing, or crouched. No stamina.
- Gloves go on at the hall threshold. Leave that trigger.
- Rosie is one mesh, two stations, registered through `registerRosie()`. She moves on gate `body` (needle and temple filed), not when Miller reaches the first floor. Her collision box is rewritten in place.
- Moretti follows crumbs Miller drops. He yields. His own collision box is empty while he walks. On a tag he walks to where Miller was standing, not at the object's group origin.
- Eight gates, and none of them lock a door. The set being complete is what gives Moretti the theorise graph. The last node emits `scene:complete`. He does not list unfinished rooms.
- The hall gate box in `src/case/gates.ts` and `zoneAt` in `src/audio/ambience.ts` are hand copies of the building bounds. Move the building, move both.
- Nothing plays a sting on `evidence:filed`.
- Pointer lock: Esc calls `exitPointerLock()` and is never `preventDefault`ed.
- `window.__lodge` is `import.meta.env.DEV` only. Leave it. The capture tooling uses it.

## Characters

| Who | Live mesh | Next |
|---|---|---|
| Rosie | `public/models/rosie.glb` | `public/models/rosie-rigged.glb`, not wired |
| Moretti | `public/models/moretti.glb` | Same pipeline as Rosie, after she is in |
| Crystal | `public/models/crystal.glb` | After Moretti |
| Miller's hands | `public/models/miller-hand.glb` | Face only in the last shot |
| Mark, Sterling, Victor | Sheets in `images/characters/` | After Crystal |

How a new character is made, and the limits of that pipeline (mitten hands, invented backs, soft faces, Hugging Face free quota), is `docs/MOVING-FORWARD.md`. Do not start a rig inside a lighting change. Do not replace `rosie.glb` until the reception task.
