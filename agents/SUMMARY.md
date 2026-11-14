# Agents

Snapshot at about 3:23pm America/Chicago on 2026-11-14, when this session hit its usage limit again (resets 5:20pm). Reports from agents that finished a writeup are in `agents/reports/`.

The match plays. Three agents were killed before they could finish: real-world map data, weapon audio and models, and P2P multiplayer.

## Killed at 3:23pm

| Agent | On disk | Left unfinished |
| --- | --- | --- |
| Wave 1 A: real-world map data | Terrain, building heights, and (at 3:24pm, after the agent died) the imagery outputs. `public/data/bentonville-terrain.bin` + `.json` (USGS 3DEP, 4 m grid, relief about 79 m). OSM JSON extended: Overture heights on 4,034 of 4,712 buildings, roof fields, bridge/tunnel/layer, `buildingParts`. `public/data/bentonville-trees.json` (36,226 canopy points from USDA NAIP) and `public/data/bentonville-ground.webp` (1489×2048). Scripts: `scripts/fetch-terrain.mjs`, `scripts/fetch-overture.py`, `scripts/fetch-imagery.mjs`, updates in `scripts/fetch-map-data.mjs`. Report `agents/reports/wave1-a-map-data.md` still says imagery was running. | The game does not load any of it. `Game.js` still loads only `bentonville-osm.json`. No `terrainHeight` in `src/world/`. |
| Wave 1 D: weapon audio and models | Quaternius Ultimate Guns (CC0) plus a CircuitZ pickaxe replaced the Kenney stand-ins in `public/assets/weapons/`. 45 CC0 Freesound MP3s in `public/assets/sfx/` (~420 KB). `src/audio/Sfx.js` fetches and decodes them. Credits: `credits/weapons-loot.md`, `credits/audio.md`. Shots: `agents/reports/wave1-d-shots/`. | The report `agents/reports/wave1-d-weapons-audio.md` is only the opening findings. The agent died before writing the rest. |
| Build P2P multiplayer mode | Nothing. No multiplayer module, no networking code, no report. | The whole task. |

## Finished after the 2:03pm snapshot

These agents wrote a report and the files they name are in the tree.

| Agent | What landed |
| --- | --- |
| Build storm | `src/game/Storm.js`. Pure logic, 402 s timeline, circles stay inside the map. `agents/reports/build-storm.md`. |
| Build structures | `src/game/Structures.js`. 4 m grid, walls, floors, ramps, cones, ghost, collapse. `agents/reports/build-structures.md`. |
| Build loot and inventory | `src/game/Inventory.js`, `src/game/Loot.js`. Hotbar data and instanced pickups. `agents/reports/build-loot-inventory.md`. |
| Build bots | `src/game/Bots.js`. Drop, loot, rotate, engage, build. `agents/reports/build-bots.md`. |
| Build game integration | `index.html`, `src/main.js`, `src/game/Game.js`, `src/game/Player.js`, `src/game/Combat.js`, `src/ui/menus.js`, `src/ui/menus.css`, `credits/fonts.md`, `src/audio/README.md`. Title, load, drop, play, victory or defeat. Headless QA: 0 page errors, 60 FPS with 31 bots. `agents/reports/build-game-integration.md`. |
| Fix pass: rendering, collision, drop | Building facades, piece collision, ramp and cone sides, structural collapse. `agents/reports/fix-pass-rendering-collision.md`. |
| Wave 1 C: cartoon art pass | `src/render/Toon.js`, `src/render/Post.js`, and the sky and material changes that go with them. Cel shading, ink, bloom, FXAA. `agents/reports/wave1-c-art-pass.md`. |
| Wave 1 E: Google 3D tiles | `src/render/GoogleTiles.js`. Off unless `VITE_GOOGLE_MAPS_API_KEY` is set in `.env.local` (see `.env.example`). `agents/reports/wave1-e-google-tiles.md`. |

`agents/CONTRACTS.md` is the wave 3 interface those game-loop agents coded against.

## Wave 2 — files through 1:57pm, summary at 2:03pm

One report that wave: the OSM pipeline (`agents/reports/build-osm-map-data-pipeline.md`). The other modules landed without a handoff and are still in the tree: `src/core/{config,assets,input}.js`, `src/world/{World,WorldMeshes}.js`, `src/ui/{hud,hud.css,icons,Minimap}.js`, `src/audio/Sfx.js`, `src/render/{Atmosphere,Effects}.js`, `src/game/Character.js`. The five `// placeholder` game files from that wave were replaced by wave 3.

## Wave 1 — cut off at about 1:27pm

Seven agents finished and wrote a report. Six were relaunched later.

| Agent | What landed |
| --- | --- |
| Download nature and city assets | 34 CC0 models in `public/assets/nature/`, `vehicles/`, and `props/`, plus `credits/environment.md`. |
| Download weapon and loot assets | Loot models in `public/assets/loot/` are still the Kenney CC0 files in `credits/weapons-loot.md`. The guns and pickaxe were replaced in the 3:23pm wave. |
| Download character assets | KayKit Adventurers (CC0): `player.glb`, `bot_a.glb`, `bot_b.glb`, `bot_c.glb`. Notes in `credits/characters.md`. |
| Build Playwright QA harness | `tools/qa/smoke.mjs`. Headless Chromium with Metal WebGL. |
| Evaluate `devriescoapps/Fortnite` | Could not clone. No LICENSE file. Not used as a base. |
| Evaluate `cass-agency/fortnite-clone` | Could not clone. MIT, Vite. Not used as a base. |
| Evaluate `nickypeakin/firtnite` | Public API 404. Skip. |

## What this means for the game

A solo match can boot from `index.html`: menus, drop, shooting, building, storm, bots. Map JSON, terrain, canopy trees, and a ground texture are on disk, and the running game still uses the flat OSM map. Multiplayer was not started. The three candidate base repos from wave 1 were not usable from this machine, so the project is still a clean Three.js and Vite tree.
