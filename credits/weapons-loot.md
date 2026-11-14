# Weapon and loot model credits

All models below are CC0 1.0 Universal (public domain). Credit is not required but is given here.

## Weapons (held and floor models): Quaternius "Ultimate Guns Pack" + CircuitZ pickaxe (CC0 1.0)

Replaced the Kenney Blaster Kit stand-ins on 2026-11-14. File names and ids are unchanged.

- Quaternius (https://quaternius.com), "Ultimate Guns Pack": https://poly.pizza/bundle/Ultimate-Guns-Pack-cpgUfI4t2F
  (bundle page and every model page state "Public Domain (CC0)" / licence "CC0 1.0").
- CircuitZ, "Pickaxe 1": https://poly.pizza/m/88ZenT8TN0 (model page: "Public Domain (CC0)").
- Downloaded as GLB from the poly.pizza static CDN linked on each model page.
- These are generic low-poly real-world firearm types (not modelled on any game's weapons).

| File | Model page | Original GLB |
| --- | --- | --- |
| `public/assets/weapons/rifle.glb` | Assault Rifle, https://poly.pizza/m/Bgvuu4CUMV | https://static.poly.pizza/9a0e478c-de82-4773-9b70-a0219bb0057c.glb |
| `public/assets/weapons/smg.glb` | Submachine Gun, https://poly.pizza/m/7ehatxr7FY | https://static.poly.pizza/fb8ae707-d5b9-4eb8-ab8c-1c78d3c1f710.glb |
| `public/assets/weapons/shotgun.glb` | Shotgun (pump), https://poly.pizza/m/ZmPTnh7njL | https://static.poly.pizza/f71d6771-f512-4374-bd23-ba00b564db68.glb |
| `public/assets/weapons/sniper.glb` | Sniper Rifle, https://poly.pizza/m/ASOMZIErq3 | https://static.poly.pizza/f03e21b7-e3b7-49fd-b47d-d1908649fcee.glb |
| `public/assets/weapons/pistol.glb` | Pistol, https://poly.pizza/m/J3i9KDQ3kt | https://static.poly.pizza/f5a88c73-af97-49ca-8650-4bde579d2f80.glb |
| `public/assets/weapons/pickaxe.glb` | Pickaxe 1 (CircuitZ), https://poly.pizza/m/88ZenT8TN0 | https://static.poly.pizza/18ca56b7-33b7-42e8-b6e9-b836ae4533bd.glb |

Modifications (gltf-transform, scripted): node transforms baked into the vertices; guns rotated so the
barrel points to -Z with the grip at model (0, -0.014, 0.152) and scaled to an in-hand length
(rifle 1.15 m, SMG 0.85 m, shotgun 1.2 m, sniper 1.6 m, pistol 0.45 m at Character's x1.45), widened 1.5x
across the barrel for readability at third-person distance; base colours lifted (0.07 + 2.6 x linear) so
the near-black materials read under the toon shader; metalness 0, roughness 0.65; dedup/weld/prune.
Pickaxe: scaled to 1.6 units tall (Y) and 1.6x in X/Z, origin moved to the grip 0.4 above the handle end.
`manifest.json` records bounds, grip and muzzle for each file.

## Kenney asset kits (CC0 1.0)

- Author: Kenney (https://kenney.nl)
- Original packs: Blaster Kit (https://kenney.nl/assets/blaster-kit), Mini Dungeon (https://kenney.nl/assets/mini-dungeon), Platformer Kit (https://kenney.nl/assets/platformer-kit), Mini Characters (https://kenney.nl/assets/mini-characters)
- Downloaded from the GLB mirror https://github.com/Hidencod/tge-assets (branch `main`, via the jsDelivr CDN `https://cdn.jsdelivr.net/gh/Hidencod/tge-assets@main/packs/<pack>/<model>.glb`). The mirror converted Kenney's models to self-contained GLB with embedded textures.
- License evidence: `LICENSE` at the mirror repo root (copy kept at `_dl/weapons/tge/LICENSE`): "All models in this repository were created by Kenney (www.kenney.nl) and are released under Creative Commons Zero (CC0 1.0 Universal) ... these derived files are also CC0."
- Not verified: kenney.nl was unreachable from the download network, so the license was not cross-checked against Kenney's own pack pages or Kenney's original `License.txt` (the mirror does not ship that file for these 3D packs, only its own `LICENSE`).

| File | Pack | Original model |
| --- | --- | --- |
| `public/assets/loot/ammo.glb` | Blaster Kit | `crate-medium.glb` |
| `public/assets/loot/chest.glb` | Mini Dungeon | `chest.glb` |
| `public/assets/loot/potion.glb` | Mini Dungeon | `potion.glb` |
| `public/assets/loot/crate.glb` | Platformer Kit | `crate.glb` |
| `public/assets/loot/medkit.glb` | Mini Characters | `aid-defibrillator-red.glb` (AED case used as a medkit) |

Files are byte-identical copies of the mirror's GLBs, renamed.

(The Kenney Blaster Kit guns and the KayKit two-handed axe that used to stand in for the weapons are no longer shipped.)
