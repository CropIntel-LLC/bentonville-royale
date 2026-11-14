# src/audio — synthesized sound plus recorded weapon samples

`Sfx.js` builds every sound at runtime with the Web Audio API: oscillators, noise buffers, filters and envelopes. On top of that, the weapon and impact sounds have optional **recorded samples** (CC0, from Freesound; see `credits/audio.md`) in `public/assets/sfx/`. When a sample is decoded it is used; when it is missing, still loading or fails to decode, the synth recipe plays instead, so the game never goes silent.

## Recorded samples

- A `def()` entry may carry `sample: [urls]` (round-robin variants) or `sample: { key: [urls], default: [urls] }` with `sampleBy: '<opt name>'` to pick a set from the `play()` options, plus `sgain` (gain applied to the sample to balance it against the synth).
- Loading: `unlock()` creates the AudioContext and then fetches and decodes every sample (`fetch` + `decodeAudioData`). The game can call `sfx.preloadSamples()` earlier (e.g. during the loading screen) to download the bytes before the first click; decoding then happens on unlock. It resolves (never rejects) with `sampleInfo()`.
- Playback: an `AudioBufferSourceNode` with `playbackRate` = the usual pitch x random variance, routed through the same voice gain, distance lowpass (far shots lose their top end), stereo pan, 25 ms same-name throttle and voice stealing as the synth voices. Variants rotate with a random skip so rapid fire does not repeat the same file.
- Inspection: `sfx.sampleInfo()` -> `{ total, ok, pending, failed, errors, played, synth }`; `sfx.stats` -> `{ sample, synth, last }` counts how one-shots were rendered.

| Sound | Sample set (files `public/assets/sfx/<stem>_<n>.mp3`) | Option |
| --- | --- | --- |
| `shot_rifle` / `shot_smg` / `shot_shotgun` / `shot_sniper` / `shot_pistol` | `rifle_1-3`, `smg_1-3`, `shotgun_1-3`, `sniper_1-3`, `pistol_1-3` | |
| `reload` | `reload_1-2`; `pump_1-3` when `{ weapon: 'shotgun' }` | `weapon` |
| `shotgun_pump` (new) | `pump_1-3` | |
| `empty_click` / `weapon_switch` | `empty_1-2` / `equip_1-3` | |
| `bullet_impact` | `impact_wood_1-3`, `impact_stone_1-3` (also `brick`, `concrete`, `dirt`; the default), `impact_metal_1-2`, `impact_body_1-2` (also `flesh`) | `surface` |
| `swing` / `hit_wood` / `hit_stone` / `hit_metal` | `swing_1-2` / `harvest_wood_1-3` / `harvest_stone_1-3` / `harvest_metal_1-2` | |

All other sounds (UI, movement, storm, build, loops and the synth music) are synthesized only. `setCustomMusic` streams a local music file through an HTML audio element and is separate from the sample loader.

```js
import { sfx } from './audio/Sfx.js';
sfx.autoUnlock(window);                                   // or sfx.unlock() inside a user gesture
sfx.setListener(cam.x, cam.y, cam.z, fwdX, fwdZ);         // every frame
sfx.play('shot_rifle', { x, y, z });                      // positional one-shot
sfx.play('ui_click');                                     // non-positional (UI)
sfx.startLoop('storm_wind'); sfx.setLoopGain('storm_wind', 0.6); sfx.stopLoop('storm_wind');
sfx.playMusic('menu'); sfx.stopMusic();
```

Every public method is a silent no-op that never throws when audio is unavailable or still locked. The last swallowed error is in `sfx.lastError`. Set `sfx.config.debug = true` to log those errors.

## API

| Method | Notes |
| --- | --- |
| `unlock()` | Creates or resumes the AudioContext. Call it from a user gesture. Safe to repeat. |
| `autoUnlock(target = window)` | Unlocks on the first `pointerdown`, `keydown` or `touchend`. |
| `setVolume(0..1)`, `setMuted(bool)`, `setMusicVolume(0..1)` | Master volume uses a squared taper. |
| `setListener(x, y, z, forwardX, forwardZ)` | Sets the listener position and horizontal facing. |
| `play(name, opts)` | `opts`: `{ x, y, z }` for a positional sound (omit for UI), `volume`, `pitch`. Some sounds take extras: `weakpoint { step: 0..7 }`, `footstep { surface: 'grass' \| 'road' \| 'wood' }`, `countdown_beep { final: true }`, `bullet_impact { surface: 'wood' | 'stone' | 'brick' | 'metal' | 'body' }`, `reload { weapon: 'shotgun' }`. Returns true if a voice started. |
| `startLoop(name, opts)` / `stopLoop(name, id?)` / `setLoopGain(name, 0..1, id?)` | `opts`: `{ id, x, y, z, volume }`. `chest_hum` is positional: give each chest an `id`, and only the nearest 4 are synthesized. |
| `playMusic(name)` / `stopMusic()` / `musicPlaying` | `menu` loops. `victory` and `defeat` play once. |
| `preloadSamples()` | Fetch (and, once unlocked, decode) the recorded samples. Optional; `unlock()` does it too. |
| `sampleInfo()`, `stats` | Sample loading state and sample/synth playback counters. |
| `has(name)`, `voiceCount`, `muted` | Inspection helpers. |
| `Sfx.offline({ seconds })` | Engine bound to an OfflineAudioContext, for tests and measurement. It does not load samples by itself; `await e.preloadSamples()` first to test them. |
| `dispose()` | Stops everything and closes the context. |

Limits: 24 one-shot voices (loops and music don't count toward this). Repeats of the same name within 25 ms are dropped. Pan width is 0.85.

## Names

Also exported as `SOUND_NAMES`, `LOOP_NAMES` and `MUSIC_NAMES`.

**One-shots (`play`)**

- Weapons: `shot_rifle`, `shot_smg`, `shot_shotgun`, `shot_sniper`, `shot_pistol`, `reload`, `shotgun_pump`, `empty_click`, `weapon_switch`
- Hits: `bullet_impact`, `hitmarker`, `headshot`, `elimination`, `shield_break`, `hurt`, `death`
- Harvest and build: `swing`, `hit_wood`, `hit_stone`, `hit_metal`, `weakpoint`, `tree_fall`, `building_collapse`, `build_wood`, `build_stone`, `build_metal`, `build_break`, `build_denied`
- Loot and items: `pickup`, `pickup_ammo`, `chest_open`, `drink_shield`, `heal`
- Movement: `footstep`, `jump`, `land`
- Storm and match: `zone_enter`, `storm_warning`, `storm_tick`, `countdown_beep`
- UI: `ui_click`, `ui_hover`

**Loops (`startLoop`)**: `chest_hum` (positional, per id), `storm_wind`, `glide_wind`

**Music (`playMusic`)**: `menu` (loops), `victory`, `defeat`

## Where the game uses it

- `src/main.js` calls `autoUnlock`, starts the `menu` music, and plays `ui_click`/`ui_hover` for menu buttons.
- `src/game/Game.js` sets the listener and handles the `storm_wind` gain, `glide_wind`, `victory`/`defeat` music, and the hurt, hitmarker and headshot sounds.
- `src/game/Player.js` plays footsteps, jump and land, reloads, the empty click, weapon switches, consumables and pickups.
- `src/game/Combat.js` plays gunshots, impacts, harvest hits, tree falls and collapses, shield breaks and eliminations.
- Loot, Structures and Bots call `sfx` directly for chests, building and their own actions.

`sfx-demo.html` in this folder is a standalone page that plays every sound.
