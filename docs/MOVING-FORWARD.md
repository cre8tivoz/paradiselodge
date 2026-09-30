# Moving forward

This plan replaces the old rules that banned image-to-3D, post-processing, fill lights and generated assets, and that required characters built from Blender primitives and lighting baked in Cycles on a Mac. Those rules produced blocky mannequins and cooked the machine. Billy has overruled them.

If an older note in `CLAUDE.md`, `docs/ROADMAP.md`, `docs/SETUP.md` or `docs/ASSETS.md` disagrees with this file on the picture, the lighting, or how a character is made, this file wins.

Story, scene order, the four verbs and the case still come from `docs/BRIEF.md`. Gameplay that already ships stays as it is until a task says otherwise.

## Art direction

Photoreal 1994 St Kilda crime film. Match the references in `images/`, in particular `images/concept-art/` and `images/mood/`.

Interiors are tungsten amber. Nicotine walls. Haze and dust in the light shafts.

The exterior is golden hour into dusk. The road is wet. The neon is pink `THE PARADISE LODGE` and cyan `ROOMS TO LET`. Facade frames are `images/concept-art/01-title-card-the-paradise-lodge.png` and `images/concept-art/02-miller-at-the-lodge-exterior.png`. The reception camera pass uses `images/concept-art/03-reception-with-rosie.png`.

Dusk is the default. `?look=day` or `?daylight=1` keeps the 3pm HDRI and the baked interior. Do not bake a new lightmap to chase the dusk picture.

## Tech approach

Code-first three.js. Lighting, materials and post live in the engine (`src/render/dusk.ts`, `src/render/post.ts`, `src/materials/look.ts`).

The film stack is ambient occlusion (GTAO), bloom, and one grade pass: grain, vignette, split-tone. Depth of field is for cutscenes and stills. It stays off in play.

No Blender session and no local Mac bake is required to change the look or to add a character. Room 1A and the rest of the interior already have lightmaps. Leave them. Do not start another Cycles bake.

Characters come from image-to-3D, from the turnaround sheets in `images/characters/`. Free tools first: Hunyuan3D on Hugging Face Spaces. Rig and animate in Mixamo. Export a GLB. Generated textures and CC0 textures are allowed. Poly Haven and credited CC meshes stay available for furniture and architecture. Record anything third-party in `docs/CREDITS.md`.

Fill has direction. Day mode uses the HDRI. Dusk uses a sky probe plus practicals. Do not put an `AmbientLight` back.

## The character pipeline

Proven on Rosie. Use the same steps for the rest of the cast. The scripts are in `tools/lookdev/`. Rosie's source files are in `art-source/characters/rosie/`. The game-ready mesh is `public/models/rosie-rigged.glb`. It is not wired into gameplay. The live figure is still `public/models/rosie.glb`.

1. **Clean cutout.** `tools/lookdev/tools_cut_rosie.py` cuts front, three-quarter and profile out of `images/characters/rosie-sheet.png`, with a clean alpha.
2. **A-pose reference.** `tools/lookdev/phase2/v2/apose.py` builds the front A-pose from that cutout in code: sleeves rotated out about the shoulder, legs stepped apart. `phase2/v2/back.py` synthesises the back. The shipped references are `art-source/characters/rosie/apose-front.png` and `apose-back.png`.
3. **Hunyuan3D shape.** `phase2/hunyuan.py` and `phase2/hyshape.py` send the A-pose front to a free Hunyuan3D Hugging Face Space. Rosie v2 used Hunyuan3D-2.
4. **Texture bake from the sheet.** `phase2/v2/bake_v2.py` projects the A-pose front, the synthesised back and the sheet profile onto the mesh. The face gets its own island from a 4× upscale of the sheet face. Outputs: `rosie-v2-body.png`, `rosie-v2-face.png`, `rosie-v2-hair.png`, plus glasses and a cigarette.
5. **Decimate to 20-50k triangles.** The bake targets about 36k on the body, then normalises height to 1.65 m. The shipped rigged mesh is about 39.5k triangles.
6. **A-pose FBX.** `art-source/characters/rosie/rosie3d-v2-mixamo.fbx` is the file that was uploaded to Mixamo.
7. **Mixamo auto-rig.** Auto-rig that FBX and download the clips. Idle and walk are in `art-source/characters/rosie/mixamo/`.
8. **GLB with clips.** FBXLoader, then GLTFExporter (headless Chrome, `tools/lookdev/out/phase2/v2/src/export_rigged.mjs`), then gltf-transform (weld, resample, dedup, prune, WebP), then `finish_glb.mjs` to clear the invalid `skin.skeleton` pointer. The result is `public/models/rosie-rigged.glb`: one `mixamorig*` skeleton, 33 bones, clips `idle` (6.0 s) and `walk` (1.03 s). The walk has root motion. It is not in place. Textures are WebP: body 2048, face 1024, hair 512 with alpha mask, double-sided. About 2.6 MB. No Draco, no meshopt.

