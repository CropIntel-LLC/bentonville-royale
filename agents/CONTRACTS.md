# Wave 3 — cross-module contracts

Written 2026-11-14 before wave 3 started. Five agents build the game loop in parallel. Each owns specific files (below) and codes against the interfaces here for the files it does **not** own. You may add methods or fields to your own module. Do not rename or remove anything listed here. If you must deviate, write it in your report under **Contract changes**.

Conventions (from `src/core/config.js`): metres, x = east, z = SOUTH, y up. `heading` radians, 0 = north, clockwise; forward = (sin h, 0, -cos h). All tunables come from `config.js`; add new ones there only inside a clearly marked block named after your module.

Existing modules: read their header comments before using them — `src/core/{config,assets,input}.js`, `src/world/{World,WorldMeshes}.js`, `src/game/Character.js`, `src/render/{Atmosphere,Effects}.js`, `src/ui/{hud,Minimap,settings,icons}.js`, `src/audio/Sfx.js`. Map data: `public/data/bentonville-osm.json`. Assets and manifests: `public/assets/*/manifest.json`.

## Ownership

| Agent | Owns |
| --- | --- |
| Storm | `src/game/Storm.js` |
| Loot | `src/game/Loot.js`, `src/game/Inventory.js` |
| Structures | `src/game/Structures.js` |
| Bots | `src/game/Bots.js` |
| Integrator | `index.html`, `src/main.js`, `src/game/Game.js`, `src/game/Player.js`, `src/game/Combat.js`, `src/ui/menus.css`, `src/ui/menus.js`, `credits/fonts.md`, `src/audio/README.md` |

## Shared shapes

**Actor** — the player and every bot. Plain object or class instance with at least:

```
{ id: number, name: string, isPlayer: boolean, team: number (= id; solo),
  pos: THREE.Vector3 (feet), vel: THREE.Vector3, heading, pitch,
  radius: PLAYER.radius, height: PLAYER.height,
  health, shield, alive: boolean, kills: number,
  inventory: Inventory, character: Character | null }
```

**Item** — anything that lies on the ground or sits in an inventory:

```
{ type: 'weapon',     id: 'rifle'|'smg'|'shotgun'|'sniper'|'pistol', rarity, mag }
{ type: 'consumable', id: 'medkit'|'tonic', count }
{ type: 'ammo',       ammo: 'light'|'medium'|'shells'|'heavy', count }
{ type: 'material',   mat: 'wood'|'brick'|'metal', count }
```

## Storm.js (pure logic, no rendering)

```
export class Storm {
  constructor({ world })
  reset(rng, center: {x,z})        // phase 0 waiting, circle radius STORM.startRadius around map centre;
                                   // first target circle lies inside it, biased toward `center`
  update(dt)
  // read-only state, valid after reset():
  cx, cz, r                         // current circle
  nextCx, nextCz, nextR             // target circle
  phase (1-based for display), mode: 'waiting'|'shrinking'|'final'|'done', secondsLeft, dps
  isOutside(x, z) -> boolean
  distanceOutside(x, z) -> metres (0 inside)
  intensityAt(x, z) -> 0..1         // for Atmosphere.update stormIntensity01
  hudState(x, z) -> object for hud.setStorm(...)
}
```

## Inventory.js (pure data)

```
export class Inventory {
  slots: Array(5)  // each null | weapon Item | consumable Item
  selected: -1 (pickaxe) | 0..4
  ammo: { light, medium, shells, heavy }
  mats: { wood, brick, metal }
  reset(loadout?)                  // empty; mats 0; pickaxe selected
  add(item) -> Item | null         // returns what did not fit / what got swapped out of the selected slot
  canTake(item) -> boolean
  current() -> Item | null         // null = pickaxe
  select(i); next(dir)
  useConsumable() -> consumable Item | null (decrements count, clears empty slot)
  takeAmmo(kind, n) -> number taken
  spendMats(mat, n) -> boolean
  dropAll() -> Item[]              // for death loot
  hotbar() -> array in the shape hud.setHotbar expects (read src/ui/hud.js)
}
```

## Loot.js

```
export class Loot {
  constructor({ scene, world, models, fx, sfx })   // models = { key: gltf } from public/assets/loot + weapons
  spawnMatch(rng)                  // MATCH.chests, floorLoot, ammoBoxes at sensible spots (world.randomOpenPoint, building edges, landmarks)
  clear()
  update(dt, viewerPos)            // bob/spin, beam visibility, culling
  nearest(pos, maxDist = 2.4) -> { id, kind: 'chest'|'ammoBox'|'item', label, position, item? } | null
  open(id) -> boolean              // chest / ammo box: opens and spills items as new floor items
  take(id) -> Item | null          // removes a floor item
  drop(item, position)             // places an item on the ground (death drops, swaps)
  near(pos, radius) -> array of the same records as nearest(), sorted by distance (bots use this)
  blips() -> [{ x, z, kind: 'chest'|'loot' }] for the minimap
}
```

## Structures.js

Player-built pieces registered with `world.addPiece` (read `World.js` for how `dyn` pieces collide and ray-cast; it says "see Structures.js for the shape of piece").

```
export class Structures {
  constructor({ scene, world, fx, sfx })
  plan(kind: 'wall'|'floor'|'ramp'|'cone', pos: Vector3 (feet), heading, pitch) -> placement { kind, x, y, z, rot, valid }
  setGhost(placement | null, mat)
  place(placement, mat, owner: Actor) -> piece | null      // caller has already checked/spent BUILD.cost mats
  damage(piece, amount, hitPos) -> boolean                 // true if destroyed
  isPiece(collider) -> boolean
  clear()
  update(dt)                                               // build-up animation, hp tint
  count
}
```

## Combat.js (owned by Integrator; Bots call it)

```
export class Combat {
  constructor({ world, structures, fx, sfx, view /* WorldMeshes view */ })
  register(actor); unregister(actor); actors -> Actor[]
  fireWeapon(shooter: Actor, weaponItem, origin: Vector3, dir: Vector3, spread) -> [{ hitActor?, point, headshot }]
       // hitscan with pellets, falloff and RARITY_DAMAGE; damages actors, pieces, harvestables; plays fx and sfx
  swingPickaxe(shooter, origin, dir) -> { harvested?: { mat, count }, hitActor? }
  applyDamage(target, amount, { source, headshot, weapon, storm })   // shield first, then health; elimination
  onDamage = (target, amount, info) => {}     // hooks Game sets
  onEliminate = (victim, killer, info) => {}
}
```

## Bots.js

```
export class Bots {
  constructor({ scene, world, kits /* CharacterKit[] */, weaponModels, loot, structures, combat, fx, sfx })
  spawn(count, rng, { names, difficulty, dropPoints? })     // creates Actors, registers each with combat
  update(dt, { player: Actor, storm: Storm, time })
  list -> Actor[]
  clear()
}
```
Bots: drop/glide in, loot (Loot.near/open/take into their Inventory), rotate into the storm, fight with Combat.fireWeapon using `DIFFICULTY[difficulty]` aim error and reaction, sometimes build cover via Structures, use consumables. Cheap at 31 bots: think at a few Hz, LOD far bots (skip animation beyond `QUALITY.charDist`).

## Game.js (Integrator)

Owns the match: loading screen, menus (main, settings, pause, victory/defeat), drop phase with glider, Player controller (third-person camera, movement via `world.resolveCircle`, build mode, harvesting, interacting), wiring Storm → Atmosphere + HUD + Minimap, Effects, Sfx, and the render loop. Exposes `window.__game` for QA (state, player, bots, storm, `debug` helpers such as teleport / give / skipPhase).
