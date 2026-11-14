// BENTONVILLE ROYALE — persisted player settings.

export const SETTINGS_KEY = 'bentonville-royale.settings.v1';

export const DEFAULT_SETTINGS = Object.freeze({
  sensitivity: 1, // 0.2 .. 3
  quality: 'medium', // 'low' | 'medium' | 'high'
  volume: 0.7, // 0 .. 1
  invertY: false,
  difficulty: 'normal', // 'easy' | 'normal' | 'hard'
  googleTiles: false, // optional Google Photorealistic 3D Tiles view (needs VITE_GOOGLE_MAPS_API_KEY)
});

export const QUALITY_OPTIONS = ['low', 'medium', 'high'];
export const DIFFICULTY_OPTIONS = ['easy', 'normal', 'hard'];

const num = (v, lo, hi, fallback) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

/** Returns a clean settings object no matter what was passed in. */
export function sanitizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_SETTINGS;
  return {
    sensitivity: num(s.sensitivity, 0.2, 3, d.sensitivity),
    quality: QUALITY_OPTIONS.includes(s.quality) ? s.quality : d.quality,
    volume: num(s.volume, 0, 1, d.volume),
    invertY: typeof s.invertY === 'boolean' ? s.invertY : d.invertY,
    difficulty: DIFFICULTY_OPTIONS.includes(s.difficulty) ? s.difficulty : d.difficulty,
    googleTiles: s.googleTiles === true,
  };
}

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) return sanitizeSettings(JSON.parse(raw));
  } catch (err) {
    /* private mode / blocked storage / bad JSON: fall through to defaults */
  }
  return sanitizeSettings(null);
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
    return true;
  } catch (err) {
    return false;
  }
}
