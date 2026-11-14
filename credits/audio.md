# Audio credits

Every recorded sound in `public/assets/sfx/` comes from Freesound.org and is released under
**Creative Commons 0 (CC0 1.0, public domain dedication)**: https://creativecommons.org/publicdomain/zero/1.0/
Credit is not required; it is given here anyway. Each sound page was checked for the CC0 licence link
and for a description of how it was made (field recordings at a range, or Foley/edits made by the
uploader). No audio was taken or extracted from any commercial game. Everything else the game plays
(UI, music, loops, footsteps and so on) is synthesised at runtime in `src/audio/Sfx.js` and has no source file.

Source files were the Freesound "HQ preview" MP3s (public CDN, no login), i.e.
`https://cdn.freesound.org/previews/<id/1000>/<id>_<user id>-hq.mp3`.

Processing (scratch script, not shipped): decode, downmix to mono, 44.1 kHz, trim from the first
transient (or the stated start), short fade-in, squared fade-out tail, level-match the variants of a set
on their loudest 50 ms, normalise the set to a -1 dBFS peak, encode MP3 96 kb/s CBR mono (decodes in
Chrome, Safari and Firefox). 45 files, about 420 KB total.

Notes on specific sources:
- `smg_3.mp3` and `pistol_1.mp3` are cut from the same 9 mm pistol recording (the SMG cut is shorter).
- `harvest_stone_2/3` reuse the same recordings as `impact_stone_1/3`, with longer tails.
- `qubodup`'s sniper and reload sounds are his own mixes of his own CC0 recordings (made as
  replacements for the open-source game AssaultCube, not taken from it).

