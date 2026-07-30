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
4. **One runtime dependency: `three`.** Do not add another. Do not evaluate
   one. Do not mention one.
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
11. **You cannot generate image assets.** Codex generates them, on the author's
    machine, and they are committed separately. If your work needs a texture, a
    photograph, a sign, or any visual asset that does not exist yet, stop and
    tell the author exactly what you need: what it is, what size, what it
    depicts, and where it goes in the file tree. Do not improvise a placeholder
    and move on. Do not generate one procedurally. The author would rather make
    the asset than spend a session unpicking a workaround.

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

Last updated 30 July 2026. Update this whenever a step lands.

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
| 7. Crystal + examine set | Done. Modelled Crystal. Twelve room 1A clips. Six evidence IDs file here; diary and hammer wait for parlour and yard |
| 8. Dialogue system | Done. Node graph, runner, DOM panel. Rosie is its first real user |
| 9. Approach and ground floor | Done. Street, steps, neon, facade, hall, reception, parlour, staircase, first-floor hall. 1A is placed in it. See below |
| 10. Verandah and back yard | Done. Iron lace off 1A, external stairs, yard, Hills hoist, shed, hammer. See below |
| 11. Rosie | Done. Placed, talkable, relocates. Two graphs. See below |
| 12. Moretti | Done. Breadcrumb follow, the tag verb, bag and hide. Diary is built and both taggables work. See below |
| 13. Objective gates, scene exit | Done. Eight gates, none of them locks. Theorise with Moretti ends the scene. See below |
| Audio | Done for scene 1. Four ambience beds, footsteps, foley, the 1A tone. All synthesised. See below |
| 14. Scene manager, save on boundary | Done. `src/core/scene.ts` + `src/core/save.ts`. Fade + localStorage on `scene:complete`. Scene 2 not built, so complete holds on black |
| 15. Cold open | Done. Title card, Commodore, two uniforms, tape lift, verb gating until hall |

**Scene 1 plays end to end and it has sound.** What is left before it matches the brief is on the list below, not in the fifteen steps: the fifteen steps are an engine checklist and they deliberately deferred everything that makes it look and sound finished.

### What scene 1 still owes the brief

| | State |
|---|---|
| **Textures** | Wired. Authored tiles on 1A and lodge; neon letterforms; magazines/map. Facade plate kept as `neon-sign-facade.png` |
| **Gloves going on at the front door** | Done. Trigger on hall threshold, clip + foley |
| **Light grade** | Done. ACES + afternoon LUT pass (`src/render/grade.ts`) |

All eight scene 1 evidence IDs file.

### The lodge, and what step 9 left out

The route plays: footpath, marble steps, front door, hall, up the flight, turn at the top, 1A is the first door on the right. Down works as well as up.

Deliberately not built:

- **Texture on any of it.** Rendered facade, carpet, marble and neon are flat palette colours. The neon is two tubes, not letterforms, because letterforms are a texture

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

**Room 1A has a verandah door.** BRIEF.md says a verandah runs off 1A, and something has to run off it: the sash opens a hand's width, `pushSash` gives another inch and stops, and the toe print on the sill is what the `sill` evidence is. A detective climbing out of the murder scene's window would also be wrong. It changes nothing about how Sterling got in. He came through the sash; this is the door he did not use.

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

`world/kit.ts` builds boxes from **extents**, not centre and size. A building is a list of edges and converting each one by hand is where the mistakes live. `slab`, `wall`, `walk`, `elevation` and `raked` live there; the lodge, the verandah and the yard all use them.

### Added outside the build order

- **Run.** Shift plus forward, standing only. 4.6 against a 2.2 walk. Refused when moving backwards, strafing, or crouched. No stamina, because there are no fail states. It exists for the scene 3 chase
- **Drag to look.** Pointer lock is still preferred and still tried first. Embedded preview panes and some sandboxed documents refuse it outright with `WrongDocumentError`, so holding the left button turns the view instead, and the prompt says which one you are getting

### Scaffolding, and when it goes

| Thing | Goes at |
|---|---|
| Kit lodge / room / Crystal / prop primitives | When modelled assets land for each piece. Not a single cutover |
| The pointer lock prompt and its CSS | When the real HUD lands |
| Iron lace as boxes, and the yard's tufts | When cast-lace and grass assets land |
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

**She relocates when Miller gets to the first floor.** That is the earliest moment the move cannot be seen: the stairwell is open on the -X side and reception is behind a wall on the +X side. It is a stand-in for gate 0 and it goes at step 13.

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

