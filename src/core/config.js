// BENTONVILLE ROYALE — tunables shared by every game system.
//
// World conventions (same as the map data): meters, x = east, z = SOUTH
// (north is -z), y up. A `heading` is radians, 0 = facing north, increasing
// clockwise (east = PI/2); forward = (sin h, 0, -cos h).

export const TAU = Math.PI * 2;

export const PLAYER = {
  radius: 0.42,
  height: 1.8,
  eyeHeight: 1.55,
  walkSpeed: 4.6,
  runSpeed: 6.6,
  sprintSpeed: 8.8,
  accelGround: 60,
  accelAir: 14,
  gravity: 30,
  jumpSpeed: 9.6,
  stepHeight: 0.62,
  maxHealth: 100,
  maxShield: 100,
  glideFallSpeed: 13,
  glideSpeed: 19,
  dropHeight: 130,
  matCap: 999,
};

export const CAMERA = {
  fov: 68,
  near: 0.3,
  far: 3000,
  distance: 4.4,
  shoulder: 0.75,
  pivotHeight: 1.55,
  rise: 0.25,
  minPitch: -1.35,
  maxPitch: 1.25,
};

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR = {
  common: 0x9aa3ad,
  uncommon: 0x4ec04a,
  rare: 0x3b9cff,
  epic: 0xb05cff,
  legendary: 0xffb52e,
};
export const RARITY_DAMAGE = { common: 1, uncommon: 1.05, rare: 1.1, epic: 1.16, legendary: 1.22 };

// Ammo pools. Every gun draws from exactly one.
export const AMMO = {
  light: { name: 'Light Rounds', pickup: 30 },
  medium: { name: 'Medium Rounds', pickup: 30 },
  shells: { name: 'Shells', pickup: 8 },
  heavy: { name: 'Heavy Rounds', pickup: 6 },
};

// spread values are half-angles in radians. `bloom` is added per shot and
// decays; moving/jumping multiplies the total.
export const WEAPONS = {
  rifle: {
    id: 'rifle', name: 'Ranger Rifle', icon: 'rifle', model: 'rifle', sound: 'shot_rifle', ammo: 'medium',
    damage: 30, headMult: 1.6, rate: 5.6, auto: true, mag: 30, reload: 2.2,
    spread: 0.006, bloom: 0.0045, maxBloom: 0.03, pellets: 1, range: 280, falloffStart: 60, falloffEnd: 160, minFalloff: 0.65,
    zoom: 0.72, twoHanded: true, botRange: 75, tracer: 0xfff0b0,
  },
  smg: {
    id: 'smg', name: 'Hornet SMG', icon: 'smg', model: 'smg', sound: 'shot_smg', ammo: 'light',
    damage: 17, headMult: 1.5, rate: 11.5, auto: true, mag: 30, reload: 2.0,
    spread: 0.012, bloom: 0.004, maxBloom: 0.04, pellets: 1, range: 180, falloffStart: 25, falloffEnd: 70, minFalloff: 0.5,
    zoom: 0.8, twoHanded: true, botRange: 35, tracer: 0xffe9a0,
  },
  shotgun: {
    id: 'shotgun', name: 'Thumper Shotgun', icon: 'shotgun', model: 'shotgun', sound: 'shot_shotgun', ammo: 'shells',
    damage: 10, headMult: 1.4, rate: 1.05, auto: false, mag: 5, reload: 3.4,
    spread: 0.05, bloom: 0, maxBloom: 0, pellets: 9, range: 70, falloffStart: 8, falloffEnd: 30, minFalloff: 0.25,
    zoom: 0.86, twoHanded: true, botRange: 14, tracer: 0xffd890,
  },
  sniper: {
    id: 'sniper', name: 'Longshot Sniper', icon: 'sniper', model: 'sniper', sound: 'shot_sniper', ammo: 'heavy',
    damage: 105, headMult: 2.2, rate: 0.75, auto: false, mag: 3, reload: 2.9,
    spread: 0.0008, bloom: 0, maxBloom: 0, pellets: 1, range: 600, falloffStart: 600, falloffEnd: 600, minFalloff: 1,
    hipSpread: 0.03, zoom: 0.3, twoHanded: true, botRange: 130, tracer: 0xd8f4ff,
  },
  pistol: {
    id: 'pistol', name: 'Sidekick Pistol', icon: 'pistol', model: 'pistol', sound: 'shot_pistol', ammo: 'light',
    damage: 24, headMult: 1.6, rate: 5.2, auto: false, mag: 14, reload: 1.4,
    spread: 0.008, bloom: 0.006, maxBloom: 0.035, pellets: 1, range: 200, falloffStart: 30, falloffEnd: 90, minFalloff: 0.55,
    zoom: 0.8, twoHanded: false, botRange: 40, tracer: 0xfff0b0,
  },
};
export const WEAPON_IDS = Object.keys(WEAPONS);

