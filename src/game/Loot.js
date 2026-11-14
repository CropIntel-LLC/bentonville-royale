// BENTONVILLE ROYALE — world loot: chests, ammo boxes and floor items.
//
//   const loot = new Loot({ scene, world, models, fx, sfx });
//   loot.spawnMatch(rng);                 // or spawnMatch(rng, { area: { x, z, r } }) to keep loot inside a circle
//   loot.update(dt, camera.position);     // every frame
//   const n = loot.nearest(player.pos);   // { id, kind, label, position, item?, rarity }
//   if (n.kind === 'item') { const left = inv.add(loot.take(n.id)); if (left) loot.drop(left, player.pos); }
//   else loot.open(n.id);
//
// `models` is { key: gltf } (null values are fine; a coloured box stands in). Keys:
//   chest, ammo (ammo box), crate, medkit, potion       — public/assets/loot/<key>.glb
//   rifle, smg, shotgun, sniper, pistol                 — public/assets/weapons/<key>.glb
//
// Rendering: every visual kind is one InstancedMesh (chest body, chest lid, ammo
// box body, ammo box lid, one per weapon, medkit, potion, and a tinted crate for
// ammo/material pickups) — 12 draw calls at most. Matrices are rewritten each
// frame only for records inside `cullDist` of the viewer. Loot beams, chest glows
// and the chest hum loop are attached only to nearby records (the Effects pools
// hold 128 beams / 64 glows, fewer than the match spawns).
//
// No DOM access; constructs in Node with stubbed scene/fx/sfx.

import * as THREE from 'three';
import { flattenModel } from '../core/assets.js';
import { toToon } from '../render/Toon.js';
import { pointInPoly } from '../world/World.js';
import {
  WEAPONS, CONSUMABLES, AMMO, MATERIALS, MATERIAL_COLOR, RARITIES, MATCH, DROP_ZONES, QUALITY, TAU,
} from '../core/config.js';

// ---------------------------------------------------------------- tunables
export const LOOT = {
  floorRarity: [40, 30, 18, 9, 3], // weights for common..legendary
  chestRarity: [10, 32, 33, 18, 7],
  weaponWeights: { rifle: 26, smg: 22, shotgun: 24, pistol: 18, sniper: 10 },
  minRarity: { sniper: 'rare' },
  floorMix: { weapon: 0.45, consumable: 0.25, ammo: 0.2, material: 0.1 },
  matPickup: 30,
  chestMats: 30,
  zoneBias: { chest: 0.55, ammoBox: 0.35, floor: 0.4 },
  spacing: { chest: 9, ammoBox: 7, item: 3 },
  cullDist: 260,
  beamDist: 70,
  glowDist: 55,
  humDist: 24,
  maxBeams: 110,
  maxGlows: 56,
  pickupRange: 2.4,
  verticalReach: 2.2,
  scale: { chest: 2.0, ammo: 1.0, w: 1.3, medkit: 1.7, potion: 1.3, crateAmmo: 0.7, crateMat: 0.9 },
  ammoTint: { light: 0xbfe6ff, medium: 0x9ee08a, shells: 0xffa477, heavy: 0xa9b2ff },
};

const WEAPON_KEYS = Object.keys(WEAPONS);
const AMMO_KINDS = Object.keys(AMMO);
const CAP = { chest: MATCH.chests + 16, ammo: MATCH.ammoBoxes + 16, weapon: 220, consumable: 220, crate: 420 };

const _m = new THREE.Matrix4();
const _l = new THREE.Matrix4();
const _o = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _p = new THREE.Vector3();

const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function pickWeighted(rng, weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = rng() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r < 0) return k;
  }
  return Object.keys(weights)[0];
}

function rollRarity(rng, table) {
  let total = 0;
  for (const w of table) total += w;
  let r = rng() * total;
  for (let i = 0; i < table.length; i++) {
    r -= table[i];
    if (r < 0) return RARITIES[i];
  }
  return RARITIES[0];
}

