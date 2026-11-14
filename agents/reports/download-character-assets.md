# Download character assets
Agent id: `agent-ae6a7a1429153c268`
Model: claude-fable-5-2. Type: general-purpose background agent.

## Report 1

**Pack:** KayKit Adventurers 1.0 by Kay Lousberg, the only pack needed. `git clone` and codeload were reset 4 times each, so files came from the official repo through the GitHub contents API (commit 672074b).

**License:** `_dl/characters/kaykit_adv/LICENSE.txt` (repo-root `LICENSE.txt`, identical to the addon copy): "License: (Creative Commons Zero, CC0) … free to use in personal, educational and commercial projects."

**Files** in `/Users/shehryarahmed/Bentonville_Royale/public/assets/characters/` (14.5 MB total, textures embedded):
- `player.glb` — Rogue_Hooded, 3.60 MB
- `bot_a.glb` — Knight, 3.66 MB
- `bot_b.glb` — Barbarian, 3.61 MB
- `bot_c.glb` — Mage, 3.59 MB
- `manifest.json`, plus `credits/characters.md`

**Skeleton:** all four share an identical 41-joint rig and the same 76 clips, so animations are interchangeable.

**Clip mapping (same for all):**
- idle `Idle`, walk `Walking_A`, run `Running_A`
- jump `Jump_Full_Short` (also `Jump_Start` / `Jump_Idle` / `Jump_Land`), fall `Jump_Idle`
- shoot `2H_Ranged_Shoot` (also `2H_Ranged_Shooting`, `2H_Ranged_Aiming`, `2H_Ranged_Reload`, and `1H_` versions)
- melee `2H_Melee_Attack_Chop` (also `1H_Melee_Attack_Chop`)
- death `Death_A` (alt `Death_B`), emote `Cheer`
- The manifest also maps strafes, dodges, hit, throw, interact and lists all clip durations.

**Hands:** attach weapons to `handslot.r` / `handslot.l` (children of `hand.r` / `hand.l`).

**Scale and facing:** Y-up, faces +Z, feet at y=0. Body height is about 2.19–2.32 units (2.25 player); the Mage is 3.0 with its hat.

**Meshes:** built-in weapons and shields are separate non-skinned meshes, all visible by default and listed in `hideMeshes`. Capes and headgear are in `optionalMeshes`.

**Missing or not verified:**
- No dance clip (`dance: null`); `Cheer` is the only emote.
- No dedicated fall clip.
- Nothing was rendered in Three.js. Facing is inferred from toe bone positions and height from accessor bounds in bind pose.

Inspector scripts are in `_dl/characters/tools/` (`inspect.mjs`, `report.mjs`, `manifest.mjs`).

## Report 2

Addendum after your network update: the task was already complete when the message arrived, and nothing in the deliverables changes.

- **How I got the files:** `git clone` and codeload failed, so I had already pulled the license and GLBs from the official KayKit repo through api.github.com. That cost about 13 calls against the shared 60/hour limit before your warning reached me; I have made none since.
- **jsDelivr cross-check, as you asked:** I re-downloaded `LICENSE.txt` and the four GLBs (Rogue_Hooded, Knight, Barbarian, Mage) from `cdn.jsdelivr.net/gh/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0@main`. All five are byte-identical to the copies I had.
- **License:** CC0 is confirmed from the repo's own `LICENSE.txt` via both routes: "License: (Creative Commons Zero, CC0) … free to use in personal, educational and commercial projects."

The earlier report stands as written: `player.glb`, `bot_a.glb`, `bot_b.glb`, `bot_c.glb` and `manifest.json` in `/Users/shehryarahmed/Bentonville_Royale/public/assets/characters/`, plus `/Users/shehryarahmed/Bentonville_Royale/credits/characters.md`. The jsDelivr copies are in `_dl/characters/jsd/`.