The dress is flat cream. **The floral is a texture and it is not made yet.**

---

## Textures

`public/textures/`, loaded through `src/materials/textures.ts`. Processed out of `images/assets/` with `sips`, resized to power-of-two and saved as JPEG, which took 6.5 MB of PNG down to 1 MB.

**Windows, not crops.** Every source is a photograph of a whole thing rather than a tidy asset, so each use takes a sub-rectangle through `offset` and `repeat` instead of the region being cut out and baked into the file. The numbers are read off the picture by eye and can be nudged in code. `windowed()` clones the texture, because `offset` lives on the texture and two props windowing the same source would otherwise fight over it; clones share the upload so it costs nothing.

**`colorSpace = SRGBColorSpace` is not optional.** Three has needed it on every colour map since r152, and without it a photograph comes back pale and chalky, which reads as a bug in the lighting rather than in the texture.

Windows are measured from the **top**, because that is how you read them off an image. `windowed` flips into three's bottom-left origin so no call site has to think about it.

### The documents live in the case file

The photograph, the diary page and the note are the three things in scene 1 Miller actually reads, so `EvidenceDef.image` names a texture and the notebook renders it.

**The case file is the only place the photo can be seen.** ASSETS.md has Miller set the frame back down face down, exactly as found, so the print is never face up in the room. Putting it in the notebook is not a workaround: the case file holds knowledge, and a print of a photograph is knowledge a 1994 detective would be carrying. It also leans on the period rule that makes the clue work at all, that photographs are prints, which is why the frame can lie face down and leave a dust ring.

The notebook uses an `<img>` and not the three.js texture. It is DOM over the canvas like the rest of the HUD, and the browser already has the file. The same window the props use is reproduced with an oversized child in an `overflow: hidden` box.

### The neon is deliberately not textured

`images/assets/neon-sign.png` is a photograph of a whole facade at dusk with the sign on it, and the letterforms sit on a pale rendered wall. There is no way to use it as a sign texture without the wall coming too: additive blending lifts the board to grey, and an alpha map off luminance cannot separate a mid-grey wall from a mid-bright tube. **It is reference for what the sign should look like, not an asset.** The neon stays two tubes until there is an isolated letterform image with an alpha channel.

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
- `LOOP.maxDelta` is 0.05 and is a collision guard, not just a tab-out guard. Collision is a pushout, not a swept test. Raise it, or raise `runSpeed`, and check the arithmetic in the comment or Miller goes through a wall on a stalled frame

Assumptions, flagged, cheap to change:

- **Glove colour.** ASSETS.md gives none and the palette has no token for one. `HANDS.glove` is pale cream latex, period correct for 1994. One value
- **`sun-shadow`.** ASSETS.md lists `#6E6croll`, which is not a colour. The note in that table says `#6E6255`. That is what the palette uses
- **The date is settled.** BRIEF.md still carries it as the one open decision, but ASSETS.md and both title cards say 26 February 1994. That section of BRIEF.md can go
- **Look sensitivity** is 0.0022 rad/px, picked blind, shared between pointer lock and drag. Untuned
- **`ROOM_1A.daylight`.** What you see through the sash. Not in ASSETS.md, same class of assumption as the glove colour. It goes when the verandah is built at step 10. It is now a card sized to the opening rather than a sixteen metre panel, because it sits outside a real building and the old one was visible from the street. It still peeks past the front corner from the far right of the footpath
- **`EXTERIOR.bitumen`, `sky`, `signBoard`, `grassDry`, `weed`, `paling`, `corrugate`, `rust`.** Same class again, none of them in ASSETS.md. `sky` is near white rather than postcard blue, and it went brighter still once the `daylight` card came out of 1A: it is what you see through the sash now, and a window in a room exposed for its interior blows. `grassDry` is khaki because it is the end of February
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
10. **Verandah and back yard.** Iron lace off 1A, external stairs down, overgrown yard, Hills hoist, shed. Gate 4 lives here, and it is deliberately before the hammer — **done**

The navmesh landed with step 9, as a set of walkable boxes rather than triangles. See *Where the floor is*. It is what Moretti has to follow on, so it wanted doing before he arrives and not after.

### People

11. **Rosie.** At reception on the way in, relocated to the parlour on the way back down — **done**
12. **Moretti.** Breadcrumb follow, tag and bag — **done**

### Sequencing

13. Objective gates, scene exit — **done**
14. Scene manager, save on scene boundary — **done**
15. Cold open sequence, last — **done**

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
