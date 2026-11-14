# Wave 1 / C: cartoon art pass

Status: **DONE**. Nothing committed. The dev server on port 5194 is stopped.

The look is original: bright, saturated colours, cel (toon) shading, ink outlines, a soft bloom, a punchy sky with puffy clouds, and crisp shadows. No outside game assets or branding were used.

## What changed

### `src/render/Toon.js` (new)
- **`toonGradient()`**: a shared 64×1 gradient texture (RedFormat, NearestFilter) with three bands.
  - Faces turned away from the sun get 0, so self-shadow matches cast shadow.
  - A terminator band at 0.42, then fully lit (1.0).
  - The hemisphere fill lights the dark side.
- **`toToon(material, opts)`** converts Standard, Physical, Lambert, Phong and Basic materials to `MeshToonMaterial`.
  - It copies:
    - map and colour (metals are darkened slightly)
    - vertexColors
    - emissive, emissiveMap and emissiveIntensity
    - alphaMap, aoMap and lightMap
    - transparent, opacity, alphaTest and alphaToCoverage
    - side and shadowSide
    - depthTest and depthWrite, blending, colorWrite
    - polygonOffset, fog, toneMapped, visible, wireframe, userData
    - user `defines` (STANDARD and PHYSICAL are removed, because copying them broke the shader)
    - **`onBeforeCompile`**, and `customProgramCacheKey` (prefixed `toon|`)
  - Skinning and instancing need nothing extra.
  - It returns ShaderMaterial, toon, line, point and sprite materials unchanged, and converts arrays element-wise.
  - Results are cached per source material and options, so a shared material stays shared.
  - Options: `saturate`, `lighten`, `keepBasic`, `normalMap` (normal and bump maps are dropped by default) and `dispose`.
- **`toonize(root, opts)`** converts every mesh under an object in place.
- **`boostColor(color, saturate, lighten)`**: an HSL helper that adjusts saturation and lightness.

### `src/render/Post.js` (new): the `Post` class
- **Pipeline:**
  - **RenderPass:** half-float, linear target with a `DepthTexture`.
  - **InkPass:** a custom Pass.
  - **UnrealBloomPass:** strength 0.32, radius 0.55, threshold 0.92 (linear HDR). Only the sun, effects and hot highlights bloom.
  - **OutputPass:** tone mapping and sRGB conversion.
  - **FXAAPass.**
- **InkPass:**
  - It uses only the depth buffer and draws no second scene pass, so InstancedMesh, SkinnedMesh and vertex-shader-displaced geometry (clouds, debris) are all handled.
  - It takes the Laplacian of 1/viewZ, which is zero on any plane. Only the positive side is kept, so a one-sided line falls on the nearer object at silhouettes and convex creases.
  - Two radii are sampled (1.4 px and 2.8 px at 720p, scaled with resolution).
  - Lines fade between 220 and 650 m and with the scene's FogExp2 density.
  - Ink colour is the surface colour multiplied by a dark violet.
- **No MSAA on the post path:**
  - On ANGLE/Metal a multisampled target does not resolve into the depth texture. I verified this: there were no outlines at msaa 4.
  - MSAA on the half-float target also cost about 6 ms per frame, so the default is single-sample plus FXAA.
- **`render()` falls back** to a plain `renderer.render()` when the preset has outline and bloom both off (low).
- **API:** `render(scene, cam, dt)`, `setSize`, `setPixelRatio`, `configure({outline, bloom, msaa, fogDensity})` and `dispose`.

### Where toon materials are applied
- **`src/core/assets.js`:** `flattenModel(root, { toon = true })` converts each grouped material with `toToon(m, { saturate: 1.18 })` (line 87). This covers world trees, props and vehicles through WorldMeshes, and loot and chests.
- **`src/game/Character.js`:**
  - Body meshes at :77.
  - Held weapons and pickaxe at :120 (`saturate: 1.2`).
  - The glider canopy at :146.
