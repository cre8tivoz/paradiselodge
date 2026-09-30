# Look-dev harness

Standalone three.js 0.180 sandbox for the Paradise Lodge picture. It is a reference, not part of the game. Vite, `tsc` and Cloudflare Pages build the game from the repo root `index.html` and publish `dist` only. This directory is excluded from the game TypeScript project and from the Vite entry.

The harness was recovered off a machine that had already been wiped once. Keep it in git.

## Run it

From this directory:

```bash
cd tools/lookdev
npm install
python3 -m http.server 8600
```

Open `http://127.0.0.1:8600/`. The page is an import map against `node_modules/three`, so it wants a static server, not the game's Vite process.

Headless stills need Chrome and the local `puppeteer-core` install:

```bash
QS="shot=reception-rosie" node render/render.mjs still out/name.png
QS="shot=walk" node render/render.mjs frames 0 30 1 out/frames
QS="shot=reception-rosie" node render/render.mjs bench out/bench.json
```

`render/render.mjs` serves this directory. It used to assume a path on the machine that got wiped.

## URL parameters

| Param | Values | What it does |
|---|---|---|
| `shot` | `reception-rosie` (default), `hall-stairs`, `parlour`, `exterior-dusk`, `walk` | Camera. `walk` is an 18 s path from the front door, past Rosie, toward the stairs |
| `rosie` | `billboard` (default), `3d`, `3dv2`, `rigged`, `both` | Who stands in reception. Default is the photo card. `3d` / `3dv2` want GLBs that are not in this archive. `rigged` loads the Mixamo idle FBX |
| `look` | `game` | Rebuilds the current Unit A lightmaps and 3pm sun, no film pass. Interior shots only |
| `rig` | path to an FBX | Overrides the rigged idle file |
| `push`, `pushdur` | metres, seconds | Dolly toward the shot target |
| `dof` | `0` or `1` | Depth of field. Off unless set. Off for `walk` |
| `ao`, `bloom`, `post`, `probe` | `0` to disable | AO, bloom, the film pass, the local environment probe |
| `w`, `h`, `fps` | pixels, frames | Frame size and the walk/export frame rate |
| `exposure`, `contrast`, `saturation`, `vignette`, `grain`, `ca`, `bloomStrength` | numbers | Overrides on the grade |

Examples:

- `?shot=reception-rosie&rosie=rigged`
- `?shot=exterior-dusk`
- `?shot=reception-rosie&look=game`
- `?shot=walk&rosie=billboard`

## Where the files are

Rosie v2 source art is canonical under `art-source/characters/rosie/`. The game-ready mesh is `public/models/rosie-rigged.glb`. Symlinks in this tree point at those files so the original relative paths still resolve:

- `mixamo/rosie-idle.fbx`, `mixamo/rosie-walk.fbx`
- `phase2/v2/` textures, A-pose images, and `rosie3d-v2-mixamo.fbx`
- `out/phase2/v2/rosie-rigged.glb`
- `assets/unit-a.glb`, `assets/lodge-exterior.glb`, `assets/commodore.glb`, `assets/env/balcony_2k.hdr`, `assets/bake/unit-a_*.exr` (the game's copies)

`?rosie=rigged` reads the idle FBX plus `phase2/v2/rosie-v2-body.png`, `rosie-v2-face.png` and `rosie-v2-hair.png`. If Mixamo dropped hair, glasses or the cigarette, the loader also asks for `phase2/v2/rosie3d-v2.glb`. That unrigged GLB was not in the archive. The shipped `rosie-rigged.glb` already contains the clips and the WebP textures.

`assets/tex/` (the code-material photographs) and the billboard cutouts `assets/rosie-front.png` and friends were not in the archive. Interior materials that sample those JPGs will miss their maps until `tools_cut_rosie.py` is run, or the textures are dropped in. `?look=game` uses the Unit A GLB and its EXR lightmaps, which are linked.

## What is in here

| Path | Role |
|---|---|
| `src/main.js` | Page, URL params, post, `window.__renderFrame` |
| `src/lighting.js`, `src/post.js`, `src/materials.js`, `src/dressing.js` | Picture |
| `src/exterior.js`, `src/interior.js`, `src/gamelook.js` | Sets |
| `src/shots.js` | Cameras |
| `src/billboard.js`, `src/character3d.js`, `src/character_rigged.js` | Rosie modes |
| `render/render.mjs` | Headless capture |
| `tools_cut_rosie.py`, `tools_sheets.py` | Cut the sheet, build before/after boards |
| `phase2/` | Hunyuan3D / Trellis clients, texture bakes, A-pose |
| `phase2/v2/rigcheck.html`, `phase2/v2/glbcheck.html` | Rig and GLB viewers. Open these, not the copies under `out/`, whose relative URLs assume this location |
| `out/phase2/v2/src/` | Export scripts (`export_rigged.mjs`, `finish_glb.mjs`) and the snapshot they were saved from |

Python tools need their own packages (`pillow`, `numpy`, `scipy`, `rembg`, `opencv`, `trimesh`, `xatlas`, `fast-simplification`, `gradio-client`). They are not part of the game install. `tools_cut_rosie.py` reads `images/characters/rosie-sheet.png`.
