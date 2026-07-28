# CLAUDE.md — The Paradise Lodge

Standing rules. Read every session. `docs/BRIEF.md` is the design spec, `docs/ASSETS.md` is the art and audio list.

---

## What this is

A first-person detective game. St Kilda, 26 February 1994. Five scenes. No combat.

The player is Detective Graham Miller. You never see him until the last shot of the game.

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
public/
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

1. Player controller. Walk, crouch, lean. First person, no body
2. Look raycast and the one-line description
3. Hand rig and gloves. One contextual examine animation, proven on a single object
4. Examine tier two, held input
5. Case file. Evidence IDs, notebook UI
6. Room 1A. Geometry, fixed 3pm sun
7. Crystal as a prop. All eight examine objects, all animations
8. Dialogue system
9. Rosie at reception, then relocated to the parlour
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
