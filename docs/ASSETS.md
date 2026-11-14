# ASSETS.md — The Paradise Lodge

Art and audio. St Kilda, 26 February 1994.

~~Everything here is authored. No procedural generation.~~ **Revoked 30 July 2026.** Assets are sourced: Poly Haven and Sketchfab, CC0 or CC-BY, downloadable, low to mid poly with clean UVs, every one credited in `docs/CREDITS.md`. Surfaces are full PBR sets, not a single albedo tile with a guessed roughness. Indirect light is baked in Cycles and shipped as a map. The layout is still authored and always will be. See *The render reset* in CLAUDE.md.

The palette, the copy, the period rules and the audio direction below are unchanged and still binding.

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

**That list is Unit A's shopping list.** Reception wants the desk, the key rack, the phone, the ledger and the ashtray; the parlour wants two armchairs, a sofa, a low table, a standard lamp and a TV in a timber cabinet. Sourced, same rules as room 1A's fourteen.

### 3. Central staircase and first-floor hall
Wide Victorian staircase, carpet runner worn through on the treads, brass stair rods. Numbered doors. 1A first on the right.

**No furniture in either.** They are transit and they are where the budget gets saved.

The staircase, the doors, the skirtings and the picture rails are **built, not sourced**, in `tools/blender/kit_arch.py`. That is not a break with the sourcing rule: nothing downloadable is a Victorian double-hung sash or a stair that lands on `lodge.ts`'s 18 risers at 0.19, and the architecture has to line up with what is already standing to the centimetre. Furniture is sourced; the building is built. Same split room 1A settled.

### 4. Room 1A
Bed, dresser, chair, wardrobe, side table, sash window onto the verandah.

**Current build state (2 August 2026): done and shipped inside the complete lodge
interior.** Room 1A is fourteen sourced Sketchfab models assembled in Blender
and baked in Cycles. Reception, parlour, staircase and first-floor hall now ship
with it in `public/models/unit-a.glb`; the combined interior and five lightmaps
are 34.12MB. Crystal, the hand, Rosie and Moretti remain separate modelled glTF.
The street/facade, verandah and yard are the remaining Scene 1 placeholder art.

### Baked light per space

Density is set by **dwell time, not floor area**. The first-floor hall is six seconds of walking and does not get hero resolution.

| Space | Lightmap | Why |
|---|---|---|
| Room 1A | 2048 | Half an hour, crouched, close to everything |
| Parlour | 2048 | The one conversation in scene 1 that carries information |
| Reception | 1024 | A conversation, standing, and a desk full of look targets |
| Staircase | 1024 | Walked twice, and the runner is the texture that reads |
| First-floor hall | 512 | Transit |

Exteriors are **not baked at all**. HDRI plus the one sun, realtime. AO to vertex colours if contact shadows read badly, and nothing beyond that.

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
| **Miller** | Hands only, until the epilogue | Gloves in scene 1. Cuff state per scene. Silhouette shown beside Moretti in Scene 5 Watchhouse epilogue still. **Hand mesh done:** source `assets/blender/miller-hand.blend`, shipped `public/models/miller-hand.glb`, ref `images/characters/miller-hands.png` |
| **Moretti** | Full, mid distance | Uniform constable. Never closer than two metres. Generated locally from `images/characters/moretti-sheet.png` to `public/models/moretti.glb` (preserving Three.js joint hierarchy across S1–S5) |
| **Rosie** | Full, close | Mid 50s, shoulder-length red and grey, ugly cardigan, cigarette always lit. **Live mesh:** `public/models/rosie-rigged.glb` (Mixamo `idle` loop + cigarette ember pulse). Older `public/models/rosie.glb` has been removed. Source in `art-source/characters/rosie/`. See `docs/MOVING-FORWARD.md` |
| **Crystal Vance** | Full, very close | 22, blonde, petite, well dressed. Twelve hours dead. Lividity and rigor visible. Generated locally from `images/characters/crystal-sheet.png` to `public/models/crystal.glb`. On the bed in room 1A |
| **Mark** | Full, mid | Bouncer build (Prince of Wales, Fitzroy St), black shirt, ponytail. Mapped from `images/characters/mark-sheet.png` to `public/models/mark.glb` (seated in S2 Interview Room 2) |
| **Victor Rakov** | Full, distance and interview | Seen running in Scene 3, then across a table in Scene 4. Mapped from `images/characters/victor-sheet.png` to `public/models/victor.glb` |
| **Kenneth Sterling** | Full, close | Publican at Mahoney's Bar. Smug. Mapped from `images/characters/sterling-sheet.png` to `public/models/sterling.glb` |
| **Uniforms, drinkers** | Low, background | Never examined |

