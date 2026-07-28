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
| 8. Dialogue system | Done. Node graph, runner, DOM panel. No talkable is wired now the 1A door stub is gone; Rosie is its first real user at step 11 |
| 9. Approach and ground floor | Done. Street, steps, neon, facade, hall, reception, parlour, staircase, first-floor hall. 1A is placed in it. See below |
| Rosie's mesh | Built and exported. Not placed, and not wired. See below |

**Next: step 10, the verandah and the back yard.**

`rosie.glb` is modelled with every joint the runtime needs. There is no placement, no runtime module and no wiring. Reception now exists, so step 11 is unblocked, but she waits her turn behind the verandah.

### The lodge, and what step 9 left out

The route plays: footpath, marble steps, front door, hall, up the flight, turn at the top, 1A is the first door on the right. Down works as well as up.

Deliberately not built:

- **The Commodore, the two uniforms, and the tape lift.** ASSETS.md files them under street and entry, but they are all cold-open staging and the cold open is step 15. The tape is already parted in the middle so the lift has somewhere to land
- **The diary on the parlour table.** Gate 6. It needs the tag verb and Moretti, so it files with him at step 12
- **Texture on any of it.** Rendered facade, carpet, marble and neon are flat palette colours. The neon is two tubes, not letterforms, because letterforms are a texture

Plan, so the numbers in `lodge.ts` mean something: **-Z is the street, +X is the side the verandah wraps onto.** The building runs x -6.5 to 6.4 and z 0 to 10.5. Ground floor at y 0, first floor at y 3.45. The flight climbs the -X half of the hall toward the back, so the passage runs *beside* it, not under it, and the stairwell above it is open on that side.

**Room 1A is placed, not moved.** `buildRoom1A` takes a position and a rotation and applies them before it bakes any collision box, because `Box3.setFromObject` reads the matrix chain. It sits at (4.0, 3.45, 2.6) turned a quarter turn, which puts its local -Z door onto the first-floor hall and its local +Z sash out at x = 6.3. Front and side corner room, per BRIEF.md. **Do not set `room.group.position` after the fact.** The solids are already world space and will not follow.

### Where the floor is

Miller now walks up and down. It is not gravity and it is not a physics engine.

- **The walkable set is the navmesh.** `WalkableRegion` is a `Box3` and a `Surface`. `groundAt(x, z, fromY)` returns the highest lid within `stepUp` above and `stepDown` below the feet, or nothing. Nothing means the move is refused, so the street and the yard need no invisible walls: they run out of floor. The edge of a landing stops Miller instead of dropping him
- **A staircase is a run of floors a step apart.** Seventeen tread lids, `RISE` under `stepUp` so the flight is not a wall, and over half of `stepDown` so coming down does not skip a tread
- **Solids are filtered by height.** A box only blocks if it overlaps the band from `stepUp` above the feet to `PLAYER.height` above them. That is what makes a lintel headroom, a tread a step, and a ground-floor wall not also a first-floor wall
- **Feet snap, the eye trails.** `position.y` lands on the exact floor so collision stays honest; `stepOffset` decays the difference out of the camera, or every tread is a jolt
- **The surface comes from the region, every frame.** `setSurface` is only the fallback now

### Room 1A light, settled

The room read dim and muddy and the window was a black rectangle. Three causes, all fixed:

- **The sash had no glass.** Both panes were solid timber boxes filling the opening, so the window was opaque *and* the sash cast a shadow across the whole room. The 3pm sun was only ever leaking round the edges. Panes are now unlit, barely opaque glass that casts nothing
- **There was nothing outside.** A `daylight` plane sits beyond the sash, deliberately blown near-white rather than sky blue. A photograph exposed for a sunlit interior blows its windows, and with a correctly exposed sky the room becomes the dark thing in frame
- **The sun was too weak to separate from the fill.** 2.9 to 8.0

Fill stays high, around 0.72 and 0.28. Cutting it to make the beam stand out was tried and is the wrong instinct: it buys contrast and spends the whole room. A real sunlit interior is bright everywhere because light bounces, and ambient is the only bounce there is. **Raise the sun to separate the beam, do not lower the fill.**

Those values are unchanged, but they no longer live in `room1a.ts`. See below.

### The light rig is the scene's, not the room's

`render/lighting.ts` owns the sun and the fill. It used to be inside `room1a.ts`, which was right while room 1A was the whole world and wrong the moment there was a building around it: **a `DirectionalLight` lights everything in the scene wherever it sits.** Only its shadow camera is local. So the room-scoped rig was already lighting the street, and its shadow volume was a seven metre box around one bedroom.

Direction is the same vector that put the beam across Crystal's bed, carried into world space. Shadow texel size is also the same: `2 * extent / mapSize`, 16 and 4096 against the old 7 and 2048. **Change one, check the other.**

A window has to have something bright behind it or the eye reads the black rectangle as the exposure reference and calls the room dim. Room 1A gets a `daylight` card; the ground-floor sashes get real openings onto the street and `scene.background`.

### What is kit vs modelled

The lodge, room 1A, Crystal, and every prop are **primitives** (boxes, capsules, cylinders, spheres) against the locked palette. That is deliberate scaffolding. Only Miller's hand is a real mesh.

