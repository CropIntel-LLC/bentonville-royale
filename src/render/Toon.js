// BENTONVILLE ROYALE — toon (cel) shading helpers.
//
//   import { toToon, toonGradient, toonize } from '../render/Toon.js';
//
//   toToon(material, opts)  -> MeshToonMaterial (or the input, when it should not change)
//     Converts MeshStandard / MeshPhysical / MeshLambert / MeshPhong / MeshBasic materials
//     into a MeshToonMaterial that uses the shared stepped gradient. Copies map, color,
//     vertexColors, emissive (+map, intensity), transparent, opacity, side, alphaTest,
//     alphaMap, aoMap, lightMap, depthTest/Write, blending, polygonOffset, fog, toneMapped,
//     visible, name, userData, and the material's onBeforeCompile / customProgramCacheKey.
//     Skinning and instancing need nothing: three derives both from the object.
//     Arrays are converted element-wise. ShaderMaterial, toon, line, point and sprite
//     materials are returned unchanged. Results are cached per source material (and
//     options), so a material shared by many meshes stays shared after conversion.
//     opts:
//       saturate  number  colour saturation multiplier (HSL), default 1 (unchanged)
//       lighten   number  colour lightness offset (HSL, -1..1), default 0
//       keepBasic bool    leave MeshBasicMaterial untouched (unlit), default false
//       normalMap bool    keep normal / bump maps, default false (flatter, cleaner look)
//       dispose   bool    dispose the source material (not its textures), default false
//
//   toonize(object3D, opts) traverses an object and converts every mesh's material in
//     place with toToon(). Returns the object.
//
//   toonGradient()  the shared 1-D gradientMap (NearestFilter, RedFormat).
//
// onBeforeCompile patches keep working: MeshToonMaterial's shaders contain the usual
// chunks — vertex: <common>, <uv_vertex>, <color_vertex>, <begin_vertex>, <project_vertex>,
// <worldpos_vertex>; fragment: <common>, <map_fragment>, <color_fragment>,
// <alphamap_fragment>, <alphatest_fragment>, <emissivemap_fragment>, <normal_fragment_begin>,
// <lights_fragment_begin>, <aomap_fragment>, <opaque_fragment>, <fog_fragment>. Patches may
// write `diffuseColor`, `totalEmissiveRadiance`, `normal` as usual. They must NOT touch
// PBR-only symbols (`roughnessFactor`, `metalnessFactor`, `material.roughness`,
// <roughnessmap_fragment>, <metalnessmap_fragment>, <lights_physical_fragment>) and must not
// rely on Lambert's `<lights_lambert_fragment>` (toon uses <lights_toon_fragment>).

import * as THREE from 'three';

// Cel bands, sampled with coord = dot(N, L) * 0.5 + 0.5 (0.5 = surface edge-on to the sun).
// Faces turned away from the sun get no direct light (same as a cast shadow, so self
// shadow and cast shadow match); a narrow terminator band softens the edge; everything
// facing the sun is fully lit. The hemisphere fill lights the dark side.
const BANDS = [
  [0.0, 0.0],
  [0.47, 0.42],
  [0.56, 1.0],
];
const GRADIENT_SIZE = 64;

let _gradient = null;

