# Fix pass: rendering, structure collision, drop phase

Status: **DONE**. Nothing committed. Dev server stopped.

## 1. Rendering — root cause
There is no renderer, culling, normal, fog or tone-mapping fault. Wall winding and normals were checked by hand. Fog colour is `d3e8f8` with density 0.00095, the camera far plane is 3000 and the sky dome renders.

`qa/out/05-shooting.png` is the camera about 3 m from the south facade of the **8th Street Market** landmark (8.3 m tall, metal style). Two things combined:
- `WorldMeshes.js` tinted that landmark's walls `0x3f6f8f`, a dark slate blue close to the sky hue.
- The metal style draws its windows as continuous 86%-wide glass bands.

The building shader had no edges, cap, base or frames, so up close the wall filled the frame as one flat blue field with grey bands in perspective (the "parallelograms"). `qa/out/06-building.png` shows the same wall obliquely. Screenshots from other places were normal, so the problem was local to that building, not systemic.

Fix (`src/world/WorldMeshes.js`):
- Market tint is now warm industrial grey `0xbdb3a1` with roof `0x6f7376` (line 505).
- The facade shader (about lines 236–275, cache key `br-building-v2`) adds:
  - window frames and sills
  - a vertical gradient on the glass
  - a darker plinth at the base
  - slab lines between floors (brick and metal styles)
  - a parapet cap band with a shadow line
  - darker corner pilasters at both ends of each wall
  - subtle per-wall grime
  - darkening toward the ground

Walls now read as buildings at any distance.

## 2. Collision (`src/world/World.js`, `src/game/Structures.js`)
- **blockedAt sees pieces:** `World.js:261`, using the new `_pieceOverlaps` at :268. Pieces with base < 2.5 m (`PIECE_GROUND_BAND`, :16) block. Walls are tested against their segment, other pieces against their footprint. `randomOpenPoint` inherits this.
- **Ramp and cone side collision:** `World.js:~440–485` in `resolveCircle`, with `wedge: true` set at `Structures.js:230,243`.
  - Ramps and cones count as solid from y0 up to `surf()`, sampled at the closest footprint point.
  - You can walk on wherever that surface is within step height. That means a ramp's low end, and a cone's rim.
  - The high sides and back block you unless your feet are above them. You can walk under a ramp that is above head height.
  - A player whose centre is inside the footprint below the surface is pushed out the nearest side.
- **Level-0 floor vs ground:** tie-break at `World.js:549` and `:681`. A piece triangle within 2 cm (vertical) of the ground hit beats the ground plane.
- **Structural support:** `Structures.js`. The `connected()` test is at :255. `damage()` calls `_collapseAround` (:490/:501). Also `_component` (:519), `_grounded` (:594) and `isSupported()` (:495).
  - A piece is grounded when its base is at y≈0, or when a building or vehicle whose top is within one level below the base lies under it or next to it (sampled 0.35 m outside its edges).
  - Pieces are connected when their tight 3D bounds share at least an edge. A corner touch does not count.
  - After a piece is destroyed, each neighbour's group is flood-filled, stopping as soon as a grounded piece is found. Groups with no grounded piece are destroyed with debris effects, and the break sound plays for at most 3 of them.
  - A build-cell spatial hash (`_grid`) keeps neighbour lookups local.
  - Worst case is 870 floors hanging off one wall all collapsing at once: 11 ms, one time (`scratchpad/perf-collapse.mjs`).
  - `remove()` and `clear()` do not cascade.

## 3. Small items
- **Bots launch staggered over the drop window.**
  - `Bots.spawn` takes `opts.launchWindow` (`Bots.js:126`). Each bot gets `launchAt` spread evenly, in random order, over the window starting when the drop phase starts. That is the moment the player can first press SPACE. Game passes `DROP_SECONDS` (`Game.js:260`).
  - Until it launches, a bot has `actor.inBus = true`: hidden and frozen (`Bots.js:291`), skipped by `Combat.rayActors` (`Combat.js:124`), storm damage (`Game.js:493`) and `debug.nearestBot` (`Game.js:805`).
  - Measured in the browser, bots still in the bus at t = 0 / 4.4 / 7.4 / 10.4 / 13.4 s: 31 / 22 / 16 / 10 / 3.
