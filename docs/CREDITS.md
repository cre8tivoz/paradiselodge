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
| `wood_planks` | Room 1A floor | [Poly Haven — Wood Planks](https://polyhaven.com/a/wood_planks) | Amal Kumar | CC0 |

## Models

Sourced from Sketchfab, filtered to downloadable and CC-BY. Fetched through the
Blender MCP and exported to `assets/sourced/<slot>.glb`.

**`assets/sourced/` is not in git.** It is 208MB of uncompressed source textures
and it is a download cache, not a source of truth. The uid column is what
reproduces it: `download_sketchfab_model` with that uid gives back the same
asset. What the game ships is the baked, Meshopt-compressed room out of step 6.

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
| `mattress` | [Mattress](https://sketchfab.com/models/6a526b42e6a34a4ba12136a40d9a686b) | Miguel Ángel | CC-BY 4.0 | `6a526b42e6a34a4ba12136a40d9a686b` |

### What each one is, and what it is for

| Slot | Poly | Source units | Note |
|---|---|---|---|
| `bed` | 3.4k | inches | Plain iron single frame, no bedding. The bedding and the spread stay ours |
| `dresser` | 2.6k | inches | Timber, two drawers, swing mirror on top. The mirror is why this one won |
| `wardrobe` | 2.4k | **metres** | Two door, panelled, arched cornice. Already at real scale |
| `bedside` | 4.5k | **metres** | Round Victorian side table with a lower shelf |
| `chair` | 1.7k | **metres** | Thonet no. 14. The bentwood chair, and the correct one |
| `window` | 0.7k | metres | Three painted timber windows in a row. Evaluate at step 4; the sash may be better built with the room shell |
| `hammer` | 0.8k | **metres** | Timber handled claw hammer. Scene 1's yard hammer |
| `frame` | 1.8k | inches | Plain standing frame with a strut. Carries the authored `photo-in-frame` texture |
| `lighter` | 0.5k | centimetres | Disposable plastic. Period correct, a Zippo would not be |
| `magazines` | 2.1k | millimetres | Stack of printed matter. Carries the authored `magazines` texture |
| `syringe` | 15.5k | centimetres | Disposable plastic, not a glass and steel antique. 1994 |
| `bedding` | 33k | source units | The blanket and the pillow only. Its timber frame was thrown away and it goes on the sourced iron one. Retextured to dusty rose |
| `mattress` | 34k | centimetres | Quilted, rounded edges. Scaled to the frame's interior on both axes and retextured to ticking. It replaced a grey box |

**Nothing is at a consistent scale and that is normal for Sketchfab.** Three of
them are in metres, the rest are in inches, centimetres or millimetres. Every
one gets scaled and placed by hand when the room is assembled at step 4.

## Authored textures

`public/textures/*.jpg` are authored in `images/assets/`. Not third party. They
are stand-ins for sourced PBR sets and go as each one is replaced.
