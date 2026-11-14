# Agents

Thirteen background agents built Bentonville Royale in parallel. Each one was a general-purpose agent on Claude Fable, working in its own folders so the others could write at the same time. Seven finished and handed back a report. Six stopped when the session hit its usage limit at about 1:27pm America/Chicago (resets 5:30pm).

Full reports from the agents that finished are in `agents/reports/`.

## Finished

| Agent | What landed |
| --- | --- |
| Download nature and city assets | 34 CC0 models in `public/assets/nature/`, `vehicles/`, and `props/`, plus `credits/environment.md`. Kenney kits (via the Hidencod/tge-assets mirror) and one KayKit hydrant. glTF validator: 0 errors. |
| Download weapon and loot assets | 11 CC0 files in `public/assets/weapons/` and `loot/`, plus `credits/weapons-loot.md`. `pickaxe.glb` is a KayKit two-handed axe. `medkit.glb` is a defibrillator case. Chest and ammo crate have a separate lid node. |
| Download character assets | KayKit Adventurers (CC0): `player.glb` (Rogue Hooded), `bot_a.glb` (Knight), `bot_b.glb` (Barbarian), `bot_c.glb` (Mage). Same 41-joint skeleton and 76 clips (idle, walk, run, jump, shoot, melee, death, cheer). Notes in `credits/characters.md`. |
| Build Playwright QA harness | `tools/qa/smoke.mjs`. Headless Chromium with Metal WebGL (`Apple M4`). Self-test passed: console errors, eval, canvas pixels, screenshots, scripted input. |
| Evaluate `devriescoapps/Fortnite` | Could not clone (`github.com` connection reset). API metadata: no LICENSE file, TypeScript client/server (not Vite), last push 2026-09-28. Not used as a base. |
| Evaluate `cass-agency/fortnite-clone` | Could not clone. API metadata: MIT license, Vite, about 9 source files plus a `server/`. Not used as a base. |
| Evaluate `nickypeakin/firtnite` | Repo does not exist publicly (API 404). Skip. |

## Stopped on the usage limit

These agents had started writing, then the session was cut off. Nothing below is a finished handoff.

| Agent | On disk | Still missing |
| --- | --- | --- |
| Build OSM map data pipeline | `scripts/fetch-map-data.mjs` (OSM `/api/0.6/map`, tiled, cache in `data-raw/`, writes `public/data/bentonville-osm.json`) | The script was never run to completion. No `public/data/bentonville-osm.json` and no `credits/map-data.md`. |
| Build HUD and menu UI | `src/ui/hud.js` (`buildHud`), `src/ui/icons.js`, `src/ui/settings.js`, fonts in `public/assets/fonts/` | `src/ui/ui-demo.html` and `credits/fonts.md`. Menus beyond the in-game HUD were not confirmed. |
| Write synthesized audio module | `src/audio/Sfx.js` — Web Audio only, exports `sfx`, `Sfx`, `SOUND_NAMES`, `LOOP_NAMES`, `MUSIC_NAMES` | `src/audio/sfx-demo.html` and `src/audio/README.md`. |

## Stopped before writing any files

The limit hit these three before they called a tool. Their modules are not in the tree.

- Build minimap renderer module (`src/ui/Minimap.js`)
- Build sky and lighting module (`src/render/Atmosphere.js`)
- Build visual effects module (`src/render/Effects.js`)

## What this means for the game

Assets, credits, the QA harness, a partial HUD, a synthesized audio module, and the map-fetch script are in the repo. The playable loop is not: there is no map JSON yet, and no minimap, sky, or effects module. The three candidate base repos were not usable from this machine, so the project started clean on Three.js and Vite.
