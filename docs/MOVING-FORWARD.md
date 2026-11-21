# Moving forward

This plan replaces the old rules that banned image-to-3D, post-processing, fill lights and generated assets, and that required characters built from Blender primitives and lighting baked in Cycles on a Mac. Those rules produced blocky mannequins and cooked the machine. Billy has overruled them.

If an older note in `CLAUDE.md`, `docs/ROADMAP.md`, `docs/SETUP.md` or `docs/ASSETS.md` disagrees with this file on the picture, the lighting, or how a character is made, this file wins.

Story, scene order, the four verbs and the case still come from `docs/BRIEF.md`. Gameplay that already ships stays as it is until a task says otherwise.

## Art direction

Photoreal 1994 St Kilda crime film. Match the references in `images/`, in particular `images/concept-art/` and `images/mood/`.

Interiors are tungsten amber. Nicotine walls. Haze and dust in the light shafts.

The exterior is golden hour into dusk. The road is wet. The neon is pink `THE PARADISE LODGE` and cyan `ROOMS TO LET`. Facade frames are `images/concept-art/01-title-card-the-paradise-lodge.png` and `images/concept-art/02-miller-at-the-lodge-exterior.png`. (The third-person over-the-shoulder reception view in `images/concept-art/03-reception-with-rosie.png` is retired; gameplay remains strict first person.)

Dusk is the default. `?look=day` or `?daylight=1` keeps the 3pm HDRI and the baked interior. Do not bake a new lightmap to chase the dusk picture.

## Tech approach

Code-first three.js. Lighting, materials and post live in the engine (`src/render/dusk.ts`, `src/render/post.ts`, `src/materials/look.ts`).

The film stack is ambient occlusion (GTAO), bloom, and one grade pass: grain, vignette, split-tone. Depth of field is for cutscenes and stills. It stays off in play.

No Blender session, no Hugging Face Hunyuan3D Space, no Mixamo upload and no local Mac bake is required to change the look or to add a character. Room 1A and the rest of the interior already have lightmaps. Leave them. Do not start another Cycles bake.

Characters come directly from the photorealistic turnaround sheets in `images/characters/` mapped in code onto articulated 3D geometry and exported as compact self-contained GLBs for Three.js. Generated textures and CC0 textures are allowed. Poly Haven and credited CC meshes stay available for furniture and architecture. Record anything third-party in `docs/CREDITS.md`.

Fill has direction. Day mode uses the HDRI. Dusk uses a sky probe plus practicals. Do not put an `AmbientLight` back.

## The character pipeline

Rosie (`public/models/rosie-rigged.glb`) ships with her existing Mixamo `idle` clip and cigarette ember pulse (source archive in `art-source/characters/rosie/`).

For the rest of the cast (`moretti`, `crystal`, `mark`, `victor`, `sterling`), character assets are generated cleanly and reproducibly inside the repo with `tools/characters/build_characters.py` and rendered/animated in Three.js (`src/npc/`):