export function itemRarity(item) {
  if (!item) return 'common';
  if (item.type === 'weapon') return RARITIES.includes(item.rarity) ? item.rarity : 'common';
  if (item.type === 'consumable') return CONSUMABLES[item.id] ? CONSUMABLES[item.id].rarity : 'common';
  return 'common';
}

export function itemLabel(item) {
  if (!item) return '';
  switch (item.type) {
    case 'weapon':
      return `${cap1(itemRarity(item))} ${WEAPONS[item.id] ? WEAPONS[item.id].name : item.id}`;
    case 'consumable': {
      const c = CONSUMABLES[item.id];
      return (c ? c.name : item.id) + (item.count > 1 ? ` x${item.count}` : '');
    }
    case 'ammo':
      return `${AMMO[item.ammo] ? AMMO[item.ammo].name : item.ammo} x${item.count}`;
    case 'material':
      return `${cap1(item.mat)} x${item.count}`;
  }
  return '';
}

/** Random loot rolls (exported for bots/tests). */
export function rollWeapon(rng, rarityTable = LOOT.floorRarity) {
  const id = pickWeighted(rng, LOOT.weaponWeights);
  let rarity = rollRarity(rng, rarityTable);
  const min = LOOT.minRarity[id];
  if (min && RARITIES.indexOf(rarity) < RARITIES.indexOf(min)) rarity = min;
  return { type: 'weapon', id, rarity, mag: WEAPONS[id].mag };
}
export function ammoFor(weaponId) {
  const kind = WEAPONS[weaponId].ammo;
  return { type: 'ammo', ammo: kind, count: AMMO[kind].pickup };
}
export function rollConsumable(rng) {
  const id = rng() < 0.55 ? 'medkit' : 'tonic';
  return { type: 'consumable', id, count: id === 'medkit' ? 1 : 1 + (rng() < 0.3 ? 1 : 0) };
}
export function rollAmmo(rng) {
  const kind = AMMO_KINDS[Math.floor(rng() * AMMO_KINDS.length)];
  return { type: 'ammo', ammo: kind, count: AMMO[kind].pickup };
}

// ---------------------------------------------------------------- model prep

function boxFlat(w, h, d, color) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  g.computeBoundingBox();
  return { geometry: g, material: toToon(new THREE.MeshStandardMaterial({ color, roughness: 0.7 }), { saturate: 1.15 }) };
}

/** Splits a gltf into body + lid flats with the lid hinge (pivot + axis) in model space. */
function prepLidded(gltf, fallbackColor, size) {
  const scene = gltf && gltf.scene;
  if (!scene) {
    const body = boxFlat(size[0], size[1] * 0.6, size[2], fallbackColor);
    const lid = boxFlat(size[0], size[1] * 0.4, size[2], fallbackColor);
    lid.geometry.translate(0, size[1] * 0.6, 0);
    return { body, lid, pivot: new THREE.Vector3(0, size[1] * 0.6, -size[2] / 2), axis: new THREE.Vector3(-1, 0, 0) };
  }
  const a = scene.clone(true);
  a.updateMatrixWorld(true);
  const lidA = a.getObjectByName('lid');
  if (!lidA) return { body: flattenModel(a), lid: null, pivot: null, axis: null };
  const pivot = lidA.getWorldPosition(new THREE.Vector3());
  lidA.parent.remove(lidA);
  const body = flattenModel(a);
  // lid alone, keeping its parent's world transform
  const b = scene.clone(true);
  b.updateMatrixWorld(true);
  const lidB = b.getObjectByName('lid');
  const holder = new THREE.Group();
  holder.applyMatrix4(lidB.parent.matrixWorld);
  holder.add(lidB.clone(true));
  const lid = flattenModel(holder);
  if (!lid) return { body, lid: null, pivot: null, axis: null };
  // hinge axis: horizontal, perpendicular to pivot -> lid centre, so the far edge lifts
  const centre = lid.geometry.boundingBox.getCenter(new THREE.Vector3());
  const d = new THREE.Vector3(centre.x - pivot.x, 0, centre.z - pivot.z);
  let axis = new THREE.Vector3(1, 0, 0);
  if (d.lengthSq() > 1e-6) axis = d.normalize().cross(new THREE.Vector3(0, 1, 0)).normalize();
  return { body, lid, pivot, axis };
}

