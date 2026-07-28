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

---

## What this is

A first-person detective game. St Kilda, 26 February 1994. Five scenes. No combat.

The player is Detective Graham Miller. You never see him until the last shot of the game.

---

## Status

Last updated 28 July 2026. Update this whenever a step lands.

Repo is `github.com/cre8tivoz/paradiselodge`, branch `main`. Cloudflare Pages is deliberately not connected yet. That happens once scene 1 plays end to end.

| Step | State |
|---|---|
| 1. Player controller | Done. Walk, crouch, lean, mouse look, pointer lock |
| 2. Look raycast, one-line description | Done |
| 3. Hand rig, gloves, one examine animation | Done |
| 3b. Hand mesh | Done. Blender source + shipped glTF. See Hand mesh below |
| 4. Examine tier two, held input | Done. Hold F; release cancels |
| 5. Case file, evidence IDs, notebook UI | Done. N opens. Examine files. Idempotent |
| 6. Room 1A, geometry, fixed 3pm sun | Done. Kit furniture, sash, sun across the bed |
| 7. Crystal + examine set | Done. Kit Crystal. Twelve room 1A clips. Six evidence IDs file here; diary and hammer wait for parlour and yard |
| 8. Dialogue system | Done. Node graph, runner, DOM panel. Proven on the hall door with Rosie's reception lines (stub until step 9) |

Everything from step 9 on is untouched. **Next: Rosie**, rooted NPC, using `images/characters/rosie-sheet.png`.

### Room 1A light, settled

The room read dim and muddy and the window was a black rectangle. Three causes, all fixed:

- **The sash had no glass.** Both panes were solid timber boxes filling the opening, so the window was opaque *and* the sash cast a shadow across the whole room. The 3pm sun was only ever leaking round the edges. Panes are now unlit, barely opaque glass that casts nothing
- **There was nothing outside.** A `daylight` plane sits beyond the sash, deliberately blown near-white rather than sky blue. A photograph exposed for a sunlit interior blows its windows, and with a correctly exposed sky the room becomes the dark thing in frame
- **The sun was too weak to separate from the fill.** 2.9 to 8.0

Fill stays high, around 0.72 and 0.28. Cutting it to make the beam stand out was tried and is the wrong instinct: it buys contrast and spends the whole room. A real sunlit interior is bright everywhere because light bounces, and ambient is the only bounce there is. **Raise the sun to separate the beam, do not lower the fill.**

### What is kit vs modelled

Room 1A, Crystal, and every prop are **primitives** (boxes, capsules, cylinders, spheres) against the locked palette. That is deliberate scaffolding. Only Miller's hand is a real mesh.

### Added outside the build order

- **Run.** Shift plus forward, standing only. 4.6 against a 2.2 walk. Refused when moving backwards, strafing, or crouched. No stamina, because there are no fail states. It exists for the scene 3 chase
- **Drag to look.** Pointer lock is still preferred and still tried first. Embedded preview panes and some sandboxed documents refuse it outright with `WrongDocumentError`, so holding the left button turns the view instead, and the prompt says which one you are getting

### Scaffolding, and when it goes

| Thing | Goes at |
|---|---|
| Kit room / Crystal / prop primitives | When modelled assets land for each piece. Not a single cutover |
| The pointer lock prompt and its CSS | When the real HUD lands |
| Hall door talk stub (`1a.door` → Rosie reception graph) | Step 9, when Rosie is rooted |
| `window.__lodge` dev handle | Stays. It is `import.meta.env.DEV` only, and the capture tooling wants it |

---

## Decisions taken during the build

Settled. Do not re-litigate these without a reason.

- `three` is pinned to `0.180.0`. `npm install three` gives r185 and breaks the locked stack silently
- `strict` and `noImplicitOverride` were added to `tsconfig.json` by hand. The current Vite vanilla-ts template ships without `strict`
- Everything solid lives under a `world` group. The camera is a sibling of it and Miller's hands are children of the camera. That split is what keeps his own hands out of the look raycast. Do not raycast the whole scene, and do not solve it with render layers: a light in three only illuminates objects sharing its layer, so a layer split silently unlights the hands. That is the reference repo's viewmodel bug, reproduced
- Wrist roll goes through a wrist pivot, never the hand root. Rolling the root swings the forearm across the camera
- No new events were added. A run is told from a walk by the `speed` already carried in `player:footstep`
- `LOOP.maxDelta` is 0.05 and is a collision guard, not just a tab-out guard. Collision is a pushout, not a swept test. Raise it, or raise `runSpeed`, and check the arithmetic in the comment or Miller goes through a wall on a stalled frame