`lodge.ts` builds boxes from **extents**, not centre and size. A building is a list of edges and converting each one by hand is where the mistakes live.

### Added outside the build order

- **Run.** Shift plus forward, standing only. 4.6 against a 2.2 walk. Refused when moving backwards, strafing, or crouched. No stamina, because there are no fail states. It exists for the scene 3 chase
- **Drag to look.** Pointer lock is still preferred and still tried first. Embedded preview panes and some sandboxed documents refuse it outright with `WrongDocumentError`, so holding the left button turns the view instead, and the prompt says which one you are getting

### Scaffolding, and when it goes

| Thing | Goes at |
|---|---|
| Kit lodge / room / Crystal / prop primitives | When modelled assets land for each piece. Not a single cutover |
| The pointer lock prompt and its CSS | When the real HUD lands |
| `ROOM_1A.daylight` card outside the sash | Step 10, when the verandah stands where it is |
| Neon as two tubes rather than letterforms | When the sign texture lands |
| `window.__lodge` dev handle | Stays. It is `import.meta.env.DEV` only, and the capture tooling wants it |

Gone: the `1a.door` talk stub that pointed at Rosie's reception graph. Reception exists now, so her voice coming out of a door upstairs is no longer a stub, it is a bug. Nothing is talkable until step 11.

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
- `LOOP.maxDelta` is 0.05 and is a collision guard, not just a tab-out guard. Collision is a pushout, not a swept test. Raise it, or raise `runSpeed`, and check the arithmetic in the comment or Miller goes through a wall on a stalled frame

Assumptions, flagged, cheap to change:

- **Glove colour.** ASSETS.md gives none and the palette has no token for one. `HANDS.glove` is pale cream latex, period correct for 1994. One value
- **`sun-shadow`.** ASSETS.md lists `#6E6croll`, which is not a colour. The note in that table says `#6E6255`. That is what the palette uses
- **The date is settled.** BRIEF.md still carries it as the one open decision, but ASSETS.md and both title cards say 26 February 1994. That section of BRIEF.md can go
- **Look sensitivity** is 0.0022 rad/px, picked blind, shared between pointer lock and drag. Untuned
- **`ROOM_1A.daylight`.** What you see through the sash. Not in ASSETS.md, same class of assumption as the glove colour. It goes when the verandah is built at step 10. It is now a card sized to the opening rather than a sixteen metre panel, because it sits outside a real building and the old one was visible from the street. It still peeks past the front corner from the far right of the footpath
- **`EXTERIOR.bitumen`, `EXTERIOR.sky`, `EXTERIOR.signBoard`.** Same class again. `sky` is pale and hot rather than postcard blue, for the same reason the sash is blown: it is the exposure reference for every exterior shot
- **The stair is 18 risers at 0.19.** Steepish for a grand staircase, and it is what fits a 3.45 floor-to-floor in a hall this deep. `RISE` is fenced by `stepUp` and `stepDown` at both ends
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

## Rosie mesh

Modelled in Blender and exported as glTF, same workflow as the hand. Not placed. See the status note above.

| Role | Path |
|---|---|
| **Original Blender file** | `assets/blender/rosie.blend` |
| Build script | `tools/blender/build_rosie.py` |
| Shipped runtime mesh | `public/models/rosie.glb` |
| Modelling reference | `images/characters/rosie-sheet.png` |

- **Lathed profiles, not stacked capsules.** A capsule figure reads as a snowman, and the player stands close enough to talk to her. The silhouette is the whole job
- Built facing Blender **+Y**, which is Three **-Z** after the Yup export, so she arrives on three.js default forward. Her right hand is +X in both, which is where the cigarette is
- Joints for the runtime: `rosie_root`, `hips`, `chest`, `head`, `arm_l_0` / `arm_l_1` / `hand_l`, `arm_r_0` / `arm_r_1` / `hand_r`, `cig`, `cig_ember`. Underscores, because the exporter strips dots
- The cardigan is an open **arc**, not a tube. A revolve closes over the front and there is no cardigan left. Same trap on hair: a full revolve is a helmet that closes over the face, so the length is an arc open at the front and only the crown is a full cap
- Rebuild: Blender MCP on TCP `localhost:9876`, `exec(open('tools/blender/build_rosie.py').read())`. Writes the `.blend` and re-exports the `.glb`

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
10. **Verandah and back yard.** Iron lace off 1A, external stairs down, overgrown yard, Hills hoist, shed. Gate 4 lives here, and it is deliberately before the hammer — **next**

The navmesh landed with step 9, as a set of walkable boxes rather than triangles. See *Where the floor is*. It is what Moretti has to follow on, so it wanted doing before he arrives and not after.

### People

11. **Rosie.** At reception on the way in, relocated to the parlour on the way back down. Her mesh is built and exported and both rooms now exist, so she is unblocked
12. **Moretti.** Navmesh follow, tag and bag. Diary and hammer file through him

### Sequencing

13. Objective gates, scene exit
14. Scene manager, save on scene boundary
15. Cold open sequence, last

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