- **`src/game/Structures.js:180`:** `makeMaterial` returns `toToon(m, { dispose: true })`. The crack patch still hooks `<map_fragment>`.
- **`src/game/Loot.js:145`:** the box fallback material.
- **`src/render/Effects.js:966`:** debris uses `MeshToonMaterial` with `toonGradient()`.
  - The existing patch hooks `<beginnormal_vertex>`, `<begin_vertex>`, `<color_fragment>` and `<emissivemap_fragment>`, and all of these work.
  - The cache key is now `fx-debris-toon`.

### `src/game/Game.js`
- Imports `Post`.
- Creates `this.post` after the camera (:108).
- Both render calls go through `this.post.render` (:416 loading and :550 frame).
- `_applyPixelRatio` (:632) applies `min(dpr, q.pixelRatio) * q.renderScale` and reconfigures the post chain on quality change.
- `_resize` (:647) calls `post.setSize`.

### `src/core/config.js` `QUALITY`
Adds `renderScale`, `outline` and `bloom` to each preset:

| Preset | outline / bloom | renderScale |
|---|---|---|
| low | off (plain render) | 1 |
| medium | on | 1 |
| high | on | 1 |

### `src/render/Atmosphere.js`
- **New CLEAR palette:**
  - zenith `1565e8`, mid `46a2ff`, horizon and fog `c2e8ff`
  - fog density 0.00085
  - sun `fff0cf` at 2.45
  - hemisphere `c6e0ff` / `d8c39a` at 2.5
  - cloud shade `b9cdf2`
- **Clouds** are puffier: 6–9 rounder puffs, lower (300–500 m), a flatter base and smooth ellipsoid normals. The cloud shader is cel-banded: a hard sun terminator and a darker underside.
- **Shadow** `radius` is 0.8, down from 1.6, for crisper edges.
- **Header docs** cover the look and how tone mapping behaves on each path.
- **Post flags live in `config.js` `QUALITY` only.** The Atmosphere QUALITY table has no outline or bloom keys, because Atmosphere does not own the post chain and a second copy would drift.

## Tone mapping and the `toneMapped: false` shaders
- **Low (plain path):** unchanged. The renderer tone-maps lit materials, while the sky, clouds, wall and fog are display-referred.
- **Post path:**
  - Everything, including the sky, clouds, storm wall and fog, renders linear into the half-float target.
  - Their `<tonemapping_fragment>` and `<colorspace_fragment>` become no-ops in a render target, and OutputPass applies Neutral and sRGB to the whole frame.
  - Horizon and fog therefore get the same curve and still match with no seam.
  - Bright sky values are compressed slightly by Neutral. I checked the sky, horizon and storm wall in screenshots from inside and outside the storm, and they look right.
- **Effects** use `linearToOutputTexel`, which is linear inside the target, so they also look right.

## For B (wave 2): converting world materials in `WorldMeshes.js`
```js
import { toToon } from '../render/Toon.js';
const mat = toToon(new THREE.MeshLambertMaterial({ vertexColors: true }));        // plain
// building facade (patch hooks <common>, <begin_vertex>, <color_fragment>):
function buildingMaterial() {
  const base = new THREE.MeshLambertMaterial({ vertexColors: true });
  base.onBeforeCompile = (shader) => { /* unchanged patch */ };
  base.customProgramCacheKey = () => 'br-building-v3';
  return toToon(base, { dispose: true });   // onBeforeCompile + cache key are carried over
}
```
- **Chunks your patches can use:**
  - `MeshToonMaterial` has `<common>`, `<uv_vertex>`, `<color_vertex>`, `<begin_vertex>`, `<beginnormal_vertex>`, `<project_vertex>` and `<worldpos_vertex>`.
  - In the fragment shader it has `<map_fragment>`, `<color_fragment>`, `<alphatest_fragment>`, `<emissivemap_fragment>`, `<normal_fragment_begin>`, `<lights_fragment_begin>`, `<aomap_fragment>`, `<opaque_fragment>` and `<fog_fragment>`.
  - Patches can write `diffuseColor`, `totalEmissiveRadiance` and `normal`.
- **What patches must avoid:**
  - Do not use PBR-only symbols: `roughnessFactor`, `metalnessFactor`, `<roughnessmap_fragment>`, `<lights_physical_fragment>`.
  - Do not use `<lights_lambert_fragment>`.
  - Do not copy `STANDARD` or `PHYSICAL` defines; `toToon` strips them.