Assumptions, flagged, cheap to change:

- **Glove colour.** ASSETS.md gives none and the palette has no token for one. `HANDS.glove` is pale cream latex, period correct for 1994. One value
- **`sun-shadow`.** ASSETS.md lists `#6E6croll`, which is not a colour. The note in that table says `#6E6255`. That is what the palette uses
- **The date is settled.** BRIEF.md still carries it as the one open decision, but ASSETS.md and both title cards say 26 February 1994. That section of BRIEF.md can go
- **Look sensitivity** is 0.0022 rad/px, picked blind, shared between pointer lock and drag. Untuned
- **`ROOM_1A.daylight`.** What you see through the sash. Not in ASSETS.md, same class of assumption as the glove colour. It goes when the verandah is built at step 11
- **Overlays own their own hiding.** The look line hides itself on `casefile:open` and `dialogue:start`. The pointer lock prompt asks `dialogue.isActive`, not `dialoguePanel.isOpen`, because the runner sets its state *before* it emits and the panel opens on the callback *after*, so a panel check runs one step too early

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

## Stack — locked

```
Engine      Three.js r180, WebGL2
Language    TypeScript, strict. No any, no ! assertions
Build       Vite
Deploy      Cloudflare Pages, static, own project on a subdomain of billyhaddad.au
            Not inside the author site's Astro build
Audio       Web Audio API
Physics     None. No library, no engine
```

**No physics engine.** Miller walks on a navmesh and raycasts at things. There are no rigid bodies, no ragdolls, no projectiles. If you find yourself wanting Rapier or Cannon, you have misread the design.

**No framework.** No React, no Vue. The HUD is DOM and CSS over the canvas.

**One runtime dependency: `three`.** Do not add others without being asked.

---

## Do not build

This list exists because the genre invites all of it and none of it belongs.

- Combat of any kind. No weapons, no health, no damage
- An inventory, item screen, or item combining
- Free-form physics grabbing. Hand interactions are bespoke animations
- Pursuit or flee AI. The scene 3 chase is a scripted set piece with a fixed path
- A dialogue camera that leaves first person
- Fail states. The player cannot lose. They can only be slow
- Procedural generation of anything. Every room is authored
- A map or quest marker. Rosie points, the geometry does the rest

---

## Folder structure

```
src/
  core/         engine loop, input, config, scene manager
  render/       renderer setup, lighting, post
  world/        level geometry, kit pieces, props
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
  IMAGE-PROMPTS.md  generation prompts
  SETUP.md          environment and deploy
images/
  characters/   generated reference sheets. Modelling reference only, never shipped
  assets/       generated textures. Processed copies go to public/textures/
  mood/         palette and location reference
assets/
  blender/      original .blend sources. Keep these; export into public/
tools/
  blender/      scripts that build or export those .blend files
public/
  models/       shipped glTF (miller-hand.glb)
  textures/
  audio/
```

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

1. Player controller. Walk, crouch, lean. First person, no body — **done**
2. Look raycast and the one-line description — **done**
3. Hand rig and gloves. One contextual examine animation, proven on a single object — **done**
4. Examine tier two, held input — **done**
5. Case file. Evidence IDs, notebook UI — **done**
6. Room 1A. Geometry, fixed 3pm sun — **done**
7. Crystal as a prop. Twelve room 1A clips. Six evidence IDs file here; diary and hammer wait — **done**
8. Dialogue system — **done**
9. Rosie at reception, then relocated to the parlour — **next**
10. Moretti. Navmesh follow, tag and bag
11. Rest of the lodge. Street, entry, hallway, stairs, verandah, yard
12. Objective gates, scene exit
13. Scene manager, save on scene boundary
14. Cold open sequence, last

Verify in the browser between each step. Do not stack three steps in one prompt.

---

## Performance target

60 fps at 1080p. These are small interiors with a fixed sun and no dynamic combat. If you are under 60, you have over-built the render pipeline, not under-optimised it.

Do not add TAA, GTAA, cascaded shadow maps, or motion blur. A single directional light with a shadow map, baked ambient, and a light grade is enough and it is the correct amount.

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
