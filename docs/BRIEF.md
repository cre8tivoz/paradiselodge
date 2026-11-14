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
| **Examine** | Press F on a looked-at object | The detail. Creates evidence (Esc cancels) |
| **Talk** | Press F on an NPC | Dialogue node |
| **Tag** | Press G on a taggable object | Miller calls Moretti. Moretti bags it |

### Hands

Miller has hands and they enter frame. Examine is not a text box, it is an action. He reaches out, turns the frame upright, lifts the corner of the diary, crouches and turns her head toward the light.

**Contextual, not physics.** Each examinable object has a bespoke hand animation. Do not build free-form physics grabbing. It never feels good, it takes weeks, and it fights an investigation game.

He pulls on gloves at the front door. That is why you can see the hands, and it is free characterisation.

**He touches. He does not pocket.** He can turn the photo over. He cannot take it. There is no inventory, no item screen, no combining. He tags, Moretti bags. The case file holds knowledge, not objects.

In scene 5, Miller corners Kenneth Sterling behind the bar in dialogue ("I'll ruin you now or ruin you later") and pries the brass cellar key from his vest pocket.

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
| **Graham Miller** | Player. Detective | Never seen in gameplay; seen only in silhouette on the closing watchhouse epilogue still |
| **Constable Moretti** | Offsider | Follows on navmesh, bags evidence, theorises |
| **Rosie Lodge** | Lodge manager | Rooted in the parlour, smoking. First contact |
| **Crystal Vance** | Victim, 22 | Blonde, petite, well dressed. Long-term on-and-off resident. Worked two years at the commercial laundry in Richmond, clean for a year, saving \$800 cash for a ticket to Perth |
| **Mark** | Crystal's friend/ex | Bouncer at the Prince of Wales on Fitzroy St. Alibi holds (on the door 8pm–5am). Upset. Not a suspect |
| **Victor Rakov** | Enforcer / arrest, scene 3 | Known as "The Bricklayer". King Street Crew, carries a bricklayer's claw hammer. Sent to burgle 1A after the murder |
| **Kenneth Sterling** | Killer | Publican at Mahoney's Bar on Fitzroy St. Runs speed and loan-shark extortion out of the cellar. Murdered Crystal and sent Victor for her ledger |

---

## The case (builder's eyes only)

Kenneth Sterling, publican of Mahoney's Bar on Fitzroy Street, runs illegal speed sales and extortion out of the cellar safe. Crystal Vance had lunch with Mark at Mahoney's at 3pm Tuesday and stayed past 7pm talking to Sterling in the back booth. She was saving \$800 from her Richmond laundry shifts to fly to Perth on 6 April, and she held evidence/records concerning Sterling's operations (`paid in full - terminate contract` in Sterling's extortion ledger).

At about 2am Saturday 26 February 1994, Sterling came up the external verandah stairs and in through the sash window of Room 1A with Victor Rakov's bricklayer hammer, hitting Crystal once on the left temple. Before or as Victor climbed through to recover the notebook for Sterling (`"Fitzroy St - grab the book. S."`), Crystal was already dead. Someone staged the room as a relapse overdose: neatly tying the rubber sling, seating a single syringe needle with no prior track marks, and standing the photo frame upright. Neither found the diary downstairs on the parlour table. Leaving in a panic down the verandah stairs, the hammer was left beside the yard shed.

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

Room 1A is upstairs, on the corner of the front and side. Afternoon sun, roughly 3pm Saturday 26 February 1994, fixed. A verandah runs off 1A with external stairs straight down to the back yard.

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

**In Scene 1 the destination is unnamed.** Miller finds evidence of a life, not a crime. In Scene 2, Mark supplies what she never told anyone else: she worked two years at a commercial laundry in Richmond, blistering her hands every night to save \$800 cash for that ticket to **Perth**.

That reframes the motive and raises the stakes. She got clean, she got a plan, and Kenneth Sterling took it off her.

**The timeline is Saturday 26 February 1994 through early Sunday 27 February 1994**, six weeks before her flight date.

---

## Scene 2 — St Kilda CID Station Bullpen

Walk the tagged hammer into the Forensics intake hatch. Pour a mug of instant black coffee at the break station electric urn while Forensics processes the latent prints.

Forensics drops a Manila folder on Miller's desk: four ridge points on the handle match **Victor Rakov**, known to the King Street Crew. Miller pulls Rakov's dossier on the green-phosphor **LEAP mainframe CRT terminal**: priors (GBH, armed robbery, assault with a weapon), bricklayer hammer MO, association with publican **Kenneth Sterling** at Mahoney's Bar, and last known address **14 Regent Street, Prahran**.

Uniforms bring **Mark** into Interview Room 2. He is the man in the photo and the `M` in the diary. He explains Tuesday 3pm lunch at Mahoney's, leaves at 7pm to work the door at the **Prince of Wales** until 5am (confirmed by the door roster and fellow bouncers), and puts Crystal in the back booth talking to Sterling. He breaks down over her saving for the Perth ticket. He is cleared, and Miller and Moretti theorise and roll out to Prahran.

---

## Scene 3 — 14 Regent Street, Prahran & Laneway Chase

Night outside 14 Regent Street: fleet VP Commodore parked kerbside, weatherboard cottage with warm porch light. On the porch table lies a discarded slip of receipt paper: *"Fitzroy St - grab the book. S."*

