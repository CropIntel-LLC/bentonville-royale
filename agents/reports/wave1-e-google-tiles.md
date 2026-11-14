# Wave 1 / E: optional Google Photorealistic 3D Tiles view

Status: done (not committed). Off by default; inert without a key.

## How to enable (user steps)

1. Google Cloud console: create or pick a project and **attach a billing account** (Map Tiles API is billed per root-tileset request/session after the free tier).
2. APIs & Services > Library: enable **Map Tiles API**.
3. APIs & Services > Credentials > Create credentials > API key. Edit the key:
   - Application restrictions: **Websites (HTTP referrers)**, add `http://localhost:5173/*` (add other dev ports if used).
   - API restrictions: restrict to **Map Tiles API**.
4. In the repo root: `cp .env.example .env.local`, set `VITE_GOOGLE_MAPS_API_KEY=<your key>`. (`.env.local` is git-ignored by `.env.*`, and `.vercelignore` excludes it too.)
5. Restart `npm run dev`, open Settings, turn on **Real-world 3D view (Google)**. Start a match: the procedural town is replaced by streamed tiles; attribution sits bottom-left.

Security: Vite inlines every `VITE_*` variable into the client bundle. Any build made with the key exposes it to anyone who loads the page. Do not set it for deploys (the toggle is then disabled and nothing contacts Google), or use a separate, referrer-restricted key per deployed origin.

## What changed

- `src/render/GoogleTiles.js` (new)
  - `googleTilesKey()` / `hasGoogleTilesKey()` read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
  - Pure math, Node-testable: `geodeticToEcef()`, `ecefToGameMatrix({lat, lon, height, projectionMatch})`: ECEF to local ENU at lat 36.3729 / lon -94.2088, mapped to game axes x = E, y = U, z = -N (south). It also applies the map pipeline's fixed metres-per-degree (MX/MZ in `scripts/fetch-map-data.mjs`) as a tiny non-uniform scale (~0.12% x, ~0.35% z) so OSM features line up to the map edge.
  - `GoogleTilesView`: `3d-tiles-renderer` `TilesRenderer` with `GoogleCloudAuthPlugin` (Map Tiles API root tileset, `autoRefreshToken`), `GLTFExtensionsPlugin` + DRACOLoader (decoder from gstatic, only fetched while active), `TileCompressionPlugin`, `UnloadTilesPlugin`, errorTarget 20. Ground height: the ENU origin sits at ellipsoid height 362 m (390 m terrain + -28 m geoid). After each `tiles-load-end` (max 6 times) it auto-calibrates by ray casting a 3x3 grid (25 m) around the camera against the tiles and matching to `world.terrainHeight(x,z)` when that exists, otherwise y = 0. It uses the second-lowest difference and clamps to ±80 m. Overrides: `?gtilesHeight=<ellipsoid m>` (fixed, no auto), `?gtilesOffset=<m>`, `window.__brGoogleTiles.setHeightOffset(m)` / `.calibrate()`.
  - `WorldHider`: hides the procedural world by moving meshes to layer 31, so they are hidden from the camera and shadow cameras. It uses layers, not `.visible`, because `view.update` rewrites `.visible` every frame. It covers `game.view.root` descendants, scene-level InstancedMeshes tagged with `userData.cx/cz` (tree and prop instancers), and any scene child named `world`. It runs again every 2 s and restores the exact masks on disable. Characters, loot, builds, effects, sky and the storm stay visible. Collision is untouched (World).
  - `createGoogleTilesController({ getGame, onFail })`: its own rAF loop runs only while enabled. It waits for `game.loaded && game.view`, lazy-imports the library, and calls `tiles.update()` each frame. It also refreshes the attribution overlay (`Google` + the de-duplicated data-provider credits of visible tiles, from `tiles.getAttributions`). Any root-tileset error, 25+ tile errors with nothing loaded, or an exception in update tears the view down, restores the world, and shows a notice ("Real-world 3D view turned off: ..."; 401/403 messages point at key, billing and restrictions). It then calls `onFail`.
