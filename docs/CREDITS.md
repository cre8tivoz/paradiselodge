# Credits

Third party assets. Every entry needs a source, an author and a licence before
the asset is committed or shipped.

CC-BY requires attribution wherever the work is distributed, and a baked room is
a distribution, so this file is the attribution and it ships with the game.

---

## Environment maps

| File | Source | Author | Licence |
|---|---|---|---|
| `public/env/balcony_2k.hdr` | [Poly Haven — Balcony](https://polyhaven.com/a/balcony) | Greg Zaal | CC0 |

## PBR material sets

Full sets under `public/textures/pbr/<id>/`, 2k jpg, named as shipped: albedo
(`diff`), OpenGL normal (`nor_gl`), roughness (`rough`), occlusion (`ao`).

| Set | Used on | Source | Author | Licence |
|---|---|---|---|---|
| `wood_planks` | Room 1A floor, and `boards_worn` in the library | [Poly Haven — Wood Planks](https://polyhaven.com/a/wood_planks) | Amal Kumar | CC0 |
| `beige_wall_001` | `plaster_nicotine` and `plaster_cornice` | [Poly Haven — Beige Wall 001](https://polyhaven.com/a/beige_wall_001) | Dimitrios Savva, Rico Cilliers | CC0 |
| `dirty_carpet` | `carpet_runner`, the hall and stair runner | [Poly Haven — Dirty Carpet](https://polyhaven.com/a/dirty_carpet) | Rohit Seervi | CC0 |
| `dark_wood` | `timber_dark`, skirtings, banister, desk, picture rail | [Poly Haven — Dark Wood](https://polyhaven.com/a/dark_wood) | Dario Barresi, Dimitrios Savva, Rico Cilliers | CC0 |
| `checkered_pavement_tiles` | `tile_entry`, the tessellated entry floor | [Poly Haven — Checkered Pavement Tiles](https://polyhaven.com/a/checkered_pavement_tiles) | Amal Kumar | CC0 |

### The material library

`assets/blender/materials.blend` holds six named surfaces built from those five
sets, and **every Unit A space links it rather than copying it**, so the plaster
is judged once instead of drifting a few percent per room and reading as a
lighting fault at the doorway between them.

It is gitignored at 41MB and rebuilt end to end by
`tools/blender/build_materials.py`, which fetches from the Poly Haven API
itself rather than through the addon. Two of the six are the same maps under a
different tint: a cornice is painted plaster and a picture rail is stained
timber, and those are shapes rather than surfaces.

Only four of Poly Haven's seven maps are kept. `nor_dx` is the DirectX normal
and this project is OpenGL throughout, `arm` is a packed variant of maps that
are already here separately, and `Displacement` would need real subdivision to
mean anything. **AO is kept and deliberately left unwired**: Cycles computes
occlusion for real in Unit A's bake, and multiplying the baked-in kind into the
albedo as well darkens every crevice twice. Unit B is realtime and will want it.

## Models

Sourced from Sketchfab, filtered to downloadable and CC-BY. Fetched through the
Blender MCP and exported to `assets/sourced/<slot>.glb`.

**`assets/sourced/` is not in git.** It is 232MB of uncompressed source textures
and it is a download cache, not a source of truth. The uid column is what
reproduces it: `download_sketchfab_model` with that uid gives back the same
asset. What the game ships is `public/models/room1a.glb`, 7.2MB, geometry
uncompressed and every texture capped and re-encoded to JPEG on the way out.
Meshopt is allowed and was not needed: geometry is a rounding error next to
textures in a room like this.

**Two of the fourteen are not in the shipped room.** `window` was sourced,
evaluated at step 4 and not used — nothing downloadable is a Victorian double
hung sash, so both of 1A's windows are built in `build_room1a.py` and the
sourced pack stays as reference for the mouldings. `hammer` is scene 1's yard
hammer and the yard is Unit B, so it is sourced and waiting. Both rows stay
here: they were downloaded under CC-BY and the licence follows the file, not
the shipping decision.

| Slot | Model | Author | Licence | Sketchfab uid |
|---|---|---|---|---|
| `bed` | [Metal Bed Frame](https://sketchfab.com/models/5e22458c087f499fad020ffdb47454f3) | Kuutti Siitonen | CC-BY 4.0 | `5e22458c087f499fad020ffdb47454f3` |
| `dresser` | [Old dresser](https://sketchfab.com/models/d235f91eee0a484d95283afccc83931d) | Vladyslav Holhanov | CC-BY 4.0 | `d235f91eee0a484d95283afccc83931d` |
| `wardrobe` | [Antique Wooden Wardrobe](https://sketchfab.com/models/a3c221e5504d40a8ba019f8f1bf5ab0e) | Kuutti Siitonen | CC-BY 4.0 | `a3c221e5504d40a8ba019f8f1bf5ab0e` |
| `bedside` | [Nightstand](https://sketchfab.com/models/9ea0d9f8b64b438b9550e50aa5c59594) | Michael Belo | CC-BY 4.0 | `9ea0d9f8b64b438b9550e50aa5c59594` |
| `chair` | [Thonet nº14](https://sketchfab.com/models/8fadb3165a874c36993a39d4704c897d) | Alba Gonzalez | CC-BY 4.0 | `8fadb3165a874c36993a39d4704c897d` |
| `window` | [Old Painted Wooden Windows](https://sketchfab.com/models/c60a6fe181e1482d96f9412a20c4a390) | Colin Greenall | CC-BY 4.0 | `c60a6fe181e1482d96f9412a20c4a390` |
| `hammer` | [Claw Hammer Low-poly](https://sketchfab.com/models/350687a05234428ebbed8ba32c3a7ac7) | MaX3Dd | CC-BY 4.0 | `350687a05234428ebbed8ba32c3a7ac7` |
| `frame` | [Picture Frame](https://sketchfab.com/models/0ad9f5f4d1644317814a1c7934ff9624) | Xander Morningstar | CC-BY 4.0 | `0ad9f5f4d1644317814a1c7934ff9624` |
| `lighter` | [Lighter (Game Model)](https://sketchfab.com/models/d593d46b2ad240d5a482ad6944bc3db3) | Michael Makivic | CC-BY 4.0 | `d593d46b2ad240d5a482ad6944bc3db3` |
| `magazines` | [Newspaper Stack](https://sketchfab.com/models/c4311a0b918643af97904e10c7a34efc) | karlwirbelwind | CC-BY 4.0 | `c4311a0b918643af97904e10c7a34efc` |
| `syringe` | [Disposable Syringe 2ml Set](https://sketchfab.com/models/4cdb3198b4284144b9722fe4cde5462b) | joezeffdesign | CC-BY 4.0 | `4cdb3198b4284144b9722fe4cde5462b` |
| `bedding` | [Messy Bed](https://sketchfab.com/models/aebc9bae5a4d459494d1e5de76658d5a) | lucaboechat | CC-BY 4.0 | `aebc9bae5a4d459494d1e5de76658d5a` |
| `bedspread` | [Single Bed Blanket](https://sketchfab.com/models/14084f216e834241a7f152cdfa4e5d59) | whewnewacc | CC-BY 4.0 | `14084f216e834241a7f152cdfa4e5d59` |
| `mattress` | [Mattress](https://sketchfab.com/models/6a526b42e6a34a4ba12136a40d9a686b) | Miguel Ángel | CC-BY 4.0 | `6a526b42e6a34a4ba12136a40d9a686b` |
| `paper` | [Low-poly Papers Set](https://sketchfab.com/models/2edf57ce2e6c4475bd4897b9c91b0a77) | Hox_Lira | CC-BY 4.0 | `2edf57ce2e6c4475bd4897b9c91b0a77` |

### What each one is, and what it is for

| Slot | Poly | Source units | Note |
|---|---|---|---|
| `bed` | 3.4k | inches | Plain iron single frame, no bedding. The bedding and the spread stay ours |
| `dresser` | 2.6k | inches | Timber, two drawers, swing mirror on top. The mirror is why this one won |
| `wardrobe` | 2.4k | **metres** | Two door, panelled, arched cornice. Already at real scale |
| `bedside` | 4.5k | **metres** | Round Victorian side table with a lower shelf |
| `chair` | 1.7k | **metres** | Thonet no. 14. The bentwood chair, and the correct one |
| `window` | 0.7k | metres | Three painted timber windows in a row. **Not shipped.** Evaluated at step 4 and the sash was built with the shell instead: it has to line up with `FIRST_WINDOW` in `lodge.ts` to the centimetre. Kept as moulding reference |
| `hammer` | 0.8k | **metres** | Timber handled claw hammer. Scene 1's yard hammer. Sourced early, placed at Unit B |
| `frame` | 1.8k | inches | Plain standing frame with a strut. Carries the authored `photo-in-frame` texture |
| `lighter` | 0.5k | centimetres | Disposable plastic. Period correct, a Zippo would not be |
| `magazines` | 2.1k | millimetres | Stack of printed matter. Carries the authored `magazines` texture |
| `syringe` | 15.5k | centimetres | Disposable plastic, not a glass and steel antique. 1994 |
| `bedding` | 33k | source units | **The pillow only, now.** Its timber frame was thrown away at step 4 and its blanket at the play-test pass: the blanket is a throw folded off one side and it left half the mattress bare with Crystal laid out on it |
| `bedspread` | 785 | source units | A plain single bedspread with a flat that covers a mattress, which is the one thing `bedding` could not do. Retextured to dusty rose. 0.95 across against a mattress of 0.75, because wider than that and the fall hangs through the iron side rails |
| `mattress` | 34k | centimetres | Quilted, rounded edges. Scaled to the frame's interior on both axes and retextured to ticking. It replaced a grey box |
| `paper` | 2 | source units | One sheet, separated out of a set of loose papers. Used twice, for the `map` and the `note`, each carrying its own authored image through the sheet's own UVs |

**Nothing is at a consistent scale and that is normal for Sketchfab.** Three of
them are in metres, the rest are in inches, centimetres or millimetres. Every
one gets scaled and placed by hand when the room is assembled at step 4.

## Authored textures

`public/textures/*.jpg` are authored in `images/assets/`. Not third party. They
are stand-ins for sourced PBR sets and go as each one is replaced.
