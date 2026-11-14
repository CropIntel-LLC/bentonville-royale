# Build Storm

## What was built
`src/game/Storm.js`: pure-logic `Storm` class matching the Storm contract in `agents/CONTRACTS.md`. It uses `STORM` from `src/core/config.js`. It has no rendering and no THREE import.

- **Timeline.** Each phase in `STORM.phases` runs its wait stage, then its shrink stage. `update(dt)` loops across stage boundaries, so any `dt` is safe, including `1e6`. The total timeline is 402 s.
- **Modes.** `mode` is `'waiting'` or `'shrinking'` in phases 1–5. It is `'final'` for the whole last phase (the one that closes to radius 0). It becomes `'done'` when that phase ends. At `'done'`: `r = 0`, `secondsLeft = 0`, `phase = 6`, `dps` stays at the last phase's 10, and everyone counts as outside.
- **Start circle.** `STORM.startRadius` (620 m). Its centre starts at the map origin (downtown) and is pulled toward the drop zone `center` until the drop zone is no more than 0.4 R from it. The centre is then clamped so the whole circle is inside `world.bounds`.
- **Next circles.** Each target lies fully inside the current circle (`|dc| + nextR <= r`), so every circle is also inside the map. The first target is biased toward `center` with some jitter; later targets are random. For circles under 120 m, up to 12 candidates are tried to avoid water or blocked centres. This uses `world.areaAt` and `world.blockedAt` when they exist.
- **Shrink.** Centre and radius share one smoothstep-eased parameter. This keeps the radius monotonic and keeps every circle drawn during a shrink inside the one before it.
- **Queries.** `isOutside`, `distanceOutside` and `intensityAt` are implemented. `intensityAt` returns:
  - 0 when more than 18 m inside the edge;
  - up to 0.25 within 18 m inside the edge;
  - 0.55 just outside, rising to 1 at 90 m outside;
  - 1 once the circle is gone.
- **HUD.** `hudState(x, z)` returns `{ phase, secondsLeft, state, outside }`, the four fields `hud.setStorm` reads. It reuses one object between calls. At `'done'` it reports state `'final'`, because the HUD has no label for `'done'`.
- **Extras** (additions to the contract, nothing renamed):
  - `skip()`: debug helper that jumps to the end of the current stage, for `__game.debug.skipPhase`.
  - `shrinking` (boolean), `phaseIndex`, `elapsed`, `totalTime`.
  - The Storm object itself has the `{cx, cz, r, nextCx, nextCz, nextR}` shape that `Minimap.update({storm})` and `Atmosphere.setStorm()` take, so it can be passed directly.

## Verification
Two Node scripts, kept in the scratchpad and not in the repo:

- `storm-test.mjs` uses a fake world with the real map bounds and landmarks. It ran 840 full storms: 7 drop zones × 40 seeds × 3 frame lengths (1/60 s, 0.5 s, 7.3 s). All passed. It asserts:
  - the start circle is inside the bounds and contains the drop zone;
  - the target is always inside the current circle;
  - the live circle each frame is nested inside the previous frame's circle;
  - the radius never grows;
  - the phase never goes backwards, and `dps` matches the phase;
  - `elapsed` equals the sum of all waits and shrinks (402 s);
  - there are exactly 6 distinct targets;
  - the end state is correct (`r = 0`, outside = true, intensity 1, hudState `{6, 0, 'final', true}`), and `'done'` holds when updated further;
  - hudState has exactly the four keys;
  - stage timings at known times, `skip()`, and a single `update(1e6)` behave correctly;
  - an un-reset storm and `reset` with null arguments work.
- `storm-realworld.mjs` ran the storm against the real `World` class with the Home Office drop zone. The start circle clamped to x = 1103, which is `maxX - 620`. The circles nested down to 0 m.

## Contract changes
None to names or signatures. One clarification: the contract says the start circle is "around map centre", and `DROP_ZONES` in config says the first circle is "centred near" a drop zone. Several drop zones (Crystal Bridges, Home Office, Memorial Park) are more than 620 m from the origin, so a circle fixed on the origin would leave them in the storm. The start centre is therefore pulled from the origin toward `center` and clamped to the bounds. Read the start centre from `storm.cx` and `storm.cz` after `reset()`; do not assume it is (0, 0).
