# Download weapon and loot assets
Agent id: `agent-a5f1c97b5d331db2c`
Model: claude-fable-5-2. Type: general-purpose background agent.
All 11 files are in place and pass gltf-validator with 0 errors, but two are stand-ins: `pickaxe.glb` is an axe and `medkit.glb` is a defibrillator case. Total is about 560 KB, all textures embedded.

**Sources and licence evidence**
- **Kenney, via the Hidencod/tge-assets mirror (jsDelivr):** repo-root `LICENSE` says "All models in this repository were created by Kenney (www.kenney.nl) and are released under Creative Commons Zero (CC0 1.0 Universal)… these derived files are also CC0."
- **KayKit Adventurers, by Kay Lousberg:** `addons/kaykit_character_pack_adventures/LICENSE.txt` says "License: (Creative Commons Zero, CC0)".

**Weapons** (x, y, z in model units; barrel points along -Z, up is +Y, origin at bounding-box centre, not the grip)

| File | Source model | Size | Dimensions |
| --- | --- | --- | --- |
| `rifle.glb` | blaster-p | 91 KB | 0.16 × 0.37 × 0.86 |
| `shotgun.glb` | blaster-h | 39 KB | 0.17 × 0.28 × 0.65 |
| `smg.glb` | blaster-j | 61 KB | 0.16 × 0.36 × 0.61 |
| `sniper.glb` | blaster-f | 83 KB | 0.17 × 0.45 × 1.31 |
| `pistol.glb` | blaster-c | 46 KB | 0.17 × 0.34 × 0.48 |
| `pickaxe.glb` | KayKit axe_2handed | 38 KB | 1.24 × 1.73 × 0.26 |

The axe's handle runs along Y with the origin on the handle; scale it about 0.4 to match the blasters.

**Loot** (origin at bottom centre)

| File | Source model | Size | Dimensions |
| --- | --- | --- | --- |
| `chest.glb` | Mini Dungeon chest | 45 KB | 0.5 × 0.45 × 0.5 |
| `ammo.glb` | Blaster Kit crate-medium | 70 KB | 0.55 × 0.37 × 1.0 |
| `potion.glb` | Mini Dungeon potion | 24 KB | 0.33 × 0.40 × 0.33 |
| `medkit.glb` | Mini Characters aid-defibrillator-red | 19 KB | 0.23 × 0.29 × 0.14 |
| `crate.glb` | Platformer Kit crate | 26 KB | 0.5 × 0.5 × 0.5 |

`chest.glb` and `ammo.glb` each have a separate `lid` node and embedded `open`, `close` and `open-close` animations.

**Not found**
- **Pickaxe:** none in the reachable CC0 sources.
- **Medkit:** no dedicated model; the stand-in is a red carry case with a heart emblem.

**Not verified**
- **Kenney cross-check:** kenney.nl was unreachable, and the mirror has no Kenney `License.txt` for these packs, only its own `LICENSE`.
- **Barrel direction:** inferred from vertex profiles and thumbnails, not rendered in Three.js.
- **Shotgun:** "pump-like" is a visual judgement.

Manifests are in `public/assets/weapons/manifest.json` and `public/assets/loot/manifest.json`; credits are in `credits/weapons-loot.md`. Downloads and scripts are under `_dl/weapons/`.
