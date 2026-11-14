# Build OSM map data pipeline
Model: claude-fable-5-2. Type: general-purpose background agent (relaunched 2026-11-14 to finish the task the first session's agent left half done).

The JSON exists, passes every check, and all 11 landmarks are found.

**File:** `public/data/bentonville-osm.json`, 1,594,033 bytes (1.59 MB). Nothing was dropped for size. The schema is unchanged from what `scripts/fetch-map-data.mjs` documented.

## Download
- The main OSM API worked first try: 21 requests (20 tiles + 1 relation completion), no retries, no tile splits, no Overpass fallback.
- Raw data: 72,214 nodes, 10,309 ways, 157 relations, cached in `data-raw/` (gitignored).
- Download timestamp: 2026-11-14T19:44:30.306Z.

## Counts
| Item | Count |
|---|---|
| buildings | 4712 |
| roads | 4660 |
| areas | 250 |
| waterways | 126 |
| trees | 236 |
| pois | 295 |
| landmarks found | 11 of 11 |

- **Buildings:** 2829 wood, 1660 brick, 223 metal; 136 named. Heights 3.9 to 22 m (median 4.6). 51 left out (29 centred outside the bbox, 22 under 8 m²).
- **Roads:** footway 1625, service 1426, cycleway 699, residential 383, path 164, secondary 111, tertiary 110, primary 50, steps 43, unclassified 31, primary_link 10, pedestrian 6, secondary_link 2.
- **Areas:** parking 74, pitch 61, park 40, grass 28, water 27, garden 13, wood 7.
- **Trees:** all 236 are individual OSM tree nodes; tree cover in the data is sparse.
- **`meta.bounds`:** minX -1908.2, maxX 1723, minZ -3006.8, maxZ 1990.6 (3631 m x 4997 m).

## Landmarks (x east, z south, metres)
| Key | x | z | r | Building ids | Matched on |
|---|---|---|---|---|---|
| square | 32.4 | 28 | 39 | 0 | park polygon "Bentonville City Square" |
| courthouse | 98.1 | 35.8 | 81 | 2 | courthouse node, east side of the square |
| walmart_museum | -25.7 | 39.9 | 19 | 1 | building "Walmart Museum" |
| crystal_bridges | 470.3 | -1090.7 | 187 | 1 | museum building relation |
| momentary | 557.5 | 696.4 | 68 | 1 | building "The Momentary" |
| market_8th | 796.1 | 837.7 | 80 | 1 | building "8th Street Market" |
| home_office | 1377.3 | 1031.9 | 897 | 34 | campus polygon "Walmart Home Office" |
| slaughter_pen | 363.5 | -2046 | 736 | 0 | 109 trail ways |
| compton_gardens | 95.2 | -394.5 | 152 | 2 | garden polygon "Compton Gardens" |
| memorial_park | 1454 | -367.8 | 329 | 0 | park polygon "Memorial Park" |
| greenway | 284.4 | 7.9 | 1318 | 0 | 41 trail ways |

## Checks run (all pass)
`node data-raw/verify.mjs public/data/bentonville-osm.json`
- JSON parses; all 8 top-level keys present; `meta.counts` equals the array lengths.
- Every building ring: at least 3 points, finite numbers, negative shoelace sum, no zero area, no repeated points, no self-intersection. Heights within 3..40. No duplicate buildings.
- Roads, areas, waterways, trees, pois well-formed. Every landmark building id exists.
- Two consecutive cache-only runs give identical SHA-1 for the JSON and the credits file.

## Script changes (`scripts/fetch-map-data.mjs`)
The script ran cleanly as written; these are correctness fixes, and no rate limit was touched.
1. Memorial Park was MISSING because the park straddles the east bbox edge. Polygons are now clipped to the bbox and positioned at the centroid of the in-map part (this also moved `home_office`).
2. Slaughter Pen had landed on a trailhead node by Compton Gardens. Line landmarks now follow route_master → route → way nesting.
3. A node-type landmark now also picks up the building it stands in (courthouse ids).
4. POIs use the same clipped position (net +2).
5. Line landmarks only use ways that are in `roads`.
6. Output is written to a temp file and renamed.
7. Console line reporting why buildings were left out; header usage notes.

## Not verified / known limits
- Nothing was rendered; verification is numeric plus general knowledge of Bentonville.
- Projection constants make distances about 0.35% short north–south and 0.12% short east–west.
- 3304 buildings are tagged only `building=yes`; heights and materials are inferred.
- Multipolygon holes are ignored. No bridge/tunnel/layer flag on roads.
- "Slaughter Pen MTB Park" is one very large park polygon covering much of the north of the map.

Credits: `credits/map-data.md` (© OpenStreetMap contributors, ODbL 1.0, download timestamp and bbox).
