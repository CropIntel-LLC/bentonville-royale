# Build Loot + Inventory (wave 3)

## What was built

- `src/game/Inventory.js`: pure data with no THREE and no DOM imports. It implements the full contract: `slots`, `selected`, `ammo`, `mats`, `reset(loadout?)`, `add`, `canTake`, `current`, `select`, `next`, `useConsumable`, `takeAmmo`, `spendMats`, `dropAll`, `hotbar`.
  - `add()` copies items and never mutates its argument. It returns the leftover, or the item swapped out of the selected slot. A swap happens only when every slot is full and a real slot is selected. With the pickaxe selected, the item comes back instead.
  - Consumables stack to `CONSUMABLES[id].stack`. Mats cap at `PLAYER.matCap`. Ammo caps at `AMMO_CAP = 999`, which is a local constant.
  - `hotbar()` returns `null | { name, icon, rarity, ammo (weapon mag) | count (stack) }`, which is what `hud.setHotbar(slots, inv.selected)` reads. `inv.mats` goes straight into `hud.setMaterials`.
  - `useConsumable()` returns the unit it used, `{ type:'consumable', id, count:1 }`. When a stack runs out the slot is cleared and the selection stays on that slot.
  - `next(dir)` cycles through the pickaxe and the filled slots.
- `src/game/Loot.js`: implements the full contract.
  - **Rendering:** each visual kind is one InstancedMesh, 12 draw calls in total: chest body, chest lid, ammo-box body, ammo-box lid, one per weapon, medkit, potion, and a tinted crate for ammo and material pickups. Matrices are rewritten only for records within `cullDist` (260 m; `setQuality(q)` adjusts it).
  - **Lids:** chest and ammo-box lids are split from the `lid` node. The hinge pivot comes from the node, and the axis is derived from it. Lids open with an ease-out-back.
  - **Effects:** loot beams, chest glows and the positional `chest_hum` loop are attached only to nearby records (70 / 55 / 24 m), with hysteresis and caps. This matters because the Effects pools hold only 128 beams and 64 glows.
  - **Placement:**
    - Chests and ammo boxes sit 0.9–1.4 m outside a building wall, facing away from it.
    - Floor items go either 1.2–3.5 m from a wall or at `randomOpenPoint` near a building or landmark.
    - A share of each kind is weighted toward the `DROP_ZONES` landmarks: chests 55%, ammo boxes 35%, floor items 40%.
    - Spots keep a minimum spacing, and none are blocked or in water. Heights come from `world.groundHeight`.
  - **Rolls:** rarity is weighted separately for floor loot and chests, and snipers are always rare or better.
    - A chest gives a weapon, its ammo, a consumable or extra ammo, and 30 wood.
    - An ammo box gives 2–3 ammo stacks.
    - 70% of floor weapons get a matching ammo pile beside them.
  - **Opening:** `open()` plays `fx.chestOpen` and the `chest_open` sound, then spills items in an arc in front of the container with a short hop animation.
  - **Pickups:** `take()` plays `fx.pickupBurst` and the `pickup` or `pickup_ammo` sound. `drop()` scatters the item 0.5–1.4 m from the given position.
  - Tunables are the exported `LOOT` constant inside Loot.js. I did not touch `config.js`.

## Expected model keys

`models` is a `{ key: gltf }` map. A `null` or missing value falls back to a coloured box.

- From `public/assets/loot/<key>.glb`: `chest`, `ammo` (the ammo box), `crate`, `medkit`, `potion`
- From `public/assets/weapons/<key>.glb`: `rifle`, `smg`, `shotgun`, `sniper`, `pistol`

`pickaxe` is not used.

## Verification

Both test scripts are in the session scratchpad. Nothing was run in a browser.

- **Inventory:** `test-inventory.mjs` in Node checks stacking, the caps, the swap and no-swap rules, `useConsumable`, `next` skipping empty slots, `weaponHud`, `dropAll`, loadouts and the `hotbar()` shape. All assertions pass.
- **Loot:** `test-loot.mjs` in Node.
  - **Setup:** the real map JSON goes into `World`, with buildings and areas registered the way WorldMeshes does it. All 10 real GLBs are parsed with GLTFLoader; textures fail without a DOM, but the geometry loads. `fx`, `sfx` and the scene are stubbed.
  - **Spawning:**
    - `spawnMatch` gives 70 chests, 45 ammo boxes and 148 floor items (110 spots plus ammo companions), 263 objects in all. It takes about 11 ms.
    - No record is inside a building.
    - With `{area}`, every record lands inside the circle.
  - **Speed:** `update` averages about 0.05 ms per frame.
  - **Interaction:** this ran the same with real models and with no models.
    - `nearest` finds the chest.
    - `open` spills 4 items, and the lid reaches fully open.
    - `take` and `Inventory.add` work together.
    - `blips` are correct.
    - Record indices stay consistent after removals.
  - **Hinges:** both open in the right direction. The chest lid swings back over its rear hinge, and the ammo-box lid flips over the hinge on its +X side.

## Contract changes

None renamed or removed. These are additions:

- **Inventory additions:**
  - `version` counter.
  - `wouldSwap(item)`, for a "[E] Swap" prompt.
  - `reserveFor(weapon)`.
  - `weaponHud(reloading01)`, which returns the `hud.setWeapon` shape.
  - Exports `slotView`, `SLOT_COUNT` and `AMMO_CAP`.
  - `canTake(item)` means "at least part fits without swapping".
- **Loot additions:**
  - `spawnMatch(rng, opts?)` accepts `{ area: {x,z,r}, chests, ammoBoxes, floorLoot }`. The caller should pass the storm's start circle as `area`, or loot spreads over the whole 3.6 × 5 km map.
  - `setQuality(q)`, `dispose()`, `count`, `group`.
  - The records returned by `nearest()` and `near()` also carry `rarity`. `label` has no key prefix; the caller adds "[E] ".
  - `drop()` returns the new id.
  - Exported helpers: `LOOT`, `itemLabel`, `itemRarity`, `rollWeapon`, `ammoFor`, `rollConsumable`, `rollAmmo`.
- **Rendering:** the instanced meshes set `frustumCulled = false` because Loot culls them by distance itself.
