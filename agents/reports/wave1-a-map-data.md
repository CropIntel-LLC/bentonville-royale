# Wave 1 A: real-world map data

Status: **cut off at 3:23pm America/Chicago** (usage limit, resets 5:20pm). The imagery shell job finished at 3:24pm after the agent died. This report was not rewritten by that agent.

On disk: terrain (`public/data/bentonville-terrain.bin` + `.json`), Overture heights merged into the OSM JSON, `public/data/bentonville-trees.json` (36,226 canopy points, fetched 2026-11-14T21:24:08Z), and `public/data/bentonville-ground.webp` (1489×2048). The game does not load them. `src/game/Game.js` still loads only `bentonville-osm.json`.

Done before the cutoff: terrain (3DEP), Overture heights merged, OSM tag extension. NAIP imagery landed after the agent was killed.

## Terrain: public/data/bentonville-terrain.{bin,json}
- Int16 LE, row-major, 910 cols x 1251 rows, cell 4 m, value = cm above baseElevation (388.3 m).
- Sample (r, c) is the grid POINT x = minX + c*4, z = minZ + r*4 (minX -1912, minZ -3008).
- Game height range -59.4..20.0 m (relief 79.4 m); square ~7 m, Crystal Bridges ~-30 m.

## OSM JSON additions (all additive)
- buildings[]: `hs` ('osm'|'overture'|'part'|'est'), `roof` ('flat'|'gable'|'hip'|...), optional `minH`, `roofH`, `colour`, `roofColour` (#rrggbb).
- 4034 of 4712 buildings now use Overture (Microsoft ML) heights; 18 OSM-tagged; 1 from parts.
- roads[]: optional `bridge: 1`, `tunnel: 1|'building_passage'`, `layer: int`.
- areas[].k adds residential, commercial, retail, industrial, farmland, meadow, scrub.
- new top-level `buildingParts[]`.
