# SETUP.md — The Paradise Lodge

For handing off to Claude Code. Follow in order.

**Steps 1 to 5 are history.** The repo exists, it is scaffolded, it is deployed.
They are kept because they record what the stack is and why. If you are picking
the project up today, what you actually need is *What you need installed*, then
*The asset pipeline* at the bottom, then CLAUDE.md.

---

## What you need installed

| Tool | Why | Check |
|---|---|---|
| **Node.js 20+** | Runs Vite and the dev server | `node --version` |
| **Git** | Version control | `git --version` |
| **VS Code or Cursor** | Reading the code, not writing it | — |
| **GitHub account** | Hosts the repo | you have one |
| **Cloudflare account** | Hosts the game | dash.cloudflare.com, free |
| **Claude Code** | Builds it | `npm install -g @anthropic-ai/claude-code` then `claude login` |
| **Blender 5.1** | Builds, bakes and exports every room from here | — |
| **BlenderMCP addon** | How Claude Code drives Blender | TCP `localhost:9876`, started from the addon panel |
| **A Sketchfab API key** | Sourcing models through the addon | Pasted into the BlenderMCP panel. It lives **on the scene**, so anything that wipes the scene wipes the key |
| **`wrangler`** | Manual deploys | `npx wrangler --version` |

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
│   ├── IMAGE-PROMPTS.md
│   └── SETUP.md
├── images/              ← generated character and texture assets (reference only)
├── assets/
│   ├── blender/         ← original .blend sources (committed, except room1a.blend)
│   ├── sourced/         ← Sketchfab downloads (gitignored, ~230MB)
│   └── bake/            ← raw Cycles output (gitignored, 50MB a sheet)
├── tools/
│   ├── blender/         ← build / bake / export scripts
│   └── shot.mjs         ← headless capture
├── public/
│   ├── env/             ← HDRIs
│   ├── models/          ← shipped glTF
│   ├── textures/
│   │   └── bake/        ← shipped lightmaps (EXR)
│   └── audio/
├── src/
└── package.json
```

`CLAUDE.md` goes in the **root**, not in docs. Everything else lives in `docs/`.

**Blender sources stay in `assets/blender/`.** The runtime mesh is the exported glTF under `public/models/`. Do not delete the `.blend` after export. Autosaves (`*.blend1`) are gitignored.

**Three directories are gitignored and all three are reproducible**, which is why losing them is not a problem: `assets/sourced/` re-fetches from the uids in `docs/CREDITS.md`, `assets/blender/room1a.blend` rebuilds from `tools/blender/build_room1a.py`, and `assets/bake/` rebuilds from `tools/blender/bake_room1a.py`. Everything else in `assets/blender/` is small and is the only copy of that geometry — keep it.
---

## Step 3 — The images folder

`/images` is the working folder for everything generated with gpt-image-2. It is **reference material, not shipped assets.**

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

**Naming is fixed.** `<character>-sheet.png`, lowercase, hyphenated. Claude Code will reference these by exact filename and will not go hunting.

### What each folder is for

- **`characters/`** — modelling reference only. Claude Code reads these to build geometry and materials against. They never ship.
- **`assets/`** — these become real textures. When one is final, it gets processed and copied into `public/textures/`. Keep the original in `/images/assets` so you can regenerate at a different size later.
- **`mood/`** — colour and location reference. Nobody builds from these, they're for keeping the look honest.

### Rules

- Drop new versions in as `crystal-sheet-v2.png`. Don't overwrite. You'll want to compare.
- `/images` is committed to the repo. It's small and losing it would hurt.
- Textures that ship go in `public/textures/` at power-of-two dimensions. 1024×1024 for the photo, 512×512 for the note and diary page, 2048×512 for the neon sign.

If a folder is empty when Claude Code needs it, say so in the prompt. It will otherwise invent a placeholder and you'll find it three sessions later.

---

## Step 4 — GitHub

1. github.com → New repo → `paradise-lodge` → don't init with a README
2. Run the two commands GitHub shows under "push an existing repository"

---

## Step 5 — Cloudflare Pages

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git
2. Pick the repo
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy

**Custom domain:** Pages → Custom domains → add `lodge.billyhaddad.au`. Cloudflare gives you a CNAME target. Add that CNAME wherever billyhaddad.au's DNS lives. The apex stays on Vercel and is not touched.

Cloudflare Pages static bandwidth is unmetered, which is the whole reason this isn't on Vercel with the author site.

**Deploys are manual.** The project is `paradiselodge-game`, live at `https://paradiselodge-game.pages.dev`:

