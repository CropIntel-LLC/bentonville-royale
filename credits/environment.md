# Environment asset credits (nature, vehicles, props)

All files below are CC0 1.0 (public domain dedication). Attribution is not required; it is given here as a courtesy and as a provenance record.

## 1. Kenney kits (via the Hidencod/tge-assets GLB mirror)

- Author: Kenney (www.kenney.nl)
- License: Creative Commons Zero, CC0 1.0 Universal — http://creativecommons.org/publicdomain/zero/1.0/
- Obtained from: https://github.com/Hidencod/tge-assets (branch `main`, fetched through `https://cdn.jsdelivr.net/gh/Hidencod/tge-assets@main/...`)
- License evidence: the mirror's `LICENSE` file (copy kept at `_dl/environment/kenney/LICENSE`): "All models in this repository were created by Kenney (www.kenney.nl) and are released under Creative Commons Zero (CC0 1.0 Universal)". The mirror does not ship Kenney's original per-kit `License.txt`, and kenney.nl was unreachable from the download network, so the cross-check against the original kit pages was NOT performed. Original kit pages to check:
  - Nature Kit — https://kenney.nl/assets/nature-kit
  - Car Kit — https://kenney.nl/assets/car-kit
  - City Kit (Roads) — https://kenney.nl/assets/city-kit-roads
  - City Kit (Suburban) — https://kenney.nl/assets/city-kit-suburban
  - City Kit (Commercial) — https://kenney.nl/assets/city-kit-commercial
  - Furniture Kit — https://kenney.nl/assets/furniture-kit
  - Graveyard Kit — https://kenney.nl/assets/graveyard-kit

| File | Kit | Source file in mirror (`packs/...`) |
| --- | --- | --- |
| nature/tree_a.glb | Nature Kit | nature-kit/tree-default.glb |
| nature/tree_b.glb | Nature Kit | nature-kit/tree-oak.glb |
| nature/tree_c.glb | Nature Kit | nature-kit/tree-detailed.glb |
| nature/tree_d.glb | Nature Kit | nature-kit/tree-fat.glb |
| nature/pine_a.glb | Nature Kit | nature-kit/tree-pinedefaulta.glb |
| nature/pine_b.glb | Nature Kit | nature-kit/tree-pinetalla.glb |
| nature/bush_a.glb | Nature Kit | nature-kit/plant-bush.glb |
| nature/bush_b.glb | Nature Kit | nature-kit/plant-bushdetailed.glb |
| nature/rock_a.glb | Nature Kit | nature-kit/stone-largea.glb |
| nature/rock_b.glb | Nature Kit | nature-kit/stone-talla.glb |
| nature/rock_c.glb | Nature Kit | nature-kit/stone-smalla.glb |
| nature/stump.glb | Nature Kit | nature-kit/stump-round.glb |
| vehicles/sedan.glb | Car Kit | car-kit/sedan.glb |
| vehicles/suv.glb | Car Kit | car-kit/suv.glb |
| vehicles/pickup.glb | Car Kit | car-kit/truck.glb |
| vehicles/van.glb | Car Kit | car-kit/van.glb |
| vehicles/truck.glb | Car Kit | car-kit/delivery.glb |
| props/streetlamp.glb | City Kit (Roads) | city-kit-roads/light-square.glb |
| props/streetlamp_curved.glb | City Kit (Roads) | city-kit-roads/light-curved.glb |
| props/traffic_light.glb | City Kit (Roads) | city-kit-roads/traffic-light.glb |
| props/stop_sign.glb | City Kit (Roads) | city-kit-roads/road-sign-stop.glb |
| props/street_sign.glb | City Kit (Roads) | city-kit-roads/road-sign-street.glb |
| props/dumpster.glb | City Kit (Roads) | city-kit-roads/dumpster.glb |
| props/traffic_cone.glb | City Kit (Roads) | city-kit-roads/construction-cone.glb |
| props/barrier.glb | City Kit (Roads) | city-kit-roads/construction-barrier.glb |
| props/fence.glb | City Kit (Suburban) | city-kit-suburban/fence.glb |
| props/planter.glb | City Kit (Suburban) | city-kit-suburban/planter.glb |
| props/parasol.glb | City Kit (Commercial) | city-kit-commercial/detail-parasol-a.glb |
| props/awning.glb | City Kit (Commercial) | city-kit-commercial/detail-awning.glb |
| props/bench.glb | Graveyard Kit | graveyard-kit/bench.glb |
| props/trash_can.glb | Furniture Kit | furniture-kit/trashcan.glb |
| props/table.glb | Furniture Kit | furniture-kit/tablecross.glb |
| props/tent.glb | Nature Kit | nature-kit/tent-detailedopen.glb |

Modifications made here (JSON chunk only, geometry untouched) to the Nature Kit and Furniture Kit files: `metallicFactor` 1 -> 0 (they rendered near-black in Three.js without an environment map), removed the built-in -0.05 Y offset on the mesh node so the origin sits on the ground, fixed the scene root-node reference, dropped an unused `KHR_materials_unlit` declaration. Car/City/Graveyard files are byte-identical to the mirror.

## 2. KayKit : City Builder Bits (1.0)

- Author: Kay Lousberg (www.kaylousberg.com)
- License: Creative Commons Zero, CC0 — http://creativecommons.org/publicdomain/zero/1.0/
- Source: https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 (branch `main`, fetched through jsDelivr)
- License evidence: `LICENSE.txt` in the repo root and `addons/kaykit_city_builder_bits/Assets/LICENSE.txt` (identical; copy at `_dl/environment/kaykit/LICENSE.txt`): "License: (Creative Commons Zero, CC0) ... This content is free to use in personal, educational and commercial projects."

| File | Source file |
| --- | --- |
| props/fire_hydrant.glb | addons/kaykit_city_builder_bits/Assets/gltf/firehydrant.gltf + firehydrant.bin + citybits_texture.png (packed into one GLB, no other change) |

## Not included (no CC0 source reachable)

Mailbox, bike / bike rack, picnic table (a plain wooden table is provided as `props/table.glb` instead), dedicated market stall (parasol, awning and tent provided instead).