function prepFlat(gltf, fallback) {
  const scene = gltf && gltf.scene;
  if (scene) {
    const f = flattenModel(scene.clone(true));
    if (f) return f;
  }
  return fallback();
}

class Batch {
  constructor(group, flat, cap, { colored = false, shadow = false, name = '' } = {}) {
    this.mesh = new THREE.InstancedMesh(flat.geometry, flat.material, cap);
    this.mesh.name = 'loot_' + name;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; // distance-culled by Loot.update
    this.mesh.castShadow = shadow;
    this.mesh.count = 0;
    this.cap = cap;
    this.n = 0;
    if (colored) {
      for (let i = 0; i < cap; i++) this.mesh.setColorAt(i, _c.set(0xffffff));
      this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    group.add(this.mesh);
  }
  begin() {
    this.n = 0;
  }
  push(m, color) {
    if (this.n >= this.cap) return;
    this.mesh.setMatrixAt(this.n, m);
    if (color != null && this.mesh.instanceColor) this.mesh.setColorAt(this.n, _c.set(color));
    this.n++;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.visible = this.n > 0;
    if (this.n) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }
  dispose() {
    this.mesh.parent && this.mesh.parent.remove(this.mesh);
    this.mesh.dispose();
  }
}

// ---------------------------------------------------------------- Loot

export class Loot {
  constructor({ scene, world, models = {}, fx = null, sfx = null }) {
    this.scene = scene;
    this.world = world;
    this.fx = fx;
    this.sfx = sfx;
    this.group = new THREE.Group();
    this.group.name = 'loot';
    if (scene) scene.add(this.group);

    this.records = [];
    this.byId = new Map();
    this._nextId = 1;
    this._rng = Math.random;
    this.time = 0;
    this.cullDist = LOOT.cullDist;
    this._beams = 0;
    this._glows = 0;
    this._blips = [];
    this._blipsDirty = true;
    this._buildings = null;

    const m = models || {};
    const chest = prepLidded(m.chest, 0xc58a3a, [0.5, 0.45, 0.5]);
    const ammo = prepLidded(m.ammo, 0x5f7a4a, [0.55, 0.37, 1.0]);
    this._lids = { chest, ammo };
    const g = this.group;
    this.batches = {
      chestBody: new Batch(g, chest.body, CAP.chest, { shadow: true, name: 'chest' }),
      chestLid: chest.lid ? new Batch(g, chest.lid, CAP.chest, { shadow: true, name: 'chestLid' }) : null,
      ammoBody: new Batch(g, ammo.body, CAP.ammo, { shadow: true, name: 'ammoBox' }),
      ammoLid: ammo.lid ? new Batch(g, ammo.lid, CAP.ammo, { shadow: true, name: 'ammoLid' }) : null,
      medkit: new Batch(g, prepFlat(m.medkit, () => boxFlat(0.22, 0.29, 0.14, 0xd83a3a)), CAP.consumable, { name: 'medkit' }),
      potion: new Batch(g, prepFlat(m.potion, () => boxFlat(0.2, 0.4, 0.2, 0x3b9cff)), CAP.consumable, { name: 'potion' }),
      crate: new Batch(g, prepFlat(m.crate, () => boxFlat(0.5, 0.5, 0.5, 0xffffff)), CAP.crate, { colored: true, name: 'crate' }),
    };
    for (const id of WEAPON_KEYS) {
      this.batches['w_' + id] = new Batch(g, prepFlat(m[id], () => boxFlat(0.12, 0.2, 0.7, 0x55606a)), CAP.weapon, { name: id });
    }
  }

  setQuality(q) {
    const Q = QUALITY[q];
    if (Q) this.cullDist = Math.max(LOOT.cullDist * 0.6, Q.propDist * 1.1);
  }

  get count() {
    return this.records.length;
  }

  // -------------------------------------------------------------- records

