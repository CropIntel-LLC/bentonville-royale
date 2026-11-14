// A remote human or bot drawn on a client. Called from Game.applySnap.
// The host owns the simulation; this only interpolates a pose onto a Character.
// Sample schema: { x, y, z, heading, pitch, alive, name, mode }.

import * as THREE from 'three';

export class Puppet {
  constructor(id, character) {
    this.id = id;
    this.character = character;
    this.pos = new THREE.Vector3();
    this.goal = new THREE.Vector3();
    this.heading = 0;
    this.pitch = 0;
    this.alive = true;
    this.name = '';
    this.mode = 'ground';
    this.seen = false;
    this._die = false;
  }

  setSample(s) {
    this.goal.set(s.x, s.y, s.z);
    if (!this.seen) {
      this.pos.copy(this.goal);
      this.seen = true;
    }
    this.heading = s.heading;
    this.pitch = s.pitch || 0;
    this.name = s.name || this.name;
    if (s.mode) this.mode = s.mode;
    if (this.alive && !s.alive) this._die = true;
    this.alive = !!s.alive;
  }

  update(dt) {
    const c = this.character;
    if (!c) return;
    this.pos.lerp(this.goal, 1 - Math.exp(-14 * dt));
    if (this._die) {
      this._die = false;
      c.die();
    }
    c.root.position.copy(this.pos);
    c.root.visible = this.mode !== 'bus';
    const speed = !this.alive ? 0 : this.mode === 'glide' ? 16 : this.mode === 'freefall' ? 28 : 0;
    c.update(dt, {
      fwd: speed > 0 ? 1 : 0,
      side: 0,
      speed,
      grounded: this.mode === 'ground' || !this.alive,
      gliding: this.mode === 'glide',
      heading: this.heading,
      pitch: this.pitch,
    });
  }

  dispose() {
    if (!this.character) return;
    this.character.root.removeFromParent();
    this.character.dispose();
    this.character = null;
  }
}
