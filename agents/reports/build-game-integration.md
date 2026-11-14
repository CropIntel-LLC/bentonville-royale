# Build game integration (wave 3, Integrator)

Status: **DONE**. The match plays end to end: title → loading → drop → play → victory/defeat → Play Again or Main Menu. Headless QA ran with 0 page errors, 0 console errors and 0 failed requests, holding 60 FPS with 31 bots (Apple M1, ANGLE Metal).

## Files written
- `index.html`: canvas `#game`, `#ui-root`, font preloads, `#boot-error`.
- `src/main.js`: loads settings, `sfx.autoUnlock`, menus to Game wiring, menu music.
- `src/ui/menus.js` + `src/ui/menus.css`: title, settings, loading with progress and tips, pause, result (placement, kills, time survived, Play Again, Main Menu), drop banner. Original dusk-over-Ozarks look that reuses the `hud.css` tokens. Settings are live: sensitivity, volume, quality, difficulty, invert Y.
- `src/game/Game.js`: loads the map, manifests and GLBs, then builds World, WorldMeshes, Atmosphere, Effects, HUD, Minimap, Structures, Combat, Loot, Storm, Player and Bots. It also runs the match lifecycle, storm wiring and storm damage, the render loop (dt clamped to 50 ms), quality, spectating, and `window.__game`.
- `src/game/Player.js`: over-shoulder camera with collision pull-in, movement and physics, glide drop, hotbar, guns, ADS, reload, interact, build, pickaxe, consumables, emote.
- `src/game/Combat.js`: hitscan per the contract.
- `credits/fonts.md`, `src/audio/README.md`.

## Verified in QA
QA scripts are in the scratchpad: `steps.mjs` through `steps4.mjs`. The final soak ran on a `vite build` + `vite preview` snapshot, because Bots.js edits kept hot-reloading the dev server.

- Title and loading screens appear, the drop map shows the storm circle and loot blips, and clicking the map sets the drop marker.
- Drop and glide. Bots drop alongside the player.
- Opening an ammo box and picking up its spill.
- WASD movement and climbing a ramp to y≈3.
- Rifle fire, including a headshot on a bot (100 → 43 HP).
- Placing a wall, floor, ramp and cone (wood is spent).
- Pickaxe harvesting a tree: +10 wood per swing, debris, and the tree is destroyed.
- A Shield Tonic gives +50 shield.
- Storm damage hits health and skips the shield.
- Death leads to spectating and then the defeat screen. Play Again starts a new drop.
- killAll leads to victory.
- Bots loot, rotate, engage, heal and harvest, and they eliminate each other.

## `window.__game`
- State: `state`, `paused`, `player`, `bots`, `storm`, `result`, `alive`, `errors`, and `game` (the live instance).
- `debug` helpers:
  - Movement and view: `drop(x?,z?)`, `teleport(x,z,y?)`, `openSpot(r)`, `look(h,p)`, `aimAt(x,y,z)`.
  - Items and actions: `give(id|item, rarity)` (accepts weapon ids, medkit, tonic, wood, brick, metal, ammo), `select(i)`, `fire()`, `swing()`, `build(kind)`, `interact()`.
  - Lookups: `nearestLoot()`, `nearestHarvestable()`, `nearestBot()`.
  - Match control: `skipPhase()` (uses `storm.skip()`), `killAll()`, `damagePlayer(n)`, `god(on)`, `pause(on)`.

## Contract changes / clarifications
- **Combat.swingPickaxe does not add mats.** The caller adds `harvested` to its own inventory. It also returns `collider`, `point` and `destroyed`, and fires an extra hook, `combat.onHarvest`.
- **Combat honours `shooter.damageScale`** (default 1), and `info.storm` damage skips the shield. Fall damage also uses `storm: true`.
- **Game applies storm damage** to every registered actor once a second. Bots must not apply it themselves (they currently don't).
- **Game drops every eliminated actor's inventory** through `loot.drop`, and sets `bots.dropLootOnDeath = false`.
- Game also calls the Bots extras `bots.notifyDamage(...)` and `bots.setQuality(q)`.
- Combat adds `restoreWorld()` (re-shows harvested colliders between matches), `aliveCount` and `clear()`.
- The WorldMeshes view exposes `hideCollider(col)` / `showCollider(col)`. Its header mentions `destroyInstance`, which does not exist; Combat uses `hideCollider`.
- Game imports Storm, Loot, Inventory, Structures and Bots as namespaces. It falls back to a static storm or no bots if those exports are missing, so the game still boots with a placeholder file.

## Known issues
- Real mouse look, LMB and RMB need pointer lock, which headless Chromium does not grant. Those paths are untested in QA. Keyboard input and every action, driven through `debug`, are tested.
- The camera's collision pull-in only sees trunks, not tree canopies, so the camera can end up inside foliage next to a tree.
- `debug.teleport` lands on a roof when the point is inside a building footprint (it uses the highest surface).
- Bots start dropping during the 15 s pick-your-drop countdown, so they get a head start.
- The drop banner covers the bottom of the full map and the hotbar during the drop phase.
- The production bundle is a single 953 kB JS chunk (no code splitting).

## Screenshots (scratchpad, `qa/out*/`)
- `out/01-title.png`, `out/03-drop-map.png`, `out/05-shooting.png`, `out/09-result.png` (victory)
- `out2/01-glide.png`, `out2/02-builds.png`, `out2/04-harvest.png`, `out2/06-storm.png`, `out2/08-defeat.png`
- `out4/01-bot-near.png`

## What other modules got wrong
Nothing blocking. The only mismatch is the stale `destroyInstance` mention in the WorldMeshes header. I edited no other agent's files.