  _add(kind, x, y, z, yaw, item) {
    const id = this._nextId++;
    const rec = {
      id, kind, x, y, z, yaw, item: item || null,
      rarity: kind === 'item' ? itemRarity(item) : kind === 'chest' ? 'legendary' : 'common',
      opened: false, open01: 0, phase: (id * 2.399) % TAU,
      beam: null, glow: null, hum: false, spill: null, idx: this.records.length,
      info: null,
    };
    rec.info = {
      id, kind,
      label: kind === 'chest' ? 'Open Chest' : kind === 'ammoBox' ? 'Open Ammo Box' : itemLabel(item),
      position: new THREE.Vector3(x, y, z),
      item: rec.item,
      rarity: rec.rarity,
    };
    this.records.push(rec);
    this.byId.set(id, rec);
    this._blipsDirty = true;
    return rec;
  }

  _remove(rec) {
    this._fxOff(rec);
    const last = this.records.pop();
    if (last !== rec) {
      this.records[rec.idx] = last;
      last.idx = rec.idx;
    }
    this.byId.delete(rec.id);
    this._blipsDirty = true;
  }

  _fxOff(rec) {
    if (rec.beam) {
      rec.beam.remove();
      rec.beam = null;
      this._beams--;
    }
    if (rec.glow) {
      rec.glow.remove();
      rec.glow = null;
      this._glows--;
    }
    if (rec.hum) {
      this.sfx && this.sfx.stopLoop('chest_hum', rec.id);
      rec.hum = false;
    }
  }

  clear() {
    for (const r of this.records) this._fxOff(r);
    this.records.length = 0;
    this.byId.clear();
    this._beams = this._glows = 0;
    this._blipsDirty = true;
    for (const k in this.batches) {
      const b = this.batches[k];
      if (b) {
        b.begin();
        b.end();
      }
    }
  }

  dispose() {
    this.clear();
    for (const k in this.batches) this.batches[k] && this.batches[k].dispose();
    this.group.parent && this.group.parent.remove(this.group);
  }

  // -------------------------------------------------------------- placement

  _index() {
    if (this._buildings) return this._buildings;
    const list = [];
    const bs = (this.world.data && this.world.data.buildings) || [];
    for (const b of bs) {
      const p = b.p;
      if (!p || p.length < 3) continue;
      const flat = new Float64Array(p.length * 2);
      let cx = 0, cz = 0, per = 0;
      for (let i = 0; i < p.length; i++) {
        flat[i * 2] = p[i][0];
        flat[i * 2 + 1] = p[i][1];
        cx += p[i][0];
        cz += p[i][1];
        const q = p[(i + 1) % p.length];
        per += Math.hypot(q[0] - p[i][0], q[1] - p[i][1]);
      }
      if (per < 12) continue; // sheds and slivers
      list.push({ p, flat, n: p.length, cx: cx / p.length, cz: cz / p.length, per });
    }
    this._buildings = list;
    return list;
  }

  _zones(area) {
    const lms = this.world.landmarks || {};
    const out = [];
    const all = this._index();
    for (const z of DROP_ZONES) {
      const lm = lms[z.key];
      if (!lm || !Number.isFinite(lm.x)) continue;
      const r = Math.min(lm.r || 80, 160) + 40;
      if (area && Math.hypot(lm.x - area.x, lm.z - area.z) > area.r + r) continue;
      const bl = all.filter((b) => (b.cx - lm.x) ** 2 + (b.cz - lm.z) ** 2 < r * r);
      out.push({ x: lm.x, z: lm.z, r, buildings: bl });
    }
    return out;
  }

  _okSpot(x, z, clearance, area) {
    const w = this.world;
    if (!w.inBounds(x, z, 20)) return false;
    if (area && (x - area.x) ** 2 + (z - area.z) ** 2 > area.r * area.r) return false;
    if (w.blockedAt(x, z, clearance)) return false;
    if (w.areaAt && w.areaAt(x, z) === 'water') return false;
    return true;
  }

