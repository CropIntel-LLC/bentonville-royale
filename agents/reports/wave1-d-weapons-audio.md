# Wave 1 / D: weapon audio and models

Status: **cut off at 3:23pm America/Chicago** (usage limit, resets 5:20pm). The agent died before replacing this note. The files below were already on disk.

Landed: Quaternius Ultimate Guns plus a CircuitZ pickaxe in `public/assets/weapons/` (see `credits/weapons-loot.md`), 45 CC0 Freesound MP3s in `public/assets/sfx/` (see `credits/audio.md`), sample playback in `src/audio/Sfx.js`, and the shots in `agents/reports/wave1-d-shots/`.

## Findings so far
- Character.js and Loot.js do NOT read `public/assets/weapons/manifest.json`. Character hard-codes: gun barrel along -Z, origin at bbox centre, GUN_SCALE 1.45, holder offset (0, 0.02, 0.22), muzzle at holder-local (0, 0.06, 0.85); pickaxe on `handslotr`, scale 0.62, offset (0, 0.1, 0), handle along +Y with origin at the grip. Loot flattens the scene and scales by LOOT.scale.w = 1.3.
- Plan: bake new GLBs into exactly those conventions so no code change is needed.
