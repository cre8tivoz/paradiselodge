# Soundtrack cues

Five approved cues for the five scenes. 90 seconds each, 48 kHz stereo, 320 kbps MP3, levelled to -16 LUFS with a -1.5 dBTP ceiling.

| File | Scene |
|---|---|
| `01-theme-paradise-lodge.mp3` | 1 — The Lodge |
| `02-theme-st-kilda-precinct.mp3` | 2 — Police station |
| `03-theme-prahran-laneway.mp3` | 3 — Victor chase |
| `04-theme-interview-tape.mp3` | 4 — Interrogation |
| `05-theme-mahoneys-end.mp3` | 5 — Mahoney's, cell door |

Generated with ElevenLabs Music (`music_v2_5`), instrumental, prompts kept with the source project at `projects/paradiselodge-soundtrack`.

**Status — Approved, Active & Deduplicated:** These 5 cues are locked as the official soundtrack (`docs/ASSETS.md` / `CLAUDE.md`) and stream from `public/audio/soundtrack/` via `src/audio/soundtrack.ts`, routed through the Web Audio `Mixer` for true scene crossfading and dialogue ducking. The 18 MB duplicate MP3 mirror in `assets/audio/soundtrack/` has been removed from git while retaining this prompt/attribution record.
