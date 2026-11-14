# Download nature and city assets
Agent id: `agent-a2086cde19c24c4a1`
Model: claude-fable-5-2. Type: general-purpose background agent.
34 CC0 models are installed under `/Users/shehryarahmed/Bentonville_Royale/public/assets/{nature,vehicles,props}/` (about 1.7 MB total), each folder with a `manifest.json`, plus `credits/environment.md`. All pass glTF-Validator with 0 errors; nothing was loaded in Three.js.

**Sources and licence evidence** (github.com and kenney.nl are blocked, so everything came via jsDelivr)
- **Kenney, via Hidencod/tge-assets:** `_dl/environment/kenney/LICENSE` says "All models in this repository were created by Kenney (www.kenney.nl) and are released under Creative Commons Zero (CC0 1.0 Universal)". This is the mirror's own statement; it ships no original Kenney `License.txt`, and the kenney.nl cross-check was not possible.
- **KayKit City Builder Bits:** `_dl/environment/kaykit/LICENSE.txt` says "License: (Creative Commons Zero, CC0)". Used only for the hydrant.

**Files** (all +Y up, origin at base; sizes in model units)
- **Nature** (1 mesh, 1–3 flat-colour materials, no textures):
  - trees a–d: 1.71 / 1.23 / 1.33 / 1.15 high; 114 / 196 / 402 / 50 tris
  - pines a–b: 1.55 / 1.53 high; 230 / 78 tris
  - bushes a–b: 0.24 / 0.36 high; 32 / 104 tris
  - rocks a–c: 0.26 / 1.00 / 0.19 high; 80 / 136 / 16 tris
  - stump: 0.21 high; 56 tris
- **Vehicles** (1.5 wide, 2.55–3.25 long; 2032–2476 tris; body plus wheels = 5–6 meshes, 1 material): `sedan`, `suv`, `pickup`, `van`, `truck` (box truck).
- **Props** (16–234 tris, single mesh except `dumpster` with 3): `bench`, `streetlamp`, `streetlamp_curved`, `traffic_light`, `stop_sign`, `street_sign`, `trash_can`, `dumpster`, `fire_hydrant`, `fence`, `parasol`, `awning`, `tent`, `table`, `traffic_cone`, `barrier`, `planter`.

**Textures:** the small colormap PNG (11–12 KB; 20 KB for the hydrant) is embedded in each vehicle and city-prop GLB, so there are no external files. Nature, `tent`, `trash_can` and `table` use material colours only.

**Scale:** kits differ widely (lamp 0.6, tree 1.7, car 2.6 long), so each manifest entry carries `suggestedRealHeightM`, the axis it applies to (vehicles = length) and `suggestedUniformScale`.

**Edits I made:** on the Nature/Furniture files, JSON only — `metallicFactor` 1→0, removed a −0.05 Y offset, fixed an invalid scene root. The hydrant was packed from glTF into GLB.

**Not found under CC0:** mailbox, bike or bike rack, picnic table, a true market stall. `table` is a plain table; `parasol`, `awning` and `tent` stand in for a stall.

**Not verified:** `bench` (Graveyard Kit) and `trash_can` (an indoor bin) were not checked visually.
