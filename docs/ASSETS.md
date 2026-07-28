# ASSETS.md — The Paradise Lodge

Art and audio. St Kilda, 26 February 1994.

Everything here is authored. No procedural generation.

---

## Period rules

1994 is a mechanic, not decoration. Get these wrong and the design stops working.

- **No mobile phones.** Radio in the car, phone on the desk
- **Forensics takes days.** Fingerprints are a manual comparison against a card file. Someone hands Miller a folder
- **Photographs are prints.** This is why the frame can lie face down and leave a dust ring. That clue does not exist after about 2005
- **Records are paper or a green-screen terminal.** Pick one and keep it
- No flat screens, no USB, no lanyards, no hi-vis except on a roadworker

Ashtrays everywhere. Everyone smokes indoors and nobody comments on it.

---

## Palette

Locked. Store as constants, never hardcode in materials.

### Exterior — the Lodge

| Token | Hex | Use |
|---|---|---|
| `render-cream` | `#D8CDBA` | Rendered Victorian facade, sun-bleached |
| `render-stain` | `#8A7C68` | Water staining, rising damp |
| `marble-step` | `#C9C4B8` | Front steps, worn hollow at centre |
| `iron-lace` | `#2E2A26` | Balcony lacework, verandah posts |
| `neon-pink` | `#FF3E8A` | "The Paradise Lodge" |
| `neon-cyan` | `#3EE8FF` | "Rooms to let" |
| `tape-blue` | `#1B3A6B` | Police tape, VicPol navy |

### Interior — parlour and halls

| Token | Hex | Use |
|---|---|---|
| `nicotine` | `#C4B393` | Walls. Was cream once |
| `carpet-brown` | `#5C4433` | Hall and stair runner, worn to backing on the treads |
| `timber-dark` | `#3B2A1E` | Stained skirtings, banister, reception desk |
| `brass-verdigris` | `#7A8A6B` | Fittings, gone green |
| `curtain-maroon` | `#5A2730` | Heavy parlour curtains, sun-rotted at the leading edge |

### Room 1A — afternoon sun

| Token | Hex | Use |
|---|---|---|
| `wallpaper-floral` | `#B8A48C` | Faded, water-marked above the picture rail |
| `sun-warm` | `#FFE0B0` | Direct 3pm sunlight |
| `sun-shadow` | `#6E6croll` | *(see note)* |
| `bedspread-rose` | `#9C6B72` | Chenille, dusty pink |
| `crystal-dress` | `#E8E2D6` | Well dressed. Pale, good fabric, wrong for the room |

> Note: fix `sun-shadow` to a real value at implementation. Suggested `#6E6255`.

**The light is the point.** Room 1A is the only beautiful space in the game. Fixed sun angle, roughly 3pm, warm, low enough to come in under the sash and cross the bed. It should photograph like a real estate listing.

---

## Level assets

### 1. Street and entry
Beige 1993 VP Holden Commodore, unmarked, fleet spec, no personality. Police tape. Two uniform NPCs, VicPol summer blues, checked cap bands. Marble steps. Neon sign, two lines, one tube flickering. Wet-looking Fitzroy Street bitumen even though it hasn't rained.

### 2. Reception and parlour
Reception desk, dark timber, pigeonhole key rack behind. Guest ledger. Bakelite phone. Overflowing ashtray. Parlour visible through a doorway to the left: armchairs, standard lamp, low table, television off.

### 3. Central staircase and first-floor hall
Wide Victorian staircase, carpet runner worn through on the treads, brass stair rods. Numbered doors. 1A first on the right.

### 4. Room 1A
Bed, dresser, chair, wardrobe, side table, sash window onto the verandah.

**Examinable objects — twelve hand animations, budget one each:**

| Object | Interaction |
|---|---|
| Crystal, body | Crouch, turn her head toward the light |
| Needle | Lean in close. Do not touch |
| Sling | Two fingers, lift and let it drop |
| Photo frame | Pick up, turn, set down exactly as found |
| Windowsill | Crouch, sight along the sill |
| Sash window | Push it up another inch |
| Lighter | Pick up, turn over, read the base |
| Travel magazines | Fan the top one open |
| Map with pins | Lean over it. Do not touch the pins |
| The note | Lift the corner |
| Wardrobe | Open, look, close |
| Dresser drawer | Open, look, close |

### 5. Verandah and back yard
Iron-lace verandah wrapping the corner. External timber stairs down. Yard: overgrown, Hills hoist, shed, hammer leaning against it.

### 6. Police station — scene 2
Open plan, partitions, fluorescent tubes, one flickering. Green-screen terminal or paper jackets. Urn and instant coffee. Manila folders. Whiteboard.

