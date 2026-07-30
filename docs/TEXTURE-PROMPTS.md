# TEXTURE PROMPTS — Codex pack for Scene 1

For Codex / gpt-image. St Kilda, Melbourne, February 1994.

**These are seamless material tiles and isolated props, not photographs of rooms.**
ASSETS.md forbids photoreal environment photos as wall/floor maps — they fight the
locked palette and read as a collage. Lock every tile to the hex given.

### How to deliver

1. Generate each asset. Prefer 2–3 seeds; pick the one that holds the hex and seams.
2. Save under the **exact filename** in the **Goes** column (project root relative).
3. Tell the agent which files landed. It resizes to `public/textures/*.jpg` and wires them.
4. Do **not** invent alternate names. The loader keys on these.

Shared tile preamble — prepend to every seamless map:

> Seamless tileable PBR albedo texture, top-down orthographic, no perspective, no
> furniture, no people, no text, no logos. Even studio lighting. Sharp focus, no
> depth of field, no vignette, no film grain overlay. The dominant colour must
> match hex COLOUR exactly as the base. Designed for realtime 3D tiling. Square.

---

## 1. `wallpaper-floral.png`

| | |
|---|---|
| **Goes** | `images/assets/wallpaper-floral.png` |
| **Size** | 1024 × 1024, seamless |
| **Hex** | `#B8A48C` |

> [preamble with COLOUR `#B8A48C`]
>
> Faded Victorian bedroom wallpaper. Dense small-scale floral sprigs in muted
> dusty rose and sage on the cream-ochre ground. Soft foxing and a faint vertical
> water stain near one edge that still tiles. Matte paper, slightly yellowed,
> water-marked toward the top third. 1994 Australian boarding house, neglected
> but not ruined. No borders, no picture rail in the texture.

---

## 2. `carpet-brown.png`

| | |
|---|---|
| **Goes** | `images/assets/carpet-brown.png` |
| **Size** | 1024 × 1024, seamless |
| **Hex** | `#5C4433` |

> [preamble with COLOUR `#5C4433`]
>
> Worn wool hall runner carpet, mid-brown. Low pile, fibres visible, traffic lane
> down the centre worn toward a lighter backing. Subtle loop weave at 0.1–0.5 m
> scale. Scuffs and flattened nap, not holes. Australian boarding-house stair
> carpet, 1994. No geometric pattern, no oriental motif, no border stripe in the
> tile (border is geometry elsewhere).

---

## 3. `bedspread-rose.png`

| | |
|---|---|
| **Goes** | `images/assets/bedspread-rose.png` |
| **Size** | 1024 × 1024, seamless |
| **Hex** | `#9C6B72` |

> [preamble with COLOUR `#9C6B72`]
>
> Dusty pink chenille bedspread fabric. Raised tufted dots in a tight grid that
> catch raking light, soft pile, matte, slightly faded. Micro-weave between tufts.
> No fringe in the tile (fringe is mesh). No quilting diamonds, no printed pattern.
> Heavy 1970s–80s Australian chenille still on the bed in 1994.

---

## 4. `render-cream.png`

| | |
|---|---|
| **Goes** | `images/assets/render-cream.png` |
| **Size** | 1024 × 1024, seamless |
| **Hex** | `#D8CDBA` |

> [preamble with COLOUR `#D8CDBA`]
>
> Sun-bleached Victorian exterior cement render. Fine sand texture, mid-frequency
> plaster laps and trowel bands, pale water staining and rising-damp mottling in
> `#8A7C68` kept subordinate to the cream ground. Hot February St Kilda facade,
> not grey concrete, not brick. Matte, dry, no graffiti, no windows.

---

## 5. `marble-step.png`

| | |
|---|---|
| **Goes** | `images/assets/marble-step.png` |
| **Size** | 1024 × 512 (wider than tall is fine) |
| **Hex** | `#C9C4B8` |

> Orthographic material study of worn marble stair tread, not a full staircase.
> Colour `#C9C4B8`. Soft grey veining, hollowed wear in the centre of the tread
> where feet land, rounded nosing edge, matte and dusty rather than polished.
> Seamless along the long axis if possible. No brass rods, no carpet runner in
> frame. Even light, sharp, photorealistic stone sample.

---

## 6. `neon-sign.png`

