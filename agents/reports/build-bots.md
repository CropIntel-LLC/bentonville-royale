# Build Bots — report

## What I built

`src/game/Bots.js`: the `Bots` class from the contract (`constructor`, `spawn`, `update`, `list`, `clear`).

- **Actors** follow the contract shape. Each bot gets an `Inventory`, plus a `Character` when `kits` is non-empty (kits are cycled, each with its own canopy colour). Every bot is registered with `combat`.
- **States** (`actor.botState`): `drop`, `loot`, `wander`, `rotate`, `engage`, `retreat`, `heal`, `harvest`, `dead`.
  - **drop:** bots glide in from `PLAYER.dropHeight` (plus 0–30 m) using `glideFallSpeed` and `glideSpeed`, and land on the ground or a roof through `groundHeight`. If the landing point is outside the storm circle, it is moved inside.
  - **loot:** `loot.near(pos, 45)` finds targets; chests and ammo boxes are opened, and wanted floor items are taken into the inventory. When the slots are full, a better weapon replaces the weakest one, and leftovers go back through `loot.drop`. Items the bot can't reach are ignored for a while.
  - **rotate:** heads for a point inside `storm.nextCx/nextCz/nextR`. It starts early according to `secondsLeft` and travel time, keeps going until well inside (hysteresis), and sprints when outside the circle or while it shrinks.
  - **engage:** the bot looks at the 4 nearest candidates within `DIFFICULTY.sight` and in its field of view (any direction when alerted), checks line of sight with `world.clearLine`, and waits a reaction delay before shooting. Aim error drifts per burst, adds per-shot jitter, settles while the bot tracks a target and grows when the target moves fast. Bursts and pauses follow `burst`. The bot strafes and holds a preferred range. It picks the weapon whose `botRange` best fits the distance, reloads from reserve ammo, and with chance `buildChance` (once per fight, with a cooldown) places a wall or ramp through `structures.plan`/`place` after spending `BUILD.cost` mats. Bots with no gun only fight at arm's length with the pickaxe.
  - **retreat / heal:** a badly hurt bot that has heals may break off the fight. Once it is safe, it uses a medkit or tonic over `useTime` and applies the heal at the end.
  - **harvest:** when mats are low, the bot swings at a tree or rock in front of it. The returned `harvested` amount goes into its inventory.
- **Movement** works like the player's: acceleration, gravity, jumping, `resolveCircle`, `groundHeight` step up and step down, and a clamp to the map bounds. Steering casts short horizontal rays to avoid obstacles and follows walls on a remembered side.
- **Getting unstuck** has three levels. First the bot jumps and switches sides. If that fails, or it oscillates without getting closer to its goal over 6 s, it gets an A* detour: a 2 m grid sampled lazily with `blockedAt` in a 192 m window. One shared planner is time-sliced at 350 expansions per frame, so it never causes a frame spike. Only after that does the bot pick a new goal.
- **Performance:** each bot thinks on a staggered timer at about 5–8 Hz; movement, aiming and fire cadence run every frame without allocating. Characters beyond `QUALITY[q].charDist` are hidden and not animated, and those in the outer half of that distance animate at half rate.

## Verification

The Node script is `/private/tmp/claude-501/-Users-havishkunchanapalli-bentonville-royale/76d35f36-f710-4ee7-a670-7738c2621938/scratchpad/bots-sim.mjs` (arguments: `seconds difficulty seed`). It builds the real World from `public/data/bentonville-osm.json` (buildings, areas, mapped trees, plus 2,500 extra harvestables) and runs 31 bots and a passive player with the real `Storm` at 30 Hz, applying storm damage the way Game does.

It has three modes:
- **Default:** stub Combat, Loot and Structures written to the contract.
- **`REAL=1`:** the landed `Combat`, `Loot` and `Structures`, constructed in Node.
- **`CHARS=1`:** adds real `Character` instances on a minimal fake rig, so the presentation code runs too.

Assertions: no NaN in position, heading or velocity, and none passed to fx, sfx or fireWeapon; every bot stays in bounds; all 31 land (the last at about 12 s); at least 25 bots move more than 50 m; at least 8 bots fire guns; bots damage other bots; eliminations happen; chests are opened and items taken; and no more than 5% of 10-second travel windows show a bot standing still.

Results:
- **Pass rate:** passes for easy, normal and hard over seeds 1–4, in stub and real modes, for 300 s. 480 s runs with all three modes pass, through storm mode `done`.
- **Cost:** about 0.03 ms per frame on average and about 1.5–2.5 ms at the worst frame for all 31 bots, without rendering.
- **Activity per 300 s run:** typically 300–400 shots, 10–20 pieces built and 300–600 mats harvested.

## Assumptions about other modules (checked against the files that landed)

- `Combat.fireWeapon` does not touch the magazine, so Bots decrements `item.mag`. Combat applies `shooter.damageScale`. `swingPickaxe` returns `harvested` and the caller adds it.
- Game applies storm damage to all actors. It sets `bots.dropLootOnDeath = false` because it drops inventories in `onEliminate`, and it forwards `onDamage` to `bots.notifyDamage`.
- `Loot.near` returns `{ id, kind, position, item? }` and leaves out opened chests. `Loot.take` plays its own pickup sound.
- An actor still in its drop is never targeted. That means `gliding`, `airborneDrop`, or `mode` of `bus`, `freefall` or `glide`.

## Contract changes

Nothing was renamed or removed. These are additions:
- `bots.notifyDamage(victim, amount, info)`
- `bots.setQuality(q)`
- `bots.alive`
- `bots.dropLootOnDeath`
- spawn options `idBase`, `loadout` and `quality`; `dropPoints` also accepts landmark keys, and bot `i` uses `dropPoints[i % n]`
- actor fields `botState`, `gliding`, `grounded`, `isBot` and `damageScale`
- an `_planPath` export, for tests only

## Notes

The match moves fast between bots: on normal, about half of them are eliminated by about 100 s in the simulation, with a passive player. The knobs for this are the aggression range in `_think` and the burst pause in `_fireControl`. They live in `Bots.js` rather than `config.js`.
