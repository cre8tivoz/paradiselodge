# SETUP.md — The Paradise Lodge

For handing off to Claude Code. Follow in order.

**Steps 1 to 5 are history.** The repo exists, it is scaffolded, it is deployed.
They are kept because they record what the stack is and why. If you are picking
the project up today, read `CLAUDE.md` and `docs/MOVING-FORWARD.md`. The picture
and the characters no longer require a Blender session or a Cycles bake on a Mac.

---

## What you need installed

| Tool | Why | Check |
|---|---|---|
| **Node.js 20+** | Runs Vite and the dev server | `node --version` |
| **Python 3.10+** | Runs `tools/characters/build_characters.py` (`Pillow`, `numpy`) | `python3 --version` |
| **Git** | Version control | `git --version` |
| **VS Code or Cursor** | Reading the code, not writing it | — |
| **GitHub account** | Hosts the repo (connected directly to Cloudflare Pages) | you have one |
| **Cloudflare account** | Hosts the game (auto-deploys from GitHub) | dash.cloudflare.com, free |
| **Claude Code** | Builds it | `npm install -g @anthropic-ai/claude-code` then `claude login` |
| **Blender 5.1** *(historical only)* | Only if rebuilding the legacy Room 1A / Unit A `.blend` archives. Not required for the dusk picture, Scenes 2–5, or characters | — |

---

## Step 1 — Scaffold

```bash
npm create vite@latest paradise-lodge -- --template vanilla-ts
cd paradise-lodge
npm install
npm install three
npm install -D @types/three
```

Test it: `npm run dev`, open `localhost:5173`, you should see the Vite default page. `Ctrl+C` to stop.

**`three` is still the only package.** The loaders and decoders the asset pipeline needs — `GLTFLoader`, `RGBELoader`, `EXRLoader`, `KTX2Loader`, Meshopt — all ship inside it already. Anything with a runtime of its own is out.

`three` is pinned to `0.180.0`. `npm install three` gives r185 and breaks the locked stack silently.

---

## Step 2 — Folder layout

```
paradise-lodge/
├── CLAUDE.md            ← project root. Claude Code reads this automatically every session
├── docs/
│   ├── BRIEF.md
│   ├── ASSETS.md
│   ├── CREDITS.md
│   ├── MOVING-FORWARD.md
│   ├── ROADMAP.md
│   └── SETUP.md
├── images/              ← turnaround sheets, concept art, mood & texture sources
├── art-source/          ← historical Rosie FBX/Mixamo archive (not loaded by game)
├── assets/
│   └── blender/         ← legacy .blend archives for Room 1A / Unit A
├── tools/
│   ├── characters/      ← pure-Python cast GLB generator (build_characters.py)
│   ├── blender/         ← historical room/kit scripts
│   ├── playtest-scene*.mjs, test-controls.mjs, shot.mjs, profile.mjs
├── public/
│   ├── env/             ← HDRIs
│   ├── models/          ← shipped glTFs
│   ├── portraits/       ← dialogue speaker portraits
│   ├── textures/
│   │   └── bake/        ← shipped lightmaps (EXR)
│   └── audio/soundtrack/ ← 5 approved ElevenLabs neo-noir MP3 cues
├── src/
└── package.json
```

`CLAUDE.md` goes in the **root**, not in docs. Everything else lives in `docs/`.

**Historical Blender archives stay in `assets/blender/`.** The runtime meshes live under `public/models/`. `assets/sourced/`, `assets/bake/`, `assets/blender/room1a.blend`, `assets/blender/materials.blend`, and `assets/blender/unit-a.blend` are gitignored and reproducible from `docs/CREDITS.md` and `tools/blender/`.
---

## Step 3 — The images folder

`/images` holds character turnaround sheets, paper/prop textures, concept art, and mood references.

```
images/
├── characters/
│   ├── miller-sheet.png
│   ├── miller-hands.png
│   ├── moretti-sheet.png
│   ├── rosie-sheet.png
│   ├── crystal-sheet.png
│   ├── mark-sheet.png
│   ├── victor-sheet.png
│   └── sterling-sheet.png
├── assets/
│   ├── photo-in-frame.png
│   ├── note.png
│   ├── neon-sign.png
│   ├── diary-page.png
│   └── victor-record.png
└── mood/
    └── (palette and location reference)
```

**Naming is fixed.** `<character>-sheet.png`, lowercase, hyphenated. Build scripts reference these by exact filename.

### What each folder is for

- **`characters/`** — studio turnaround sheets consumed directly by `tools/characters/build_characters.py` to loft, project, and export compact `.glb` models under `public/models/`.
- **`assets/`** — source artwork for real textures. When final, processed copies ship under `public/textures/`. Keep the originals in `/images/assets`.
- **`mood/`** — colour and location reference for keeping the 1994 St Kilda look honest.

### Rules

- `/images` is committed to the repo. It's small and losing it would hurt.
- Textures that ship go in `public/textures/` at power-of-two dimensions. 1024×1024 for the photo, 512×512 for the note and diary page, 2048×512 for the neon sign.

---

## Step 4 — GitHub

1. github.com → New repo → `paradise-lodge` → don't init with a README
2. Run the two commands GitHub shows under "push an existing repository"

---

## Step 5 — Cloudflare Pages