### 7. Victor's — scene 3
Housing commission flats or a weatherboard in Prahran. Chain-link fence. Fixed chase path.

### 8. Interview room — scene 4
Table, four chairs, cassette recorder, one high window.

### 9. Mahoney's — scene 5
Public bar. Carpet, pokies, TAB screens, Carlton mirror. Office door at the back. Room for a brawl.

### 10. Cells — final shot
Cell door, corridor, and the only third-person camera in the game.

---

## Characters

| Character | Fidelity | Notes |
|---|---|---|
| **Miller** | Hands only, until the last shot | Gloves in scene 1. Cuff state per scene. Face matters once |
| **Moretti** | Full, mid distance | Uniform constable. Never closer than two metres |
| **Rosie** | Full, close | Mid 50s, shoulder-length red and grey, ugly cardigan, cigarette always lit |
| **Crystal** | Full, very close | 28, blonde, petite, well dressed. Twelve hours dead. Lividity and rigor visible |
| **Mark** | Full, mid | Bouncer build, black shirt, ponytail. Matches the photo exactly |
| **Victor** | Full, distance and interview | Seen running, then across a table |
| **Sterling** | Full, close | Publican. Smug. Needs a face worth grabbing |
| **Uniforms, drinkers** | Low, background | Never examined |

**The final shot is the only frame where a face has to be perfect.** Two characters, one angle, one lighting setup. Hand-tune it. Everything else is bodies at distance, a corpse, and a woman smoking.

---

## Audio

Web Audio. Synthesise or source royalty-free from Freesound.

### Ambience per scene
- **Street:** traffic on Fitzroy Street, a tram two blocks off, gulls
- **Lodge interior:** the building settling, a clock, a radio in another room, silence with weight
- **Room 1A:** almost nothing. Distant traffic through the open sash. Flies
- **Station:** fluorescent hum, phones, typewriters, a printer
- **Mahoney's:** pokies, TAB commentary, a jukebox, glass

### Foley
Footsteps on marble, carpet, floorboards, verandah timber, bitumen. Gloves going on. Sash window. Wardrobe. Paper. Lighter. Ashtray. Cassette recorder engaging.

### Music
Almost none. A single sustained low tone in room 1A that you cannot quite identify as music. Nothing in scenes 2 to 4. One cue on the cell door.

**Never score the discoveries.** No sting when Miller finds the temple. The absence is the effect.

---

## What to make with image generation

Image gen is excellent for textures and fixed frames. It is poor at producing game-ready 3D characters. Use it on the first list, not the second.

### Do — these are the highest-value assets in the game

| Asset | Why |
|---|---|
| **The photo in the frame** | Crystal and Mark, 1994 snapshot. Slightly overexposed, bad flash, pub background. This is a texture, and it is the single most loaded object in room 1A |
| **Victor's record photo** | Scene 2. Mugshot or a photo clipped into a manila jacket |
| **Travel magazines** | Cover art. Early-90s travel mag layout. Destination unreadable or cropped off |
| **The map with pins** | Folded paper texture, creases, pin holes |
| **The note** | Handwriting. "fly out April 6th! Can't wait!" |
| **Crystal's diary pages** | The ledger. Dates and amounts. Only one page ever gets read |
| **Wall art, signage, labels** | Neon sign design, Mahoney's decals, Carlton mirror, station noticeboard |
| **Character sheets for modelling** | Rosie's cardigan, Sterling's face, Crystal's dress. Reference to model against, not the model |
| **Palette and mood boards** | 1994 St Kilda. Lock the look before anyone builds geometry |

### The final shot does not have to be realtime

The only frame in the game where a face must be perfect is the last one. It is a fixed camera, one angle, one lighting setup, and it never moves.

**Render it as a still, or a short pre-rendered sequence, and cut to it.** The game goes from first person to a 2D image and back to black. Games do this constantly, and in a 1994-set piece a slightly filmic still reads as deliberate.

That removes character modelling as a blocker entirely. Miller and Moretti never need to exist as good 3D models. Neither does the cell door corridor.

### Don't

- Image-to-3D for characters. It is still bad and you will spend longer fixing topology than modelling from scratch
- Generating the same face across many angles for a model. Identity drifts and it will not hold up
- Photoreal environment textures. They will not match the authored palette and everything will read as a collage

---

## Title cards

Two only, same typeface, white on black.

```
ST KILDA
26 FEBRUARY 1994
```

```
6 APRIL 1994
```

The second one is the whole ending. No caption, no explanation. The player either catches it or they don't.