| File | Freesound sound | Source URL | Licence | Trim (start s, length s) |
| --- | --- | --- | --- | --- |
| `public/assets/sfx/rifle_1.mp3` | AR15 rifle shot by michorvath | https://freesound.org/people/michorvath/sounds/427596/ | CC0 1.0 | 0.074, 0.85 |
| `public/assets/sfx/rifle_2.mp3` | Rifle Gun Shot 01.wav by LilMati | https://freesound.org/people/LilMati/sounds/433858/ | CC0 1.0 | 0.0, 0.75 |
| `public/assets/sfx/rifle_3.mp3` | Rifle Gun Shot 02.wav by LilMati | https://freesound.org/people/LilMati/sounds/484036/ | CC0 1.0 | 0.0, 0.78 |
| `public/assets/sfx/smg_1.mp3` | Thompson SMG Shot by wadaltmon | https://freesound.org/people/wadaltmon/sounds/258198/ | CC0 1.0 | 0.005, 0.22 |
| `public/assets/sfx/smg_2.mp3` | Meaty Gunshot.wav by morganpurkis | https://freesound.org/people/morganpurkis/sounds/396316/ | CC0 1.0 | 0.0, 0.34 |
| `public/assets/sfx/smg_3.mp3` | 9mm pistol shot by michorvath | https://freesound.org/people/michorvath/sounds/427592/ | CC0 1.0 | 0.121, 0.42 |
| `public/assets/sfx/shotgun_1.mp3` | 20 gauge shotgun gunshot by michorvath | https://freesound.org/people/michorvath/sounds/427595/ | CC0 1.0 | 0.054, 1.0 |
| `public/assets/sfx/shotgun_2.mp3` | Shotgun Shot 01.wav by LilMati | https://freesound.org/people/LilMati/sounds/405504/ | CC0 1.0 | 0.057, 1.1 |
| `public/assets/sfx/shotgun_3.mp3` | Shotgun Shot 03.wav by LilMati | https://freesound.org/people/LilMati/sounds/473846/ | CC0 1.0 | 0.0, 1.1 |
| `public/assets/sfx/sniper_1.mp3` | Centerfire Rifle Gun Shot 01.wav by LilMati | https://freesound.org/people/LilMati/sounds/411567/ | CC0 1.0 | 0.011, 1.5 |
| `public/assets/sfx/sniper_2.mp3` | Centerfire Rifle Gun Shot 02.wav by LilMati | https://freesound.org/people/LilMati/sounds/483536/ | CC0 1.0 | 0.011, 1.45 |
| `public/assets/sfx/sniper_3.mp3` | FPS Sniper Shot by qubodup | https://freesound.org/people/qubodup/sounds/816114/ | CC0 1.0 | 0.0, 1.4 |
| `public/assets/sfx/pistol_1.mp3` | 9mm pistol shot by michorvath | https://freesound.org/people/michorvath/sounds/427592/ | CC0 1.0 | 0.121, 0.75 |
| `public/assets/sfx/pistol_2.mp3` | AR15 pistol shot by michorvath | https://freesound.org/people/michorvath/sounds/427598/ | CC0 1.0 | 0.028, 0.55 |
| `public/assets/sfx/pistol_3.mp3` | Single Pistol Gunshot 4.2.wav by morganpurkis | https://freesound.org/people/morganpurkis/sounds/391846/ | CC0 1.0 | 0.0, 0.55 |
| `public/assets/sfx/reload_1.mp3` | Assault Rifle Reload by qubodup | https://freesound.org/people/qubodup/sounds/815879/ | CC0 1.0 | 0.0, 1.85 |
| `public/assets/sfx/reload_2.mp3` | 9mm pistol load and chamber by michorvath | https://freesound.org/people/michorvath/sounds/427593/ | CC0 1.0 | 0.5, 1.55 |
| `public/assets/sfx/pump_1.mp3` | SXP_SHOTGUN_RACK_01 by dasBUTCHER84 | https://freesound.org/people/dasBUTCHER84/sounds/449614/ | CC0 1.0 | 0.0, 0.48 |
| `public/assets/sfx/pump_2.mp3` | Shotgun Rack Sample.wav by Krovi | https://freesound.org/people/Krovi/sounds/613801/ | CC0 1.0 | 0.042, 0.6 |
| `public/assets/sfx/pump_3.mp3` | shotgun_racking.wav by mtadder | https://freesound.org/people/mtadder/sounds/99217/ | CC0 1.0 | 0.124, 0.9 |
| `public/assets/sfx/empty_1.mp3` | A rifle being dry fired once by serøutōnin--deprivəd | https://freesound.org/people/ser%C3%B8ut%C5%8Dnin--depriv%C9%99d/sounds/725402/ | CC0 1.0 | 0.034, 0.2 |
| `public/assets/sfx/empty_2.mp3` | Rifle clip empty by michorvath | https://freesound.org/people/michorvath/sounds/427603/ | CC0 1.0 | 0.06, 0.3 |
| `public/assets/sfx/equip_1.mp3` | Rifle_Equip1 by BaggoNotes | https://freesound.org/people/BaggoNotes/sounds/784753/ | CC0 1.0 | 0.008, 0.2 |
| `public/assets/sfx/equip_2.mp3` | Weapon, Ready by LilMati | https://freesound.org/people/LilMati/sounds/448987/ | CC0 1.0 | 0.048, 0.15 |
| `public/assets/sfx/equip_3.mp3` | Generic Rifle Cock by GameWithBepis | https://freesound.org/people/GameWithBepis/sounds/561471/ | CC0 1.0 | 0.005, 0.45 |
| `public/assets/sfx/impact_wood_1.mp3` | Single rock hitting wood.wav by worthahep88 | https://freesound.org/people/worthahep88/sounds/319226/ | CC0 1.0 | 0.167, 0.217 |
| `public/assets/sfx/impact_wood_2.mp3` | Single Rock hitting wood 2.wav by worthahep88 | https://freesound.org/people/worthahep88/sounds/319228/ | CC0 1.0 | 0.089, 0.178 |
| `public/assets/sfx/impact_wood_3.mp3` | Wooden Thud (Mono) by Breviceps | https://freesound.org/people/Breviceps/sounds/449955/ | CC0 1.0 | 0.0, 0.4 |
| `public/assets/sfx/impact_stone_1.mp3` | Stone hit by CamoMano | https://freesound.org/people/CamoMano/sounds/431019/ | CC0 1.0 | 0.04, 0.25 |
| `public/assets/sfx/impact_stone_2.mp3` | Fast Collision by qubodup | https://freesound.org/people/qubodup/sounds/332056/ | CC0 1.0 | 0.0, 0.25 |
| `public/assets/sfx/impact_stone_3.mp3` | Concrete Hit  by dslrguide | https://freesound.org/people/dslrguide/sounds/321477/ | CC0 1.0 | 0.011, 0.3 |
| `public/assets/sfx/impact_metal_1.mp3` | HeavyBulletPing.mp3 by wilhellboy | https://freesound.org/people/wilhellboy/sounds/351371/ | CC0 1.0 | 0.037, 0.381 |
| `public/assets/sfx/impact_metal_2.mp3` | hit - metallic 01.wav by Anthousai | https://freesound.org/people/Anthousai/sounds/406562/ | CC0 1.0 | 0.0, 0.4 |
| `public/assets/sfx/impact_body_1.mp3` | Realistic Punch by JewTwinz | https://freesound.org/people/JewTwinz/sounds/244513/ | CC0 1.0 | 0.016, 0.25 |
| `public/assets/sfx/impact_body_2.mp3` | body_hit.wav by insanity54 | https://freesound.org/people/insanity54/sounds/276600/ | CC0 1.0 | 0.2, 0.13 |
| `public/assets/sfx/swing_1.mp3` | Whoosh by qubodup | https://freesound.org/people/qubodup/sounds/60013/ | CC0 1.0 | 0.0, 0.42 |
| `public/assets/sfx/swing_2.mp3` | Swing Woosh by Jofae | https://freesound.org/people/Jofae/sounds/389590/ | CC0 1.0 | 0.04, 0.18 |
| `public/assets/sfx/harvest_wood_1.mp3` | Chop.ogg by egomassive | https://freesound.org/people/egomassive/sounds/536736/ | CC0 1.0 | 0.071, 0.444 |
| `public/assets/sfx/harvest_wood_2.mp3` | Axe Chop.mp3 by Evcy | https://freesound.org/people/Evcy/sounds/583272/ | CC0 1.0 | 0.06, 0.117 |
| `public/assets/sfx/harvest_wood_3.mp3` | Wood Chop 9.wav by wavecal22 | https://freesound.org/people/wavecal22/sounds/537434/ | CC0 1.0 | 0.33, 0.29 |
| `public/assets/sfx/harvest_stone_1.mp3` | Pickaxe #2.wav by abstraktgeneriert | https://freesound.org/people/abstraktgeneriert/sounds/233630/ | CC0 1.0 | 0.278, 0.522 |
| `public/assets/sfx/harvest_stone_2.mp3` | Stone hit by CamoMano | https://freesound.org/people/CamoMano/sounds/431019/ | CC0 1.0 | 0.04, 0.3 |
| `public/assets/sfx/harvest_stone_3.mp3` | Concrete Hit  by dslrguide | https://freesound.org/people/dslrguide/sounds/321477/ | CC0 1.0 | 0.011, 0.45 |
| `public/assets/sfx/harvest_metal_1.mp3` | Anvil Hit 2 by michorvath | https://freesound.org/people/michorvath/sounds/270588/ | CC0 1.0 | 0.417, 0.75 |
| `public/assets/sfx/harvest_metal_2.mp3` | Pickaxe3 by NoisyRedFox | https://freesound.org/people/NoisyRedFox/sounds/760567/ | CC0 1.0 | 0.005, 0.159 |
