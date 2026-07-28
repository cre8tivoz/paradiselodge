# THE PARADISE LODGE — Game Brief

*Working title. Single source of truth for what this game is.*

Australian English throughout. Dry, deadpan. No editorialising. Trust the player.

---

## Premise

Detective Graham Miller is called to the Paradise Lodge in St Kilda. A resident is dead in room 1A, staged to look like an overdose. It isn't one.

Five scenes. First person. You never see Miller until the last shot of the game.

**Genre:** first-person investigation. Not a shooter.
**Feel:** No One Lives Forever meets Alone in the Dark, touch of Resident Evil.
**Structure:** scene-gated, linear, evidence accumulates. Closer to Sherlock Holmes: Crimes & Punishments than to anything with a gun in it.

---

## The verbs

The entire game is four actions. Locked.

| Verb | Input | What it does |
|---|---|---|
| **Look** | Centre-screen raycast | Surface description. Never creates evidence |
| **Examine** | Hold on a looked-at object | The detail. Creates evidence |
| **Talk** | Interact with an NPC | Dialogue node |
| **Tag** | Interact with a taggable object | Miller calls Moretti. Moretti bags it |

### Hands

Miller has hands and they enter frame. Examine is not a text box, it is an action. He reaches out, turns the frame upright, lifts the corner of the diary, crouches and turns her head toward the light.

**Contextual, not physics.** Each examinable object has a bespoke hand animation. Do not build free-form physics grabbing. It never feels good, it takes weeks, and it fights an investigation game.

He pulls on gloves at the front door. That is why you can see the hands, and it is free characterisation.

**He touches. He does not pocket.** He can turn the photo over. He cannot take it. There is no inventory, no item screen, no combining. He tags, Moretti bags. The case file holds knowledge, not objects.

One exception, once, in scene 5: Miller grabs Sterling by the collar. It is the only time those hands touch a living person and it should feel like it.

---

## Two-tier examine

Every examinable object has two layers. **Look** gives the surface. **Examine** gives the detail that files into the case.

Only tier two creates evidence. Tier one never tells the player something is important.

Sample, correct register:

> **Look:** Rubber tie around her upper arm.
>
> **Examine:** The tie's neat. Even tension, tucked under itself. Nobody does that one-handed with their teeth, and nobody leaves it tight after they've found the vein.

No adjectives doing emotional work. No "suspiciously". The player works it out.

---

## Cast

| Character | Role | Notes |
|---|---|---|
| **Graham Miller** | Player. Detective | Never seen until the final shot |
| **Constable Moretti** | Offsider | Follows on navmesh, bags evidence, theorises |
| **Rosie Lodge** | Lodge manager | Rooted in the parlour, smoking. First contact |
| **Crystal** | Victim, 28 | Blonde, petite, well dressed. Long-term on-and-off resident. Sex worker. Clean for a year |
| **Mark** | Crystal's ex | Bouncer at the Espy. Alibi holds. Upset. Not a suspect |
| **Victor Rakov** | Arrest, scene 3 | King St Crew. Staged the scene. The hammer was his |
| **John Sterling** | Killer | Owns Mahoney's. Swung the hammer |

---

## The case (builder's eyes only)

Crystal was extorting Sterling. She knew he was selling out of Mahoney's, and she had been clean for a year, which is what gave her the standing to hold it over him.

At about 2am Sterling came up the external verandah stairs, in through the sash window of 1A, and hit her once on the left temple with a hammer belonging to Victor Rakov. Victor staged the room: tied the sling, seated the needle, stood the photo frame up. He was also looking for her diary. He did not find it, because it was downstairs on the parlour table in a room full of residents.

They left the way they came. The hammer went down at the shed, five feet from the bottom of the stairs.

**The needle is the cruellest object in the game.** She had been clean a year. One puncture, no history under it. Whoever staged it knew exactly what he was undoing and chose it.

---

## Scene 1 — The Lodge

### Cold open

Miller gets out of the car. He walks toward police tape and two uniforms lift it for him. He looks up.

A dilapidated grand Victorian mansion. Marble steps. Above the entrance, a neon sign:

> **The Paradise Lodge**
> *Rooms to let*

He goes in. Parlour to the left, reception to the right. Rosie is at the desk. Mid fifties, shoulder-length red and grey, ugly cardigan, cigarette.

> "I found her, Detective. She was one of my long termers. Come find me when you're done."

She points upstairs. Miller takes the central staircase and turns right to 1A.

**Rosie appears twice.** Once at reception on the way in, brief and directive. Once in the parlour on the way back down, for the 2am conversation. She relocates between beats. The player is shown the parlour door before they ever need it, which teaches the space without a marker.

No interaction in the cold open. Walk, look, listen. It is thirty seconds and it sets the entire tone.

### Room 1A

Room 1A is upstairs, on the corner of the front and side. Afternoon sun, roughly 3pm, fixed. A verandah runs off 1A with external stairs straight down to the back yard.

**The light is the point.** The room is beautifully lit. Everything in it happened at 2am in the dark. Whoever arranged it never saw it like this.

Spaces: 1A, hallway, stairs, parlour, verandah, back yard. Six.
Characters: Crystal (prop), Rosie (rooted), Moretti (follows).
No combat AI anywhere in this scene.

### Objective gates

| # | Space | Beat |
|---|---|---|
| 0 | Street, entry | Cold open. Rosie at reception |
| 1 | 1A, body | Needle, then the temple. Cause of death |
| 2 | 1A, room | Sling, frame, sill |
| 3 | 1A, room | Lighter |
| 4 | Verandah | Miller clocks the stairs down to the yard |
| 5 | Parlour | Rosie. The 2am bang |
| 6 | Parlour | Diary. Tag |
| 7 | Yard | Hammer. Tag |
| — | Exit | Theorise with Moretti |

Gate 4 is deliberately before gate 7. The player works out how the hammer got there before Miller says it.

### Evidence

| ID | Look | Examine reveals | Lands in |
|---|---|---|---|
| `needle` | Syringe in the crook of her arm | One puncture. Nothing under it. No history | S4 |
| `temple` | Her head, turned toward the window | Blunt trauma, left temple, under the hair | S2, S4 |
| `sling` | Rubber tie around her upper arm | Tied neatly, still tight, wrong side | S4 |
| `frame` | Photo frame angled at the bed | Crystal and a man, black shirt, ponytail. Dust ring shows it lay face down for weeks | S2, S4 |
| `sill` | Sash window, open a hand's width | Faint partial, toe pointing out | S4 |
| `lighter` | Cigarette lighter, crystals in the case | Mahoney's Bar on the base | S2 |
| `diary` | Notebook on the parlour table | *meeting M for lunch - mahoneys 3pm Tuesday* | S2 |
| `hammer` | Hammer leaning by the shed | Blood on the handle. More on the head | S2 |

Every clue lands in a later scene. Nothing is decoration.

**Rosie's line:** there was noise at 2am, but this is St Kilda, there's always loud bangs. She's not evasive and she's not lying. The verandah means anyone could reach 1A without passing her.

### The travel pile

On the dresser: travel magazines, a map with pins in it, and a note in her handwriting.

> *fly out April 6th! Can't wait!*

**The destination is never named and never matters.** Do not let anyone add it later.

This does not help catch anybody. It is evidence of a life, not evidence of a crime, and it is the reason Miller keeps going.

It also reframes the motive. Crystal was not a career extortionist. She was buying a plane ticket. She got clean, she got a plan, and a publican took it off her over money he could have gone on paying.

**Set the game before 6 April.** Close enough that the date on that note is the worst object in the room after the needle.

---

## Scene 2 — The Station

Walk the hammer to forensics. Pour a coffee. Wait.

Forensics returns prints on the handle. Miller pulls the profile: **Victor Rakov**, priors, known to the King St Crew.

Mark comes in and gives a statement. He's the man in the photo, he's the M in the diary, he left Crystal at Mahoney's at seven, he worked the door all night and the bar staff will say so. He is not a suspect and the player should feel the correction land.

**Mark's real job is to put Crystal inside Mahoney's.** The clue that looked like a name was a location.