/** The shared stepped gradient map. */
export function toonGradient() {
  if (_gradient) return _gradient;
  const data = new Uint8Array(GRADIENT_SIZE);
  for (let i = 0; i < GRADIENT_SIZE; i++) {
    const x = (i + 0.5) / GRADIENT_SIZE;
    let v = BANDS[0][1];
    for (const [at, val] of BANDS) if (x >= at) v = val;
    data[i] = Math.round(v * 255);
  }
  const t = new THREE.DataTexture(data, GRADIENT_SIZE, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  _gradient = t;
  return t;
}

const CONVERTIBLE = (m) =>
  m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshBasicMaterial;

const _cache = new WeakMap(); // source material -> Map(optsKey -> toon material)
const _hsl = { h: 0, s: 0, l: 0 };

function optsKey(o) {
  return `${o.saturate ?? 1}|${o.lighten ?? 0}|${o.keepBasic ? 1 : 0}|${o.normalMap ? 1 : 0}`;
}

/** Saturation / lightness tweak of a THREE.Color in place (HSL, sRGB-ish perceptual space). */
export function boostColor(color, saturate = 1, lighten = 0) {
  if (saturate === 1 && lighten === 0) return color;
  color.getHSL(_hsl, THREE.SRGBColorSpace);
  _hsl.s = Math.min(1, _hsl.s * saturate);
  _hsl.l = Math.min(1, Math.max(0, _hsl.l + lighten));
  color.setHSL(_hsl.h, _hsl.s, _hsl.l, THREE.SRGBColorSpace);
  return color;
}

/**
 * @param {THREE.Material | THREE.Material[]} src
 * @param {{ saturate?: number, lighten?: number, keepBasic?: boolean, normalMap?: boolean, dispose?: boolean }} [opts]
 */
export function toToon(src, opts = {}) {
  if (!src) return src;
  if (Array.isArray(src)) return src.map((m) => toToon(m, opts));
  if (src.isMeshToonMaterial || !CONVERTIBLE(src)) return src;
  if (src.isMeshBasicMaterial && opts.keepBasic) return src;

  const key = optsKey(opts);
  let byKey = _cache.get(src);
  if (byKey && byKey.has(key)) return byKey.get(key);

  const m = new THREE.MeshToonMaterial();
  m.name = src.name;
  m.gradientMap = toonGradient();
  m.color.copy(src.color);
  if (src.metalness > 0) m.color.multiplyScalar(1 - 0.3 * src.metalness); // metals read a touch darker
  boostColor(m.color, opts.saturate ?? 1, opts.lighten ?? 0);
  m.map = src.map || null;
  m.vertexColors = !!src.vertexColors;
  m.alphaMap = src.alphaMap || null;
  m.aoMap = src.aoMap || null;
  if (src.aoMapIntensity != null) m.aoMapIntensity = src.aoMapIntensity;
  m.lightMap = src.lightMap || null;
  if (src.lightMapIntensity != null) m.lightMapIntensity = src.lightMapIntensity;
  if (src.emissive) {
    m.emissive.copy(src.emissive);
    m.emissiveMap = src.emissiveMap || null;
    m.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (opts.normalMap) {
    m.normalMap = src.normalMap || null;
    if (src.normalScale) m.normalScale.copy(src.normalScale);
    m.bumpMap = src.bumpMap || null;
    if (src.bumpScale != null) m.bumpScale = src.bumpScale;
  }
  m.transparent = src.transparent;
  m.opacity = src.opacity;
  m.alphaTest = src.alphaTest;
  m.alphaToCoverage = src.alphaToCoverage;
  m.side = src.side;
  m.shadowSide = src.shadowSide;
  m.depthTest = src.depthTest;
  m.depthWrite = src.depthWrite;
  m.blending = src.blending;
  m.colorWrite = src.colorWrite;
  m.polygonOffset = src.polygonOffset;
  m.polygonOffsetFactor = src.polygonOffsetFactor;
  m.polygonOffsetUnits = src.polygonOffsetUnits;
  m.fog = src.fog;
  m.toneMapped = src.toneMapped;
  m.visible = src.visible;
  m.wireframe = !!src.wireframe;
  m.userData = { ...src.userData, toonFrom: src.type };
  // user defines only: STANDARD / PHYSICAL are the built-in PBR switches and must not follow
  if (src.defines) {
    const d = { ...src.defines };
    delete d.STANDARD;
    delete d.PHYSICAL;
    if (Object.keys(d).length) m.defines = { ...(m.defines || {}), ...d };
  }
  // shader patches: keep the closure (it captures uniforms / attributes by reference)
  if (Object.prototype.hasOwnProperty.call(src, 'onBeforeCompile')) m.onBeforeCompile = src.onBeforeCompile;
  if (Object.prototype.hasOwnProperty.call(src, 'customProgramCacheKey')) {
    const k = src.customProgramCacheKey;
    m.customProgramCacheKey = () => 'toon|' + k.call(src);
  }

  if (!byKey) _cache.set(src, (byKey = new Map()));
  byKey.set(key, m);
  if (opts.dispose) src.dispose();
  return m;
}

/** Convert every mesh material under `root` in place. */
export function toonize(root, opts = {}) {
  root.traverse((o) => {
    if ((o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) && o.material) o.material = toToon(o.material, opts);
  });
  return root;
}