```bash
npm run build && wrangler pages deploy dist --project-name paradiselodge-game --branch main
```

`lodge.billyhaddad.au` is not wired up yet.

---

## Step 6 — A session with Claude Code

From the project root:

```bash
claude
```

CLAUDE.md loads itself. It carries the status, the build order and the rules, and it is the file to read first. `docs/BRIEF.md` is the design spec and `docs/ASSETS.md` is the art and audio list; both are locked.

**One step per session, and say which one.** The engine build order is finished and the live job is the asset pipeline — Unit A, one space per session, at the bottom of CLAUDE.md. A prompt that says "do the parlour" is the right size. A prompt that says "do Unit A" is three days of work in one context window and it will come back half done.

Check it in the browser between every step.

---

## The asset pipeline

Everything the player looks at is sourced, assembled in Blender, baked, and loaded as a `.glb`. Nothing is modelled by hand and nothing is generated. Room 1A went through it first and is the worked example.

**Turn the BlenderMCP addon on before the session starts.** Claude Code drives Blender over TCP `localhost:9876` and cannot start it for you.

| Stage | Script | Writes |
|---|---|---|
| Source | `download_sketchfab_model` through the addon | `assets/sourced/<slot>.glb` |
| Build | `tools/blender/build_room1a.py` | `assets/blender/room1a.blend` |
| Bake | `tools/blender/bake_room1a.py` | `assets/bake/*.exr` |
| Export | `tools/blender/export_room1a.py` | `public/models/*.glb`, `public/textures/bake/*.exr` |

Run each one inside Blender:

```
exec(open('tools/blender/build_room1a.py').read())
```

### Three things that will bite

- **The Sketchfab key lives on the scene.** `read_homefile(use_empty=True)` throws it away along with everything else, and the next download fails with an auth error that looks like the key was wrong. Every build script carries `MCP_SETTINGS` across the reset for exactly this reason. If you write a new one, carry it too
- **Every failure in the bake pipeline is silent.** Bakes that write black squares and report success, UV packs that do not pack, size caps that skip half their input. CLAUDE.md lists the specific ones under *Every failure in this pipeline is silent*. Verify with numbers or with `preview()`, never by eye
- **Blender 5 moved things.** The compositor is `scene.compositing_node_group`, and the MCP addon runs without a window context so operators need an explicit override. Anything written against a Blender 4 tutorial will need both

### The hardware

Apple Silicon. **Cycles runs on Metal, not OptiX**, and the bake numbers in CLAUDE.md are set for that. Confirm the render device is Metal GPU before a final bake: more than about twenty minutes means it is quietly on CPU.

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

- **One step per session.** Don't stack them. The engine's fifteen steps are done; the asset pipeline's are not.
- **Verify in the browser between every step.** Not at the end of the day.
- **Commit after every working step.** Two commits and no history is how you end up unable to find where it broke.
- **Nothing sourced gets committed without a row in `docs/CREDITS.md`.** Author, source URL, licence, in the same commit as the asset. CC-BY says attribution ships with the work, and a baked room is a distribution.
- If Claude Code proposes a physics engine, an inventory, combat, or a quest marker, the answer is no. It's in the do-not-build list for a reason.
- If it proposes tuning a light to fix how a room looks, the answer is also no. That is what the bake is for.
