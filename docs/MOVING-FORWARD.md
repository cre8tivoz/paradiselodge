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

1. **Sheet matte extraction.** Each turnaround sheet (`images/characters/<name>-sheet.png`) is segmented cleanly from its studio grey backdrop into front, three-quarter and profile crops.
2. **Articulated 3D anatomical lofting.** Head, neck, torso, hips, upper/lower arms, hands, thighs, shins and footwear are lofted in 3D from both the Front width silhouette and Profile depth silhouette at anatomically aligned Y slices (with cranial/facial relief, Mark's ponytail, Moretti's utility belt and Crystal's V-neck dress/heels/needle/sling), emitted in glTF 2.0 coordinates (`+Y` up, `-Z` forward) with named joint nodes (`hips`, `chest`, `head`, `arm_{l,r}_{0,1}`, `leg_{l,r}_{0,1}`, `foot_{l,r}`).
3. **High-resolution sheet projection atlas.** Continuous cylindrical/planar texture islands pack a high-resolution face band plus clothing and rear fabric textures sampled from the front, three-quarter and profile photos (plus clean non-mirrored rear fabric synthesis so faces never wrap onto the back).
4. **Three.js dusk rim shading & runtime posing.** `src/npc/character-look.ts` applies subtle Fresnel rim lighting and contact shadows to match Rosie inside dusk GTAO/grade; runtime scripts pose each rig anatomically per scene (`moretti.ts` walk/crouch/attend, `crystal.ts` supine on bed with lividity/temple wound, S2 seated Mark, S3 sprinting/vaulting Victor, S4 seated interrogation Victor + observer Moretti, S5 bar-tending Sterling + Moretti).

Limits to keep in mind:
- **Mitten hands & covered backs.** Front/profile sheets do not show an independent rear view; rear hair/clothing are synthesised from profile fabric so actors read convincingly from every gameplay angle without external AI generators.

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