| | |
|---|---|
| **Goes** | `images/assets/neon-sign.png` |
| **Size** | 2048 × 1024 preferred; transparent background |
| **Note** | Replaces the facade photo currently at this name. Letterforms only. |

> Isolated 1990s Australian hotel neon lettering on a fully transparent background.
> Two lines, no building, no wall, no brackets, no sky.
>
> Upper line in hot pink neon tube script/block mix, exact text: THE PARADISE LODGE
> Lower line in cyan neon, exact text: Rooms to let
>
> One tube segment in the upper line is dead and dark. Tubes have realistic glass
> thickness and slight bloom. High contrast so an alpha matte can be pulled from
> luminance. Sharp, legible, no extra words, no logo mark.

---

## 7. `crystal-dress.png`

| | |
|---|---|
| **Goes** | `images/assets/crystal-dress.png` |
| **Size** | 1024 × 1024, seamless |
| **Hex** | ground near `#E8E2D6` |

> [preamble with COLOUR `#E8E2D6`]
>
> Cream floral tea-dress cotton. Small delicate rose print in faded pink and sage,
> soft woven cloth, slight translucency in the weave, not satin. Summer dress
> fabric, well made, 1994. Seamless tile for UV on a character mesh. No buttons,
> no seams, no mannequin.

---

## 8. `map-pins.png`

| | |
|---|---|
| **Goes** | `images/assets/map-pins.png` |
| **Size** | 1024 × 1024 |

> Folded tourist or street map laid flat as a texture. Creases, soft dog-ears,
> a few pin holes with slight rust rings. Colours muted, print slightly out of
> register. Destination names cropped or unreadable. Warm paper, 1994. Orthographic,
> fills the frame, no pins sticking up in 3D, no hands. Photorealistic paper prop
> texture.

---

## 9. `magazines.png`

| | |
|---|---|
| **Goes** | `images/assets/magazines.png` |
| **Size** | 1024 × 1024 |

> Early-1990s travel magazine cover, flat scan style. Glossy stock, period layout,
> destination photograph on the cover but title masthead unreadable or cropped.
> Australian newsagent shelf, 1994. No modern logos, no readable brand names.
> Orthographic, cover fills frame. Photorealistic.

---

## 10. `floorboards-oak.png` (Room 1A floor)

| | |
|---|---|
| **Goes** | `images/assets/floorboards-oak.png` |
| **Size** | 1024 × 1024, seamless along board length |
| **Hex** | around `#8A7358` |

> [preamble with COLOUR `#8A7358`]
>
> Wide worn timber floorboards, dry matte oak-brown, visible grain and knots,
> dark gaps between boards, subtle cupping. Board width consistent for tiling.
> Dusty boarding-house bedroom floor, not polished parquet, not laminate. No rug
> in the texture.

---

## 11. `timber-dark.png`

| | |
|---|---|
| **Goes** | `images/assets/timber-dark.png` |
| **Size** | 1024 × 1024, seamless |
| **Hex** | `#3B2A1E` |

> [preamble with COLOUR `#3B2A1E`]
>
> Dark stained furniture timber, satin not mirror gloss, fine open grain running
> one way, slight scratch and wear in the mid-frequencies. Wardrobe and dresser
> wood for a 1994 boarding house. No knots the size of dinner plates, no bark,
> no sapwood stripes that break tiling.

---

## Already shipped — do not regenerate unless replacing

| File | Role |
|---|---|
| `images/assets/photo-in-frame.png` | Crystal & Mark pub snapshot |
| `images/assets/diary-page.png` | Diary ledger page |
| `images/assets/note.png` | “fly out April 6th…” |
| `images/assets/victor-record.png` | Scene 2 (can wait) |

Current `images/assets/neon-sign.png` is a **facade photograph** and cannot be used as letterforms. Item 6 replaces it.

---

## Checklist for Codex handoff

```
images/assets/wallpaper-floral.png
images/assets/carpet-brown.png
images/assets/bedspread-rose.png
images/assets/render-cream.png
images/assets/marble-step.png
images/assets/neon-sign.png          ← letterforms + alpha only
images/assets/crystal-dress.png
images/assets/map-pins.png
images/assets/magazines.png
images/assets/floorboards-oak.png
images/assets/timber-dark.png
```

When any subset is in the tree, say which filenames landed and the agent wires them.