He got clean the same year she did, or she got clean and then they started. Don't say which. He's the only grief in the game. Keep him short and keep him in.

Systems: new level, terminal UI, one timer, dialogue. No new mechanics.

---

## Scene 3 — Victor's

Miller gets out of the car. Victor runs. Miller chases and loses him. The radio says Moretti got him going over a fence.

**Build this as a scripted set piece.** Victor animates down a fixed path, rounds a corner, despawns. Trigger fires. There is no pursuit AI and no failure state, because the chase is designed to be lost.

Do not build flee AI for a chase the player cannot win.

---

## Scene 4 — Interrogation

The only route to Sterling. There is no forensic path — Victor's prints are on Victor's hammer, and whatever is on that handle points at Victor and nobody else.

**The lever:** that room was worked by two different people. One swung once, hard, at a temple. The other tied a sling with even tension, seated a needle at the wrong angle, and stood a photograph up facing the bed. Those are not the same hands. Then the hammer got left at the bottom of the stairs, which is neither of them being clever.

Miller's play is not *you did it*. It's **you're wearing someone else's swing**. Victor staged a murder he didn't commit and he's the only name on the weapon.

Systems: evidence-presentation layer on the dialogue system. Present the wrong clue and the thread closes.

---

## Scene 5 — Mahoney's

Miller and Moretti arrive. Sterling is smug and reads as untouchable. Claims alibis. Refuses the office without a warrant.

Miller pushes. A fight breaks out in the bar. Moretti runs off to deal with it.

**The fight is environmental.** It happens around Miller, not to him. Scripted NPCs, no player input, no combat system. Miller walking through a brawl without looking at it is the characterisation.

Miller corners Sterling and takes him by the collar.

> "I'll ruin you now or ruin you later. Your choice."

Cut to a cell door closing on Sterling. **Suspicion of murder and sale of drugs.**

Do not make the ending procedural. No charge sheet, no caption, no explanation of how it held up. The door closes.

Then, for the first time in the game, you see Miller and Moretti.

**End.**

---

## Technical notes

**The final reveal is one frame.** Characters are the hardest thing in a 3D game and the reason most AI-built attempts fail. In this game the player never sees the protagonist, and the two faces that matter appear in a single shot, from a single angle, in a single lighting setup. Hand-tune that one frame. Everything else is bodies at a distance, a corpse, and a woman smoking in a parlour.

**Hands are the second-hardest asset.** Gloves help enormously, because a gloved hand hides the knuckle and fingernail detail that makes bare CG hands read as wrong. Every examine animation is bespoke, so budget one per object, roughly a dozen for scene 1.

**Fixed sun.** Scene 1 is a locked sun angle at roughly 3pm. It lights itself, stays consistent, and gives the game its strongest image: a murder room that looks like a real estate photo.

**No combat, anywhere.** Not in the lodge, not in the chase, not in the bar. If the player can throw a punch you have built a different game.

**Twelve-hour body.** She died at 2am and is found in the afternoon. Lividity and rigor are visible. The examine text can carry the timeline without a line of dialogue.

---

## Open decisions

Resolve before build. Everything else is locked.

**1. The date.** Set before 6 April, close enough that the note lands. Pick the year while you're at it, because it decides the props, the cars, the neon, and whether anyone has a phone.

That is the only one left. Everything else is locked.

---

## Build order

Scene 1 is roughly 80% of the engine. Everything after it is content in the same systems.

Build scene 1 complete before touching scene 2. Do not rough out five scenes.

1. Player controller, first person, walk / crouch / lean
2. Look and examine, two-tier, raycast
2b. Hand rig and gloves, one contextual animation, proven on a single object
3. Case file, evidence IDs, notebook UI
4. Room 1A, geometry and lighting, fixed sun
5. Crystal, prop, all eight examine objects
6. Dialogue system
7. Rosie, rooted, parlour
8. Moretti, navmesh follow, tag-and-bag
9. Rest of the lodge, hallway, stairs, verandah, yard
10. Objective gates and scene exit
11. Scene manager, save on scene boundary

Verify in browser between each step. Don't stack three steps in one prompt.