export const CONSUMABLES = {
  medkit: { id: 'medkit', name: 'Med Kit', icon: 'medkit', model: 'medkit', rarity: 'uncommon', useTime: 3.2, heal: 60, shield: 0, stack: 3, sound: 'heal' },
  tonic: { id: 'tonic', name: 'Shield Tonic', icon: 'potion', model: 'potion', rarity: 'rare', useTime: 2.4, heal: 0, shield: 50, stack: 3, sound: 'drink_shield' },
};

export const PICKAXE = {
  damage: 20, // to characters
  rate: 1.9, // swings per second
  range: 3.1,
  harvest: 50, // damage to harvestables per swing
};

export const MATERIALS = ['wood', 'brick', 'metal'];
export const MATERIAL_COLOR = { wood: 0xb9803f, brick: 0xb5533c, metal: 0x8d99a6 };

// Player-built pieces.
export const BUILD = {
  cell: 4,
  level: 3,
  cost: 10,
  hp: { wood: 150, brick: 260, metal: 380 },
  pieces: ['wall', 'floor', 'ramp', 'cone'],
  maxPieces: 900,
};

// The storm: `wait` seconds holding, then `shrink` seconds closing to `radius`.
export const STORM = {
  startRadius: 620,
  phases: [
    { wait: 55, shrink: 55, radius: 340, dps: 1 },
    { wait: 40, shrink: 45, radius: 180, dps: 2 },
    { wait: 35, shrink: 35, radius: 90, dps: 3 },
    { wait: 25, shrink: 30, radius: 40, dps: 5 },
    { wait: 20, shrink: 25, radius: 14, dps: 8 },
    { wait: 12, shrink: 25, radius: 0, dps: 10 },
  ],
};

export const MATCH = {
  bots: 31,
  chests: 70,
  floorLoot: 110,
  ammoBoxes: 45,
};

export const DIFFICULTY = {
  easy: { aimError: 0.085, reaction: 0.9, burst: 0.55, buildChance: 0.15, sight: 80, damageScale: 0.6 },
  normal: { aimError: 0.05, reaction: 0.55, burst: 0.7, buildChance: 0.4, sight: 100, damageScale: 0.8 },
  hard: { aimError: 0.028, reaction: 0.3, burst: 0.85, buildChance: 0.7, sight: 125, damageScale: 1 },
};

// outline / bloom: post passes (render/Post.js); both off = plain render (cheapest).
// renderScale multiplies the device pixel ratio (internal resolution).
export const QUALITY = {
  low: { pixelRatio: 1, renderScale: 1, outline: false, bloom: false, buildingDist: 1100, treeDist: 380, propDist: 160, charDist: 160 },
  medium: { pixelRatio: 1.5, renderScale: 1, outline: true, bloom: true, buildingDist: 1700, treeDist: 620, propDist: 260, charDist: 240 },
  high: { pixelRatio: 2, renderScale: 1, outline: true, bloom: true, buildingDist: 2400, treeDist: 950, propDist: 380, charDist: 320 },
};

// Drop zones: each match the first circle is centred near one of these.
// Keys match `landmarks` in the map data.
export const DROP_ZONES = [
  { key: 'square', label: 'Downtown Square' },
  { key: 'crystal_bridges', label: 'Crystal Bridges' },
  { key: 'momentary', label: 'The Momentary' },
  { key: 'market_8th', label: '8th Street Market' },
  { key: 'compton_gardens', label: 'Compton Gardens' },
  { key: 'memorial_park', label: 'Memorial Park' },
  { key: 'home_office', label: 'Home Office' },
];

export const BOT_NAMES = [
  'OzarkOtter', 'TrailMix', 'SquareDancer', 'CreekWader', 'PawpawPete', 'BluffRunner', 'DogwoodDee', 'GravelGrinder',
  'PorchSwing', 'HoneyBiscuit', 'MuddyBoots', 'FireflyFinn', 'SwitchbackSue', 'TaterTot', 'RedDirtRay', 'CicadaSong',
  'HickoryHank', 'LimestoneLou', 'SweetTeaTess', 'BanjoBlue', 'CrawdadCal', 'MossyOak', 'SundaySkillet', 'PedalPusher',
  'HollerHero', 'QuartzQuinn', 'RidgeRascal', 'PecanPie', 'ThunderGap', 'FoxfireFay', 'CopperCreek', 'WillowWisp',
  'DustyTrail', 'MapleMoon', 'BramblePatch', 'SkipperStone', 'LanternJack', 'PrairiePip', 'CedarSmoke', 'RiverRook',
];

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

/** Shortest signed angle from a to b. */
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d < -Math.PI) d += TAU;
  return d;
}

/** Small seedable PRNG (mulberry32). */
export function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