The GitHub repository (`cre8tivoz/paradiselodge`) is attached directly to the Cloudflare Pages project `paradiselodge-game`, live at `https://paradiselodge-game.pages.dev`:

1. Build command: `npm run build`
2. Output directory: `dist`
3. Every pull request automatically builds a Cloudflare Pages preview, and merging to `main` automatically deploys production (no manual `wrangler pages deploy` step needed).

`vite.config.mjs` strips `models/unit-a.glb` (~30 MB, over Pages' 25 MiB per-file cap) from `dist`; at runtime `src/world/unit-a.ts` fetches it from Cloudflare R2.

Cloudflare Pages static bandwidth is unmetered, which is the whole reason this isn't on Vercel with the author site.

**Custom domain (optional):** Pages → Custom domains → add `lodge.billyhaddad.au` and point a CNAME there whenever you want that subdomain active. The apex stays on Vercel and is not touched.

---

## Step 6 — A session with Claude Code

From the project root:

```bash
claude
```

CLAUDE.md loads itself. Read it first, then `docs/MOVING-FORWARD.md`, which supersedes the old art bans. `docs/BRIEF.md` is the story and `docs/ASSETS.md` is the art list.

**One deliverable slice per session, and name it.** The active plan is
`docs/ROADMAP.md`. Report a concrete outcome such as “Scene 1 lodge exterior —
facade accepted”; do not use an unqualified step number.

Check it in the browser between every step.

---

## The asset pipeline

Active visuals, lighting, post-processing, and character builds are **code-first Three.js + Python** (see `docs/MOVING-FORWARD.md`):

- **Lighting & lookdev:** authored directly in Three.js (`src/render/dusk.ts`, `src/render/post.ts`, `src/materials/look.ts`). No local Mac Cycles bake is required.
- **Characters:** Rosie ships from `public/models/rosie-rigged.glb`; the rest of the cast (`moretti`, `crystal`, `mark`, `victor`, `sterling`) are generated directly from `images/characters/` turnaround sheets via `python3 tools/characters/build_characters.py` (`Pillow` + `numpy`, zero Blender/Hunyuan3D/Mixamo dependencies) and styled/posed in Three.js (`src/npc/`).
- **Historical Room 1A / Unit A bakes (archived):** the existing lightmapped Lodge interior (`public/models/unit-a.glb`, `public/models/room1a.glb`, `public/textures/bake/*.exr`) was built with the legacy Blender 5 / Sketchfab scripts under `tools/blender/` (`build_room1a.py`, `bake_room1a.py`, `export_room1a.py`). Leave those bakes intact unless explicitly rebuilding Unit A.

---

## Optional — the reference repo

`github.com/mshumer/Claude-of-Duty` is a 65,000-line Three.js first-person game built by agents. MIT licensed, so you can use any of it with attribution.

**Read it. Mostly don't port it.**

```bash
git clone --depth 1 https://github.com/mshumer/Claude-of-Duty.git reference
```

Clone it **outside** the project folder. It is reference material, not a dependency.

### Why not port it wholesale

- All 144 source files are plain JavaScript. This project is TypeScript strict
- It's built for a large daylit outdoor street with 11 million triangles. This is small interiors with a fixed sun
- Its render pipeline runs at 28–30 fps by the author's own measurement, and it ships a known unfixed viewmodel lighting bug where the first-person rig receives roughly 20× the irradiance of the world
- `src/audio/index.js` has 28 references to the weapons subsystem. Not a clean lift
- Its hand rig is built for weapon sway. Ours does bespoke object-handling animations

### What's actually worth reading

| File | Read it for |
|---|---|
| `ARCHITECTURE.md` | How the subsystem contract and event vocabulary were structured |
| `src/world/kit.js` | Facade construction. `facadeWall`, `balcony`, `parapet`, `drainpipe`, `stairRun`. Genuinely close to a dilapidated Victorian mansion exterior |
| `src/materials/` | Techniques for procedural surface generation without texture files |
| `tools/` | Screenshot capture, pixel-diff regression gate, frame profiler |

### The one thing worth taking properly

The **tooling**, not the game code. A screenshot capture script, a pixel-diff gate that fails on unintended visual change, and a real frame profiler reporting p95 and p99 rather than a median. Roughly 150 lines for a project this size, and it's what makes it safe to let an agent refactor.

Their own writeup records a static benchmark reporting 94 fps while the game was actually running at 12–17 fps with stalls over a second. Medians lie.

If you do port any source file, keep the MIT notice with it.

---

## Working rules

- **One deliverable slice per PR.** Keep changes scoped and verifiable against `docs/ROADMAP.md`.
- **Verify in the browser between every step.** Run `npx tsc --noEmit && npm run build` and the Playwright suites (`tools/test-controls.mjs`, `tools/playtest-scene1..5.mjs`).
- **Commit after every working step.** Two commits and no history is how you end up unable to find where it broke.
- **Nothing sourced gets committed without a row in `docs/CREDITS.md`.** Author, source URL, licence, in the same commit as the asset. CC-BY says attribution ships with the work, and a baked room is a distribution.
- If an agent proposes a physics engine, an inventory, combat, or a quest marker, the answer is no. It's in the do-not-build list for a reason.
- Keep lighting code-first (`src/render/dusk.ts`, `src/render/post.ts`, practicals) without adding `AmbientLight` or re-running Cycles bakes.
