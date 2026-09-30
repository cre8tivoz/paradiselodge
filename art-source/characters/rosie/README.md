# Rosie v2 source

Working files for the image-to-3D Rosie. The game does not load this directory.

The mesh the game will load, once she is wired, is `public/models/rosie-rigged.glb` (1.65 m, about 39.5k triangles, Mixamo 33-bone skeleton, `idle` and `walk` clips, WebP textures, about 2.6 MB). The live game still uses `public/models/rosie.glb`. Do not swap them until that task.

| File | What it is |
|---|---|
| `rosie3d-v2-mixamo.fbx` | A-pose uploaded to Mixamo for the auto-rig |
| `rosie-v2-body.png` | Body albedo, 2048, baked from the sheet |
| `rosie-v2-face.png` | Face albedo, 1024 |
| `rosie-v2-hair.png` | Hair card albedo, 512, alpha |
| `apose-front.png`, `apose-back.png` | A-pose references. The back is synthesised |
| `mixamo/rosie-idle.fbx` | Mixamo idle download |
| `mixamo/rosie-walk.fbx` | Mixamo walk download. Root motion, not in place |

Pipeline and limits: `docs/MOVING-FORWARD.md`. Scripts: `tools/lookdev/`.