**The closing epilogue still is the watchhouse corridor frame.** During scenes 1–5 the camera stays strictly in first person (OTS reception camera retired); Miller is never rendered as a playable 3D body before the Watchhouse epilogue still (`src/ui/ending-screen.ts`).

---

## Audio

Hybrid Web Audio synthesis + 5-track ElevenLabs Music neo-noir soundtrack.

### Ambience per scene
- **Street:** traffic on Fitzroy Street, a tram two blocks off, gulls
- **Lodge interior:** the building settling, a clock, a radio in another room, silence with weight
- **Room 1A:** almost nothing. Distant traffic through the open sash. Flies. Low sustained room tone
- **Station (Scene 2), Prahran Laneway (Scene 3), Interview Room (Scene 4), Mahoney's (Scene 5):** dedicated procedural ambience beds (`src/audio/ambience.ts`) tuned per scene without Scene 1 bleed

### Foley
Web Audio mathematical synthesizers (`src/audio/footsteps.ts`, `src/audio/foley.ts`): footsteps on marble, carpet, floorboards, verandah timber, bitumen, `bluestone`, and `gravel`. Gloves going on. Sash window. Wardrobe. Paper. Lighter. Ashtray. Watchhouse cell door slam (`cellSlam`). Cassette recorder (`tapeClick` / `tapeHum`) and rotary safe dial (`safeDialClick`).

### Music
**Approved 5-track ElevenLabs Music score** (`public/audio/soundtrack/01-theme-paradise-lodge.mp3` through `05-theme-mahoneys-end.mp3`), streamed via `SoundtrackPlayer` (`src/audio/soundtrack.ts`) routed through the Web Audio `Mixer` for scene crossfading and dialogue ducking alongside Web Audio foley and ambience beds. The duplicate 18 MB copy in `assets/audio/soundtrack/` has been removed.

**Never score the discoveries.** No sting when Miller finds the temple. The absence is the effect.

---

## What to make with image generation

Image gen is used for turnaround sheets, portraits, paper props and decals. Character 3D meshes after Rosie are generated locally in-repo from `images/characters/*-sheet.png` and posed directly in Three.js (`tools/characters/build_characters.py`), requiring zero Blender, Hunyuan3D or Mixamo steps.

### Do — these are the highest-value assets in the game

| Asset | Why |
|---|---|
| **The photo in the frame** | Crystal and Mark, 1994 snapshot. Slightly overexposed, bad flash, pub background. This is a texture, and it is the single most loaded object in room 1A |
| **Victor's record photo** | Scene 2. **Done:** `public/textures/victor-record.jpg` wired onto the Scene 2 CID LEAP dossier terminal |
| **Travel magazines** | Cover art. Early-90s travel mag layout (`public/textures/magazines.jpg`) |
| **The map with pins** | Folded paper texture, creases, pin holes (`public/textures/map-pins.jpg`) |
| **The note** | Handwriting. "fly out April 6th! Can't wait!" (`public/textures/note.jpg`) |
| **Crystal's diary pages** | The ledger (`public/textures/diary-page.jpg`) |
| **Wall art, signage, labels** | Neon sign design (`public/textures/neon-sign.png`), Mahoney's decals, Carlton mirror, station noticeboard |
| **Character sheets for modelling** | Rosie, Moretti, Crystal, Miller, Mark, Sterling, Victor (`images/characters/`) |
| **Palette and mood boards** | 1994 St Kilda (`images/mood/`, `images/concept-art/`) |

### The final frame

In Scene 5, cutting on the Watchhouse cell door slam leads directly to the chiaroscuro 2D Watchhouse corridor epilogue still (`src/ui/ending-screen.ts`) depicting silhouettes of Miller and Moretti down the cell block.

### Don't

- Unvetted image generation without matching period silhouettes and face crops as detailed in `docs/MOVING-FORWARD.md`
- ~~Photoreal environment textures. They will not match the authored palette and everything will read as a collage~~ **Revoked.** Photoreal PBR sets are the point now. What keeps them from reading as a collage is one bake and one grade over the lot, not matching swatches by hand

---

## Title cards

Opening title card (`src/ui/title-card.ts`) and Scene 5 closing Watchhouse epilogue (`src/ui/ending-screen.ts`):

```
ST KILDA
26 FEBRUARY 1994
```

Closing Watchhouse Epilogue card:

```
FITZROY STREET, ST KILDA • 27 FEBRUARY 1994
```

(Crystal's note on the dresser still reads *fly out April 6th! Can't wait!* — six weeks ahead of the investigation night.)