- `src/ui/settings.js`: `googleTiles: false` default; `sanitizeSettings` keeps it only if `=== true`.
- `src/ui/menus.js` + `menus.css`: new row "Real-world 3D view (Google)" with a hint. When `opts.googleTilesAvailable` is false the checkbox is disabled, with the hint "Needs VITE_GOOGLE_MAPS_API_KEY in .env.local (see .env.example)". New `menus.setSettings(s)` updates the UI without firing `onSettings`.
- `src/main.js`: creates the controller and passes `googleTilesAvailable`. It calls `setEnabled(settings.googleTiles)` at boot and in `onSettings`. On failure it sets `googleTiles=false`, saves, and updates the menu. The local-music code is unchanged.
- `package.json`: `"3d-tiles-renderer": "0.5.3"` (exact; released 2026-09-18; peer three >=0.167, all peers optional; 0.5.4 is under two weeks old). `package-lock.json` updated by npm.
- `.env.example` (new): key setup and restriction steps. `.gitignore`: added `!.env.example` (`.env.*` already covered `.env.local` but would also have ignored `.env.example`).

## Verification

- Node transform check (scratchpad script, imports `GoogleTiles.js` + `three`):
  - Origin maps to (0, 0, 0).
  - 100 m E / 100 m N in the map's projection maps to (100.005, -0.002, -100.006).
  - 1 km W / 1 km S, +50 m maps to (-1000.18, 49.84, 1000.006).
  - With projection matching off, the library's `WGS84_ELLIPSOID.getEastNorthUpFrame` ENU(100, 100, 5) maps to exactly (100, 5, -100).
  - ECEF agrees with the library to 1.5e-9 m. PASS.
- `npx vite --port 5196` + `tools/qa/smoke.mjs` with a steps script, no key, `googleTiles:true` forced into localStorage:
  - 0 page errors.
  - Toggle `disabled: true`, `checked: false`, hint shown.
  - Match reaches the `drop` state.
  - **0 requests** to googleapis/gstatic/google.com, and the 3d-tiles-renderer chunk is never requested.
  - The console errors seen (ToonMaterial shader VALIDATE_STATUS) come from another agent's in-progress `src/render/Toon.js` work, not this change.
- Failure path, second server with `VITE_GOOGLE_MAPS_API_KEY=fake-test-key` and Playwright aborting every googleapis/gstatic request (no real contact with Google):
  - Toggle enabled.
  - Library loaded only after enabling.
  - The root request failed, and the notice "Real-world 3D view turned off: Could not reach Google 3D Tiles: Failed to fetch" appeared.
  - The world stayed visible, the match continued (`drop`), the saved setting reverted to false, and there were 0 page errors.
- `vite build` (to scratch outDir): succeeds. The library is split into lazy chunks. With no key the bundle contains no key: `import.meta.env` is inlined without `VITE_GOOGLE_MAPS_API_KEY`.
- Both servers stopped.

## Limitations / notes for others

- Not tested with a real key, so actual tile alignment and the calibration result are unverified. If the ground is off, use `?gtilesOffset=` or `?gtilesHeight=`.
- Attribution shows the word "Google" in text plus the data credits. For anything public, Google's policy asks for the official Google Maps logo. `GoogleCloudAuthPlugin` supports `logoUrl` if a logo asset is added later.
- Tiles are drawn with the scene's fog and camera far plane (3000 m), so distant tiles fade like the rest of the world. They are photo textures, not toon-shaded, so the mix with the characters is a stylistic clash by nature.
- For wave 2 (agent B, WorldMeshes): keep every world mesh under `view.root`, or name new scene-level groups `world` / tag instancers with `userData.cx/cz`. Otherwise they will not be hidden in this mode. Exposing `world.terrainHeight(x, z)` lets calibration match the heightfield.
- No Game.js change was needed.
- Map Tiles API usage is billed. Each enable creates a session (root request) and streams tiles while the camera moves.