Limits, from this run. They will show up on the next character too.

- **Mitten hands.** Image-to-3D does not deliver fingers you can pose. Mixamo weights a mitten as a hand. Do not expect finger acting.
- **Invented backs.** The sheet has no true back view. The back is synthesised, then baked. It will read as plausible, not as a photograph of her back.
- **Soft faces.** The raw image-to-3D face goes soft. The face island, baked from an upscaled sheet crop, is what makes it readable. Judge it at the distance the player stands.
- **Free quota.** Hugging Face Spaces free GPU time runs out, and a Space can be down or rate-limited. The scripts are a record of what worked, not a promise the same Space answers tomorrow. The downloaded GLB and FBX stay in the repo so a quota miss does not strand the character.

## Performance budget

A base M1 MacBook. About 16 ms a frame (60 fps) at 1080p.

- Post pixel ratio stays in the range 1 to 1.25. The game cap is `POST_PIXEL_RATIO_CAP` (1.25) in `src/render/post.ts`. Do not run the film stack at a full retina buffer.
- Shadow maps are static. They update on a stride, or when the player changes room, not on every frame.
- Lights are culled per room. Practicals in rooms the player is not standing in are switched off.
- If a frame is over budget, cut lights and post before adding technique. No TAA, no cascaded shadow maps, no motion blur, no realtime GI.

## Workflow

Work lands on a branch and a pull request. Cloudflare Pages builds a preview from the PR: command `npm run build`, output directory `dist`. Do not merge on a red preview.

When a build is accepted, the manual production deploy is:

```bash
npm run build && wrangler pages deploy dist --project-name paradiselodge-game --branch main
```

Live site: `https://paradiselodge-game.pages.dev`.

Large source art stays in the repo, so a wiped machine is not the only copy. `art-source/` holds FBX, textures and reference images the game does not load. `public/models/` holds a GLB the game will load. `tools/lookdev/` is the sandbox and is outside the Vite, `tsc` and Pages build.

Git LFS is not used. The repo already stores binaries of this size as ordinary git objects. The Unit A GLB is about 31 MB and is fetched from R2 at runtime only because Pages rejects a single file over 25 MiB (`vite.config.mjs` strips `models/unit-a.glb` from `dist`). Nothing in the Rosie archive is near GitHub's 100 MB limit. LFS would make a clone, and a Pages build, depend on a client and a quota the rest of the repo does not use. If a single new file approaches 50 MB, stop and decide before committing it.

## Roadmap / next quick wins

None of this is done by archiving the files. The live game still loads `public/models/rosie.glb`.

1. Put rigged Rosie at reception. Idle while she stands. The walk clip has root motion, so either consume that motion or use an in-place walk before she moves.
2. Rework the reception camera to the over-the-shoulder view in `images/concept-art/03-reception-with-rosie.png`.
3. Crisp neon streak reflections on the wet road. Pink `THE PARADISE LODGE`, cyan `ROOMS TO LET`.
4. A more ornate exterior facade, against concepts 01 and 02: Victorian silhouette, arched openings, iron lace.
5. Moretti next, then Crystal, then the rest of the cast: Miller, Mark, Sterling, Victor. Same pipeline. The sheets are already in `images/characters/`.
6. Portrait art in the dialogue panel.
7. Richer hall and stairs: turned balusters, peeling plaster.
8. Fix the flat CRT screen and the crushed parlour chairs.

Scene 1 verbs, evidence, gates, dialogue and audio stay as they are while this picture work is going on.