- **Drop banner.** `menus.showDropBanner` toggles `html.br-dropping` (`menus.js:268`). `menus.css:466–476` then top-aligns the full map, shrinks it by 112u so the banner sits below it, and hides the hotbar (`.br-bc`) while the player is in the bus.

## Verification
- `node scratchpad/verify-structures.mjs`: **ALL OK**. The original asserts plus a new "fix-pass" block covering:
  - blockedAt on a wall, a level-0 floor and a level-2 floor
  - randomOpenPoint around a 24 m build pad
  - ramp east, west and back sides blocking
  - ramp low end open, and a walk to the top
  - standing above a ramp side; walking under a level-1 ramp; being pushed out of the wedge
  - cone rim walkable
  - vertical and shallow rays hitting a level-0 floor; ground next to it
  - tower collapse; a bridge with two supports (one removed, then the middle piece removed)
  - stacked and perpendicular walls; roof-supported and abutting pieces
  - grid bookkeeping; collapse count = 7

  The original script is kept as `verify-structures.orig.mjs`.
- `REAL=1 node scratchpad/bots-sim.mjs 90`: **PASS** (7 builds, 0/147 stuck windows).
- Browser (`npx vite --port 5193`, `tools/qa/smoke.mjs`):
  - Each of these had 0 page errors and 0 console errors: fresh probes `fix/probe1-4.mjs` and the integrator's `qa/steps.mjs` (victory path).
  - `qa/steps2.mjs` (builds, ramp, harvest, tonic, storm, defeat, Play Again) also had 0 page errors and 0 console errors on the second attempt. The first attempt timed out waiting for the drop state after one aborted blob request during asset load; the retry passed, so this looks like a loading flake.
  - In game, open ground at Memorial Park:
    - wall, floor, floor tower: the wall was destroyed and both floors collapsed
    - a downward ray hit the ground-level floor
    - blockedAt is true on it
    - the real player walked into a ramp side and stopped at the radius (0.42 m from the edge)
    - walking in from the low end climbed to y = 1.36
- `vite build` OK.

## Screenshots (`/private/tmp/claude-501/-Users-havishkunchanapalli-bentonville-royale/76d35f36-f710-4ee7-a670-7738c2621938/scratchpad/fix/`)
- Repro before the fix:
  - `out1/01-repro.png`
  - `out2/01-market-near.png`
  - `out2/03-market-up.png`
- After:
  - market close and far: `out3/01-market-close.png`, `out3/03-market-far.png`
  - downtown square: `out3/04-square.png`, `out4/03-downtown-square.png`
  - glide height: `out4/02-glide.png`
  - residential street: `out4/04-residential-street.png`
  - open park: `out4/05-memorial-park.png`
  - looking up at the sky: `out4/07-sky-up.png`
  - Momentary roof: `out4/08-momentary.png`
- Drop map with the banner clear of the map: `out4/01-drop-map.png`
- Builds: `out5/01-structures.png`
- Regression runs: `out6/` (steps.mjs), `out7/` (steps2.mjs)

## Unresolved / notes
- Pieces are not checked for support when placed, so you can still place a floating piece. Only destruction triggers collapse.
- Ramps and cones have no side triangles for ray casts, so bullets fired at a ramp's side pass under its top surface.
- In `qa/steps2.mjs`, `nearestBot` can now return a bot still in the bus or not yet landed, because of the stagger. The helper now skips bots in the bus.
- Seen but not touched:
  - The "DROP!" announce stays up about 2 s after `debug.teleport`.
  - The chest prompt reads "Open Open Chest": the label already includes the verb.