1. **Multi-view turnaround & Nano Banana companion detail sheets.** Each primary turnaround sheet (`images/characters/<name>-sheet.png`: front, three-quarter, profile) is paired with a matched companion sheet (`images/characters/<name>-detail-sheet.jpg`: full straight back view, opposite profile, and high-resolution close-up front headshot aligned via normalized cross-correlation, including Crystal's closed-eye postmortem portrait).
2. **Watertight skinned anatomical mesh + 5-finger hands.** Head, neck, torso, continuous shoulder-to-wrist arms, sculpted 5-finger anatomical hands, continuous hip-to-ankle legs, and footwear are lofted in 3D and emitted as a watertight glTF 2.0 `SkinnedMesh` (`skins` + `JOINTS_0`/`WEIGHTS_0`) bound to the 15-bone hierarchy (`hips`, `chest`, `head`, `arm_{l,r}_{0,1}`, `hand_{l,r}`, `leg_{l,r}_{0,1}`, `foot_{l,r}`), cutting per-actor draw calls from ~22 down to 2–3 while preserving bone-attached accessories (Crystal's blonde hair cards, syringe, sling, bracelet; Sterling's swept hair cards).
3. **High-resolution 360° photo projection + baked PBR maps.** `1024×1024` face and body albedo atlases fuse the NCC-aligned close-up headshot, front/profile panels, and true back view, paired with supersampled `512×512` tangent-space `normalTexture` and packed `ORM` (`occlusionTexture` + `metallicRoughnessTexture`) maps distinguishing satin skin, matte wool/cotton, leather belts/boots, and nylon.
4. **Three.js dusk rim & skin wrap shading.** `src/npc/character-look.ts` calibrates embedded normal/roughness/AO maps, adds subtle warm tungsten skin wrap-lighting on faces plus dusk Fresnel rim separation and contact shadows to sit beside Rosie inside dusk GTAO/grade.

## Performance budget

A base M1 MacBook. About 16 ms a frame (60 fps) at 1080p.

- Post pixel ratio stays in the range 1 to 1.25. The game cap is `POST_PIXEL_RATIO_CAP` (1.25) in `src/render/post.ts`. Do not run the film stack at a full retina buffer.
- Shadow maps are static. They update on a stride, or when the player changes room, not on every frame.
- Lights are culled per room. Practicals in rooms the player is not standing in are switched off.
- If a frame is over budget, cut lights and post before adding technique. No TAA, no cascaded shadow maps, no motion blur, no realtime GI.

## Workflow

Work lands on a branch and a pull request. The GitHub repository is connected directly to Cloudflare Pages (`paradiselodge-game`): every PR builds a preview automatically (`npm run build`, output directory `dist`), and merging to `main` automatically deploys production to `https://paradiselodge-game.pages.dev`. Do not merge on a red preview.

Large source art stays in the repo, so a wiped machine is not the only copy. `art-source/` holds FBX, textures and reference images the game does not load. `public/models/` holds a GLB the game will load. `tools/lookdev/` is the sandbox and is outside the Vite, `tsc` and Pages build.

Git LFS is not used. The repo already stores binaries of this size as ordinary git objects. The Unit A GLB is about 31 MB and is fetched from R2 at runtime only because Pages rejects a single file over 25 MiB (`vite.config.mjs` strips `models/unit-a.glb` from `dist`). Nothing in the Rosie archive is near GitHub's 100 MB limit. LFS would make a clone, and a Pages build, depend on a client and a quota the rest of the repo does not use. If a single new file approaches 50 MB, stop and decide before committing it.

## Roadmap / quick wins (Reconciled)

Author decisions locked; Stage 1 quick wins and Stage 2 cross-scene upgrades are complete:

1. **Rigged Rosie at reception & parlour — Done:** `public/models/rosie-rigged.glb` is live with Mixamo `idle` and ember glow; fixed `head.rotation` additive `+=` drift in `src/npc/rosie.ts`, removed dead `restLift`, removed retired `public/models/rosie.glb`, and stripped editorialising copy from Rosie's description.
2. **Reception camera (`03-reception-with-rosie.png`) — Done (OTS retired):** Strict first person preserved throughout reception and all playable dialogue so Miller stays unseen until the Watchhouse epilogue still.
3. **Wet-road neon streak reflections — Done:** Implemented in `src/materials/look.ts` `asphaltMaterial()`, and decoupled Scene 3 Regent Street asphalt from Scene 1's lodge neon X/Z reflection streaks.
4. **More ornate exterior facade — Done:** Authored `public/models/lodge-exterior.glb` and exterior dressing integrated; dead `neonMat` flicker in `src/world/lodge.ts` cleaned up.
5. **Rest of the cast — Done:** Mapped Moretti, Crystal, Mark (S2), Victor (S3/S4), and Sterling (S5) directly from `images/characters/*-sheet.png` via `tools/characters/build_characters.py` and wired articulated Three.js poses across Scenes 1–5 (zero Blender/Hunyuan3D/Mixamo required).
6. **Portrait art in dialogue panel — Done:** Normalised speaker matching in `src/dialogue/panel.ts` (`'Moretti (Radio)'`, `'Victor Rakov'`, `'Kenneth Sterling'`, `'Forensics Tech'`, `'Punter'`, `'Detective Graham Miller'`) mapped onto `public/portraits/*.png`.
7. **Richer hall and stairs — Done:** Turned balusters and runner shipped in `unit-a.glb`, plus upstairs room number plates (`1A`, `1B`, `1C`) installed via `installDoorNumberPlates()`.
8. **Parlour/Reception/S2–S5 lookdev — Done:** Fixed Parlour `sunBeam` slicing Rosie, refined Parlour TV/chair/CRT placement, eliminated Reception outer `lodge.ts` wall Z-fighting against `unit-a.glb`, fixed Crystal's Room 1A bed orientation & dusk brightness, and brought Scenes 2–5 onto the shared `post.ts` film grade (removing `AmbientLight` and dark void skyboxes).

Gameplay verbs, evidence rules, and Scenes 2–5 delivery state are tracked in `docs/ROADMAP.md`.