- **Bump the cache key** (e.g. `br-building-v3`) if the patch changes.
- **Other surfaces:**
  - Use `{ saturate: 1.1–1.2 }` for flat-coloured ground and roof colours if they look dull.
  - Ground and road decals (polygonOffset, depthWrite false) convert fine.
  - Ink only appears where depth jumps or folds, so terrain gets no lines except on hills seen in silhouette.
- **Already done:** `flattenModel` already returns toon materials, so trees, props and vehicles are converted. Pass `{ toon: false }` to opt out.
- **Concave junctions** (wall meets ground) get no ink by design. If you want a ground contact line, a darker plinth in the facade shader works better.

## Screenshots
All paths are under `/private/tmp/claude-501/-Users-havishkunchanapalli-bentonville-royale/76d35f36-f710-4ee7-a670-7738c2621938/scratchpad/art/`.
- **Before (medium, original look):** `before/01-medium-glide.png`, `02-medium-square.png`, `03-medium-square2.png`. The rest of the before run was lost when the disk filled.
- **After, medium (`final-medium/`):**
  - glide, square, square2, residential, park
  - char, bot
  - builds, loot
  - sun (bloom), storm-inside, storm-outside
  - Contact sheets: `v2/sheet.png` and `v3/sheet.png`.
- **After, low (`low/`)** and **high (`high/`):** glide, square, residential, park and builds. Side-by-side sheet: `lowhigh.png`.
- **Close-ups:**
  - `ab/crop.png`: ink on and off.
  - `v3/botcrop.png`: character close-up.
  - `final-medium/lootcrop2.png`: loot ink.
  - `debris/crop.png`: toon debris with ink.
- **Test scripts:** `shots.mjs` (the tour, with `Q=` and `ONLY=` environment variables), `ab.mjs` (A/B with evals) and `bench.js` (render cost).

## Performance
Measured headless on the M1 (ANGLE Metal) at 1280×720.
- **rAF FPS (vsync-capped at 60):**

  | Preset | glide | square | residential | park |
  |---|---|---|---|---|
  | medium | 60 | 60 | 60 | 60 |
  | high | 60 | 60 | 60 | 60 |
  | low | 60 | 60 | 60 | 52 (a one-off hitch right after teleport) |

- **Synchronous render cost** (render plus a 1 px `readPixels`, medium, mean of 40 frames):

  | Spot | plain | outline only | bloom only | full |
  |---|---|---|---|---|
  | square | 10.3 ms | 11.3 ms | 10.7 ms | 10.0 ms |
  | park | 7.8 ms | 8.4 ms | 9.9 ms | 9.8 ms |
  | residential | 8.4 ms | 10.2 ms | 12.7 ms | 13.7 ms |

  The full post chain costs about 0–5 ms over plain and stays under the 16.6 ms budget.
- **Before the FXAA switch,** bloom-only with MSAA 4 measured 15.4 ms.
- **Errors:** 0 page errors and 0 console errors in all final runs.

## Known issues and notes
- **Wall–ground junctions:** concave creases are not inked, so there is no line where a wall meets the ground. This is deliberate; the design note above suggests the alternative.
- **Dark surfaces:** ink is the surface colour multiplied by dark violet, so it is subtle on dark surfaces such as the asphalt behind loot.
- **Clouds** (300–500 m) fall mostly beyond the ink fade, so they read as soft rather than outlined. This was chosen on purpose.
- **Bloom** is subtle: the sun disc and effect glows bloom, but lit white walls barely do. Raise `UnrealBloomPass` strength in `Post._build` if more glow is wanted.
- **Low-quality sky:** the sky is not tone-mapped on low and is on medium and high, so it is very slightly brighter on low. Both look correct.
- **Loot and bot materials:** loot weapon models and the Character's held weapons get separate toon instances (saturation 1.18 vs 1.2). This is harmless.
- **Disk space:** the disk filled up during the session (ENOSPC at about 0 bytes free, later about 0.6–1.7 GB free). Keep screenshot runs small.
