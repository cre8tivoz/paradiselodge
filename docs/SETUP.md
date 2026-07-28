# SETUP.md — The Paradise Lodge

For handing off to Claude Code. Follow in order.

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

**`three` is the only runtime dependency.** Don't let anything add another without asking.

---

## Step 2 — Folder layout

```
paradise-lodge/
├── CLAUDE.md            ← project root. Claude Code reads this automatically every session
├── docs/
│   ├── BRIEF.md
│   ├── ASSETS.md
│   ├── IMAGE-PROMPTS.md
│   └── SETUP.md
├── images/              ← generated character and texture assets (reference only)
├── assets/
│   └── blender/         ← original .blend sources (committed). miller-hand.blend lives here
├── tools/
│   └── blender/         ← build/export scripts for those .blend files
├── public/
│   ├── models/          ← shipped glTF (miller-hand.glb)
│   ├── textures/
│   └── audio/
├── src/
└── package.json
```

`CLAUDE.md` goes in the **root**, not in docs. Everything else lives in `docs/`.

**Blender sources stay in `assets/blender/`.** The runtime mesh is the exported glTF under `public/models/`. Do not delete the `.blend` after export. Autosaves (`*.blend1`) are gitignored.
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

---

## Step 6 — First session with Claude Code

From the project root:

```bash
claude
```

Opening prompt:

> Read docs/BRIEF.md and docs/ASSETS.md. CLAUDE.md is already in context.
>
> Build step 1 from the build order only: the player controller. First person, walk, crouch, lean, mouse look, pointer lock. No player body, no hands yet, no level, just a grey box room to move around in.
>
> Stop when that's working and I'll check it in the browser.

Then check it in the browser before going anywhere near step 2.

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

- **One step per session.** The build order in CLAUDE.md is fourteen steps. Don't stack them.
- **Verify in the browser between every step.** Not at the end of the day.
- **Commit after every working step.** Two commits and no history is how you end up unable to find where it broke.
- If Claude Code proposes a physics engine, an inventory, combat, or a quest marker, the answer is no. It's in the do-not-build list for a reason.
