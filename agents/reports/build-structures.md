# Build Structures (wave 3)

Owner of `src/game/Structures.js`. No other repo files edited. `World.js` was not changed.

## What it does

- `Structures` implements the contract: `plan`, `setGhost`, `place`, `damage`, `isPiece`, `clear`, `update`, `count`.
- Extra members: `pieces` (live list), `slots` (Map from slot key to piece), `at(placement)` (the piece already in that slot, or null), `remove(piece, effects=false)`, `dispose()`, `group`, `batches`, `ghosts`.
- Grid: 4 m cells with corners on multiples of 4. Level k starts at y = 3k.
  - Floors, ramps and cones each take one cell at one level.
  - Walls take one cell edge at one level.
  - One cell can hold a floor, a ramp, a cone and four walls at the same time.
- `plan(kind, pos, heading, pitch)` returns `{ kind, x, y, z, rot, valid, level, key }`.
  - Base level is `floor(feetY/3 + 0.34)`, so a player two-thirds of the way up a ramp chains the next ramp one level higher.
  - **wall**: goes on the nearest grid line ahead on the dominant axis. `rot` = 0 for a wall along x, π/2 for a wall along z. pitch > 0.6 moves it up one level; pitch < -0.6 moves it down one.
  - **floor**: goes in the cell about 3.2 m ahead, or in the player's own cell when pitch < -0.9. pitch > 0.45 moves it up one level.
  - **ramp**: goes in the cell ahead. `rot` is the heading snapped to 90°, and the ramp rises away from the player. pitch < -0.6 moves it down one level.
  - **cone**: goes in the cell ahead at the player's level, or one level up as a roof when pitch > 0.2. When pitch > 0.75 it goes over the player's own cell.
  - `valid` is false when any of these is true: the slot is taken, `count >= BUILD.maxPieces`, the spot is within 2 m of the map edge, or the spot is inside a building or vehicle prism taller than the piece's base.
  - Pitch convention assumed: positive pitch looks up.
- Rendering:
  - 12 `InstancedMesh` (4 kinds × 3 materials), each with capacity `BUILD.maxPieces`. Removal swaps in the last instance. Empty meshes are hidden.
  - Material: `MeshStandardMaterial` with a procedural canvas texture (wood planks, brick bond or metal panel; skipped when there is no `document`). Instance colour comes from `MATERIAL_COLOR`.
  - An `onBeforeCompile` hook adds a per-instance `aDmg` attribute that darkens the piece and draws procedural cracks once damage taken passes 25% and 55% of max HP.
- `update(dt)`:
  - Build-up: the piece pops up from its base with a back-out ease over 0.26 s.
  - HP starts at 20% and grows to full over 1.6 s (wood), 2.6 s (brick) or 3.6 s (metal). The piece reads pale while it is growing.
  - These constants are local to `Structures.js`. Nothing was added to `config.js`.
- Ghost: one translucent mesh with an edge outline per kind. Blue `0x5ec8ff` means valid, red `0xff4848` means invalid.
- Effects and sounds:
  - `place` calls `fx.buildPlace(centre, size, mat)` and plays sfx `build_wood`, `build_stone` or `build_metal`.
  - Destroying a piece calls `fx.debris(...)` and plays sfx `build_break`.
  - `place` into an occupied slot or over the cap returns null and plays `build_denied`.
  - Hits that do not destroy a piece play no sound. Combat should play its own impact effect and sound for those.

## Piece shape (what World reads)

```
minX, maxX, minZ, maxZ   bins the piece into world cells (walls padded by 0.6 m; see below)
tris   Float32Array, 9 floats per triangle — raycast (all kinds; World reads it unguarded)
surf(x,z) -> y           floor / ramp / cone only — groundHeight + ceilingAbove
seg    [ax,az,bx,bz]     walls only — resolveCircle (World adds WALL_HALF 0.14)
y0, y1                   vertical extent (resolveCircle reads them for walls)
```

Structures' own fields: `id`, `isStructure: true`, `kind`, `mat`, `level`, `ci`, `cj`, `key`, `x`, `y`, `z` (base centre), `rot`, `hp`, `maxHp`, `taken`, `owner`, `age`, `growing`. World sets `type`, `alive` and `stamp`. `isPiece(c)` checks `c.isStructure && c.type === 'piece'`.

## Verification

`node <scratch>/verify-structures.mjs`. It uses a fake 400 m map with one building. Result: **ALL OK**. It asserts:

- A ramp planned facing north lands in the cell ahead and rises away from the player.
  - Walking it, `groundHeight` climbs 0 → 2.96 in about 0.22 m steps, reads 1.5 at mid-ramp, and `surface === 'build'`.
  - A player on the ground cannot pop onto the high end.
- A floor planned from the ramp top lands at level 1.
  - A player can stand on it, and a player underneath stays on the ground.
  - `ceilingAbove` from below returns 3.
- The next ramp planned from two-thirds up the first ramp goes up one level.
- Walls:
  - `resolveCircle` pushes the player out on both sides of a wall.
  - It does not block a player standing on top of the wall.
  - A wall on a 32 m world-cell border still blocks from the other side.
- `raycast` hits the wall, floor and ramp at the right points, with `kind 'piece'`. `clearLine` is blocked.
- The cone is planned as a roof at level 1, and its apex height is correct.
- Plans inside a building and at the map edge come back invalid.
- The ghost turns red on an occupied slot and hides on null.
- HP grows to full after `update`.
- Damage:
  - A partial hit returns false and a lethal hit returns true.
  - The destroyed piece is unregistered: rays pass through, there is no collision, and the slot is free.
  - debris, `build_break`, `build_metal` and buildPlace were each called.
- Instance indices stay consistent after swap-removal.
- `clear()` unregisters everything.
- The cap of 900 is enforced.

Not run in a browser (no dev server). The crack shader injection targets `#include <common>`, `<uv_vertex>` and `<map_fragment>`, which are present in three 0.187.

## Notes / World gaps (not edited)

- `World.blockedAt` (and so `randomOpenPoint`) ignores `dyn` pieces. Loot and bots can pick a spot inside a build.
- Ramps and cones have no side collision. World only blocks `seg` (walls). A player can walk through a ramp from the side; `groundHeight` only lifts them when the surface is within step height.
- A floor at level 0 is coplanar with the ground. A downward ray reports `ground` rather than the floor.
- No structural support or cascade collapse: pieces stay up when the pieces under them are destroyed.

## Contract changes

None. Additions only: `plan` output also carries `level` and `key`, and an optional 5th `out` argument is reused. `place` returns null when the slot is taken or the cap is reached, in which case the caller should refund the mats. New members: `at`, `remove`, `pieces`, `dispose`.
