// BENTONVILLE ROYALE — GLB loading and model flattening.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toToon } from '../render/Toon.js';

const loader = new GLTFLoader();
// GLB colours get a small saturation lift so props read as bright toys.
const TOON_MODEL = { saturate: 1.18 };
const cache = new Map();

/** Loads a GLB once; later calls share the same promise. Resolves to the gltf object. */
export function loadGLB(url) {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    cache.set(url, p);
  }
  return p;
}

export async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/**
 * Loads `{ key: url }` in parallel. Resolves to `{ key: gltf }`.
 * A model that fails to load resolves to null (the game degrades instead of dying).
 */
export async function loadModels(urls, onProgress) {
  const keys = Object.keys(urls);
  const out = {};
  let done = 0;
  await Promise.all(
    keys.map((k) =>
      loadGLB(urls[k])
        .then((g) => {
          out[k] = g;
        })
        .catch((err) => {
          console.warn('model failed to load:', urls[k], err.message || err);
          out[k] = null;
        })
        .finally(() => {
          done++;
          if (onProgress) onProgress(done / keys.length);
        })
    )
  );
  return out;
}

/**
 * Bakes every mesh of a model into one geometry (world transforms applied),
 * grouped by material, so it can be drawn with a single InstancedMesh.
 * Returns { geometry, material } where material may be an array.
 * Materials are converted to the shared cel-shaded MeshToonMaterial (render/Toon.js);
 * pass { toon: false } to keep the originals.
 */
export function flattenModel(root, { toon = true } = {}) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    src.applyMatrix4(o.matrixWorld);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const groups = src.groups.length && mats.length > 1 ? src.groups : [{ start: 0, count: src.attributes.position.count, materialIndex: 0 }];
    for (const g of groups) {
      const mat = mats[g.materialIndex] || mats[0];
      const part = new THREE.BufferGeometry();
      const slice = (attr, size) => new THREE.BufferAttribute(attr.array.slice(g.start * size, (g.start + g.count) * size), size);
      part.setAttribute('position', slice(src.attributes.position, 3));
      if (src.attributes.normal) part.setAttribute('normal', slice(src.attributes.normal, 3));
      else part.computeVertexNormals();
      if (src.attributes.uv) part.setAttribute('uv', slice(src.attributes.uv, 2));
      else part.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.count * 2), 2));
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push(part);
    }
  });
  const sources = [...byMat.keys()];
  if (!sources.length) return null;
  const materials = toon ? sources.map((m) => toToon(m, TOON_MODEL)) : sources;
  const merged = sources.map((m) => mergeGeometries(byMat.get(m), false));
  const geometry = merged.length === 1 ? merged[0] : mergeGeometries(merged, true);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return { geometry, material: materials.length === 1 ? materials[0] : materials };
}