Victor bolts down the narrow 30-metre bluestone alley past knocked bins and pallets and vaults over the dead-end corrugated iron fence onto Commercial Road. At the base of the fence in wet clay is a fresh size 10 lug workboot print matching the partial on Room 1A's windowsill.

**Built as a scripted set piece.** No pursuit AI and no fail state; the chase is designed to end at the fence. Miller answers Moretti on the Victoria Police VHF shoulder radio confirming Victor is cuffed on Commercial Road and transported back to St Kilda CID Interview Room 1.

---

## Scene 4 — Interview Room 1 (Interrogation)

Sound-dampened St Kilda CID interview room, Saturday 26 February 1994, 22:50 hours. Miller starts the dual-cassette **Sanyo CTR-80** police recorder and delivers the formal Section 464A Crimes Act 1958 caution (`tape_caution`).

Confronting Victor across the laminate table requires physical exhibits rather than guesswork:

1. **Hammer forensics:** Victor claims his hammer was nicked from his ute in Richmond three weeks ago; Miller counters with four clear points of his left palm and thumb off the grip.
2. **Bootprints:** Size 10 lug workboot casts from under 1A's sash window and the alley fence, with matching worn left heel and sliced third lug.
3. **Handwritten slip:** `"Fitzroy St - grab the book. S."` breaks Victor's denial. He admits Sterling sent him up to 1A for the book, swears Crystal was already dead with dried blood on her temple when he climbed in, and panicked when sirens sounded down Fitzroy Street, dumping the hammer at the shed and bolting down the verandah.
4. **Sterling's hideout:** Victor reveals Sterling keeps the syndicate books and floor safe in the keg cellar at Mahoney's Bar on Fitzroy Street, with the brass mortise key on a chain in his waist pocket. Interview concludes at 23:14 hours.

---

## Scene 5 — Mahoney's Bar, Cellar & Watchhouse Epilogue

Late Saturday night running past midnight into Sunday **27 February 1994**. Miller and Moretti enter Mahoney's public bar on Fitzroy Street (mahogany bar counter, Carlton Draught fonts, pool table, poker machines, bluestone cellar behind a locked iron grille).

Sterling denies everything from behind the taps and demands a Section 92 magistrate's warrant. When a fight erupts between two punters at the pool table, Moretti steps in to pin the brawlers against the timber, leaving Sterling isolated. Miller corners Sterling behind the optics (`"I'll ruin you now or ruin you later, Sterling. Your choice."`) and pries the brass cellar key (`'M.B. - CELLAR'`) from his vest pocket.

Miller unlocks the cellar grille, descends to the wet bluestone keg cellar, opens the recessed Chubb-pattern floor safe, and seizes Sterling's black vinyl extortion ledger naming Crystal Vance (`Paradise Lodge Room 1A - paid in full - terminate contract`). Upstairs at the back fire exit, Moretti intercepts Sterling fleeing into the bluestone alley. Miller presents page 42 of the ledger and arrests Sterling for murder, conspiracy, and extortion.

Cut on the watchhouse cell door slam (`audio.foley.cellSlam()`). The chiaroscuro closing epilogue shows the watchhouse cell-block corridor, silhouettes of Miller and Moretti in coat and uniform cap (`FITZROY STREET, ST KILDA • 27 FEBRUARY 1994`), confirming Kenneth Sterling remanded without bail to Pentridge, Victor Rakov pleading to manslaughter and housebreaking, and Crystal Vance dead at twenty-two.

---

## Technical notes

**The final reveal is an epilogue still.** During scenes 1–5 the camera stays strictly in first person (including reception with Rosie). Only the closing Watchhouse epilogue still renders Miller's silhouette alongside Moretti down the corridor.

**Hands are the second-hardest asset.** Gloves help enormously, because a gloved hand hides the knuckle and fingernail detail that makes bare CG hands read as wrong. Every examine animation is bespoke, so budget one per object for scene 1.

**Fixed sun.** Scene 1 daylight mode uses a locked sun angle at roughly 3pm; default dusk mode pairs practicals and film grading so Room 1A stays the clearest room in the building.

**No combat, anywhere.** Not in the lodge, not in the chase, not in the bar. The bar brawl is environmental; the player cannot throw punches.

**Twelve-hour body.** She died at 2am and is found in the afternoon. Lividity and rigor are visible. The examine text carries the timeline without a line of dialogue.

---

## Locked decisions

All narrative and date decisions are now locked:
- **Timeline:** Saturday 26 February 1994 (Scenes 1–4) concluding early Sunday 27 February 1994 (Scene 5 Watchhouse Epilogue), ahead of Crystal's planned 6 April 1994 departure.
- **Canon rewrite:** Scenes 2–5 cast (`Kenneth Sterling`, `Crystal Vance` 22, `Prince of Wales`, `"Perth"` ticket / \$800 Richmond laundry savings) and plot beats are authoritative.
- **Camera rule:** Strict first person throughout all playable scenes (OTS reception camera retired); Miller silhouette/epilogue appears only at the Watchhouse ending.

---

## Build order

Scene 1 is roughly 80% of the engine. Scenes 2–5 reuse the same subsystems with per-scene worlds, dialogues, and gate trackers.

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
11. Scene manager, save on scene boundary & scene transitions