  _spaced(x, z, d) {
    const key = (cx, cz) => cx * 73856093 ^ cz * 19349663;
    const C = 16;
    const gx = Math.floor(x / C), gz = Math.floor(z / C);
    const r = Math.ceil(d / C);
    for (let ix = gx - r; ix <= gx + r; ix++) {
      for (let iz = gz - r; iz <= gz + r; iz++) {
        const cell = this._grid.get(key(ix, iz));
        if (!cell) continue;
        for (const p of cell) if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.d > d ? p.d : d) ** 2) return false;
      }
    }
    return true;
  }

  _mark(x, z, d) {
    const C = 16;
    const k = Math.floor(x / C) * 73856093 ^ Math.floor(z / C) * 19349663;
    let cell = this._grid.get(k);
    if (!cell) this._grid.set(k, (cell = []));
    cell.push({ x, z, d });
  }

  /** A point just outside a building wall, facing away from it. */
  _beside(rng, b, offMin, offMax, clearance, area) {
    for (let tries = 0; tries < 6; tries++) {
      let r = rng() * b.per;
      let i = 0;
      const p = b.p;
      let ax, az, bx, bz, len;
      for (; i < p.length; i++) {
        const q = p[(i + 1) % p.length];
        ax = p[i][0]; az = p[i][1]; bx = q[0]; bz = q[1];
        len = Math.hypot(bx - ax, bz - az);
        if (r < len) break;
        r -= len;
      }
      if (!(len > 2)) continue;
      const t = 0.15 + rng() * 0.7;
      const mx = ax + (bx - ax) * t, mz = az + (bz - az) * t;
      let nx = (bz - az) / len, nz = -(bx - ax) / len;
      if (pointInPoly(b.flat, b.n, mx + nx * 0.3, mz + nz * 0.3)) {
        nx = -nx;
        nz = -nz;
      }
      const off = offMin + rng() * (offMax - offMin);
      const x = mx + nx * off, z = mz + nz * off;
      if (this._okSpot(x, z, clearance, area)) return { x, z, yaw: Math.atan2(nx, nz) };
    }
    return null;
  }

  _spot(rng, kind, ctx) {
    const { zones, cands, area } = ctx;
    const bias = LOOT.zoneBias[kind === 'item' ? 'floor' : kind];
    const spacing = LOOT.spacing[kind];
    const container = kind !== 'item';
    for (let attempt = 0; attempt < 30; attempt++) {
      const useZone = zones.length && rng() < bias;
      const zone = useZone ? zones[Math.floor(rng() * zones.length)] : null;
      const list = zone ? zone.buildings : cands;
      let s = null;
      if (list.length && (container || rng() < 0.6)) {
        const b = list[Math.floor(rng() * list.length)];
        s = container ? this._beside(rng, b, 0.9, 1.4, 0.75, area) : this._beside(rng, b, 1.2, 3.5, 0.5, area);
      } else {
        const b = !zone && list.length ? list[Math.floor(rng() * list.length)] : null;
        const cx = zone ? zone.x : b ? b.cx : area ? area.x : 0;
        const cz = zone ? zone.z : b ? b.cz : area ? area.z : 0;
        const o = this.world.randomOpenPoint(rng, cx, cz, zone ? zone.r : b ? 30 : area ? area.r : 300, 0.6);
        if (this._okSpot(o.x, o.z, 0.5, area)) s = { x: o.x, z: o.z, yaw: rng() * TAU };
      }
      if (!s || !this._spaced(s.x, s.z, spacing)) continue;
      this._mark(s.x, s.z, spacing);
      return s;
    }
    return null;
  }

  /**
   * Places MATCH.chests chests, MATCH.ammoBoxes ammo boxes and MATCH.floorLoot
   * floor spots (a weapon spot also gets its ammo beside it). Optional
   * opts.area = { x, z, r } keeps everything inside that circle.
   */
  spawnMatch(rng = Math.random, opts = {}) {
    this.clear();
    this._rng = rng;
    this._grid = new Map();
    const area = opts.area && opts.area.r > 0 ? opts.area : null;
    const all = this._index();
    const cands = area ? all.filter((b) => (b.cx - area.x) ** 2 + (b.cz - area.z) ** 2 < area.r * area.r) : all;
    const ctx = { zones: this._zones(area), cands, area };
    const w = this.world;
    const gy = (x, z) => w.groundHeight(x, z, 0.3);

    const nChests = opts.chests ?? MATCH.chests;
    const nBoxes = opts.ammoBoxes ?? MATCH.ammoBoxes;
    const nFloor = opts.floorLoot ?? MATCH.floorLoot;
    for (let i = 0; i < nChests; i++) {
      const s = this._spot(rng, 'chest', ctx);
      if (s) this._add('chest', s.x, gy(s.x, s.z), s.z, s.yaw, null);
    }
    for (let i = 0; i < nBoxes; i++) {
      const s = this._spot(rng, 'ammoBox', ctx);
      if (s) this._add('ammoBox', s.x, gy(s.x, s.z), s.z, s.yaw, null);
    }
    for (let i = 0; i < nFloor; i++) {
      const s = this._spot(rng, 'item', ctx);
      if (!s) continue;
      const kind = pickWeighted(rng, LOOT.floorMix);
      let item;
      if (kind === 'weapon') item = rollWeapon(rng, LOOT.floorRarity);
      else if (kind === 'consumable') item = rollConsumable(rng);
      else if (kind === 'ammo') item = rollAmmo(rng);
      else item = { type: 'material', mat: MATERIALS[Math.floor(rng() * MATERIALS.length)], count: LOOT.matPickup };
      this._add('item', s.x, gy(s.x, s.z), s.z, s.yaw, item);
      if (item.type === 'weapon' && rng() < 0.7) {
        const ax = s.x + Math.cos(s.yaw) * 0.9, az = s.z - Math.sin(s.yaw) * 0.9;
        const ok = !w.blockedAt(ax, az, 0.3);
        this._add('item', ok ? ax : s.x, gy(ok ? ax : s.x, ok ? az : s.z), ok ? az : s.z, s.yaw, ammoFor(item.id));
      }
    }
    this._grid = null;
    return { chests: this.records.filter((r) => r.kind === 'chest').length, ammoBoxes: this.records.filter((r) => r.kind === 'ammoBox').length, items: this.records.filter((r) => r.kind === 'item').length };
  }

  // -------------------------------------------------------------- interaction

  _spawnItem(item, fromX, fromY, fromZ, toX, toZ, hintY) {
    const w = this.world;
    if (w.blockedAt(toX, toZ, 0.25)) {
      toX = fromX;
      toZ = fromZ;
    }
    const y = w.groundHeight(toX, toZ, hintY + 0.6);
    const rec = this._add('item', toX, y, toZ, this._rng() * TAU, item);
    rec.spill = { fx: fromX, fy: fromY, fz: fromZ, t: 0 };
    rec.info.position.set(toX, y, toZ);
    return rec;
  }

  /** Opens a chest or ammo box and spills its contents in front of it. */
  open(id) {
    const rec = this.byId.get(id);
    if (!rec || rec.kind === 'item' || rec.opened) return false;
    rec.opened = true;
    this._fxOff(rec);
    this._blipsDirty = true;
    _p.set(rec.x, rec.y, rec.z);
    if (this.fx) rec.kind === 'chest' ? this.fx.chestOpen(_p) : this.fx.pickupBurst(_p, 'common');
    if (this.sfx) this.sfx.play('chest_open', { x: rec.x, y: rec.y, z: rec.z });

    const rng = this._rng;
    const items = [];
    if (rec.kind === 'chest') {
      const wpn = rollWeapon(rng, LOOT.chestRarity);
      items.push(wpn, ammoFor(wpn.id));
      items.push(rng() < 0.65 ? rollConsumable(rng) : rollAmmo(rng));
      items.push({ type: 'material', mat: 'wood', count: LOOT.chestMats });
    } else {
      items.push(rollAmmo(rng), rollAmmo(rng));
      if (rng() < 0.3) items.push(rollAmmo(rng));
    }
    const fy = rec.y + 0.6;
    const n = items.length;
    for (let i = 0; i < n; i++) {
      const a = rec.yaw + (n > 1 ? (i / (n - 1) - 0.5) * 1.8 : 0);
      const d = 1.4 + rng() * 0.6;
      this._spawnItem(items[i], rec.x, fy, rec.z, rec.x + Math.sin(a) * d, rec.z + Math.cos(a) * d, rec.y);
    }
    return true;
  }

  /** Removes a floor item and returns it (plays pickup sound/burst). */
  take(id) {
    const rec = this.byId.get(id);
    if (!rec || rec.kind !== 'item') return null;
    const item = rec.item;
    _p.set(rec.x, rec.y, rec.z);
    if (this.fx) this.fx.pickupBurst(_p, rec.rarity);
    if (this.sfx) this.sfx.play(item.type === 'ammo' || item.type === 'material' ? 'pickup_ammo' : 'pickup', { x: rec.x, y: rec.y, z: rec.z });
    this._remove(rec);
    return item;
  }

  /** Places an item on the ground near `position` (scattered a little). Returns its id. */
  drop(item, position) {
    if (!item || !item.type) return null;
    if (item.count != null && item.count <= 0) return null;
    const rng = this._rng;
    const a = rng() * TAU, d = 0.5 + rng() * 0.9;
    const py = position.y || 0;
    const rec = this._spawnItem(item, position.x, py + 0.8, position.z, position.x + Math.cos(a) * d, position.z + Math.sin(a) * d, py);
    return rec.id;
  }

  // -------------------------------------------------------------- queries

  _interactable(r) {
    return r.kind === 'item' || !r.opened;
  }

  nearest(pos, maxDist = LOOT.pickupRange) {
    let best = null;
    let bd = maxDist * maxDist;
    for (const r of this.records) {
      if (!this._interactable(r)) continue;
      if (Math.abs(r.y - pos.y) > LOOT.verticalReach) continue;
      const d = (r.x - pos.x) ** 2 + (r.z - pos.z) ** 2;
      if (d <= bd) {
        bd = d;
        best = r;
      }
    }
    return best ? best.info : null;
  }

  /** Every interactable record within `radius` (horizontal), nearest first. */
  near(pos, radius) {
    const r2 = radius * radius;
    const out = [];
    for (const r of this.records) {
      if (!this._interactable(r)) continue;
      const d = (r.x - pos.x) ** 2 + (r.z - pos.z) ** 2;
      if (d <= r2) out.push({ d, info: r.info });
    }
    out.sort((a, b) => a.d - b.d);
    return out.map((o) => o.info);
  }

  /** Minimap blips. The array is rebuilt only when loot changes. */
  blips() {
    if (!this._blipsDirty) return this._blips;
    const out = (this._blips = []);
    for (const r of this.records) {
      if (r.kind === 'chest' && !r.opened) out.push({ x: r.x, z: r.z, kind: 'chest' });
      else if (r.kind === 'item') out.push({ x: r.x, z: r.z, kind: 'loot' });
    }
    this._blipsDirty = false;
    return out;
  }

  // -------------------------------------------------------------- per frame

  update(dt, viewerPos) {
    this.time += dt;
    const t = this.time;
    const B = this.batches;
    for (const k in B) B[k] && B[k].begin();
    const hasViewer = !!viewerPos;
    const vx = hasViewer ? viewerPos.x : 0, vz = hasViewer ? viewerPos.z : 0;
    const cull2 = this.cullDist * this.cullDist;
    const S = LOOT.scale;

    for (let i = 0; i < this.records.length; i++) {
      const r = this.records[i];

      if (r.spill) {
        const s = r.spill;
        s.t = Math.min(1, s.t + dt / 0.45);
        if (s.t >= 1) {
          r.spill = null;
          this._blipsDirty = true;
        }
      }
      if (r.kind !== 'item' && r.opened && r.open01 < 1) r.open01 = Math.min(1, r.open01 + dt * 2.6);

      const dx = r.x - vx, dz = r.z - vz;
      const d2 = hasViewer ? dx * dx + dz * dz : 0;
      if (hasViewer) this._effects(r, d2);
      if (d2 > cull2) continue;

      if (r.kind === 'item') {
        let x = r.x, y = r.y, z = r.z;
        if (r.spill) {
          const s = r.spill, k = s.t;
          x = s.fx + (r.x - s.fx) * k;
          z = s.fz + (r.z - s.fz) * k;
          y = s.fy + (r.y + 0.3 - s.fy) * k + Math.sin(Math.PI * k) * 1.1;
        } else y += 0.3 + Math.sin(t * 2.2 + r.phase) * 0.07;
        const it = r.item;
        let batch, sc, col = null, yaw = r.yaw + t * 1.1;
        switch (it.type) {
          case 'weapon':
            batch = B['w_' + it.id];
            sc = S.w;
            break;
          case 'consumable':
            batch = it.id === 'medkit' ? B.medkit : B.potion;
            sc = it.id === 'medkit' ? S.medkit : S.potion;
            break;
          case 'ammo':
            batch = B.crate;
            sc = S.crateAmmo;
            col = LOOT.ammoTint[it.ammo] || 0xffffff;
            yaw = r.yaw;
            break;
          default:
            batch = B.crate;
            sc = S.crateMat;
            col = MATERIAL_COLOR[it.mat] || 0xffffff;
            yaw = r.yaw;
        }
        if (!batch) continue;
        _m.makeRotationY(yaw);
        _m.scale(_s.set(sc, sc, sc));
        _m.setPosition(x, y, z);
        batch.push(_m, col);
      } else {
        const chest = r.kind === 'chest';
        const sc = chest ? S.chest : S.ammo;
        _m.makeRotationY(r.yaw);
        _m.scale(_s.set(sc, sc, sc));
        _m.setPosition(r.x, r.y, r.z);
        (chest ? B.chestBody : B.ammoBody).push(_m);
        const lidB = chest ? B.chestLid : B.ammoLid;
        if (lidB) {
          const L = this._lids[chest ? 'chest' : 'ammo'];
          const ang = easeOutBack(r.open01) * 1.9;
          _l.makeRotationAxis(L.axis, ang);
          _v.copy(L.pivot).applyMatrix4(_l);
          _l.setPosition(L.pivot.x - _v.x, L.pivot.y - _v.y, L.pivot.z - _v.z);
          _o.multiplyMatrices(_m, _l);
          lidB.push(_o);
        }
      }
    }
    for (const k in B) B[k] && B[k].end();
  }

  _effects(r, d2) {
    const fx = this.fx;
    if (r.kind === 'item') {
      if (!fx) return;
      const D = LOOT.beamDist;
      if (!r.beam && !r.spill && d2 < D * D && this._beams < LOOT.maxBeams) {
        _p.set(r.x, r.y, r.z);
        r.beam = fx.lootBeam(_p, r.rarity);
        if (r.beam) this._beams++;
      } else if (r.beam && d2 > D * D * 1.32) {
        r.beam.remove();
        r.beam = null;
        this._beams--;
      }
      return;
    }
    if (r.kind !== 'chest' || r.opened) return;
    if (fx) {
      const G = LOOT.glowDist;
      if (!r.glow && d2 < G * G && this._glows < LOOT.maxGlows) {
        _p.set(r.x, r.y, r.z);
        r.glow = fx.chestGlow(_p);
        if (r.glow) this._glows++;
      } else if (r.glow && d2 > G * G * 1.32) {
        r.glow.remove();
        r.glow = null;
        this._glows--;
      }
    }
    if (this.sfx) {
      const H = LOOT.humDist;
      if (!r.hum && d2 < H * H) {
        this.sfx.startLoop('chest_hum', { id: r.id, x: r.x, y: r.y + 0.4, z: r.z });
        r.hum = true;
      } else if (r.hum && d2 > H * H * 1.44) {
        this.sfx.stopLoop('chest_hum', r.id);
        r.hum = false;
      }
    }
  }
}
