// Host-authoritative friend match. Called from src/main.js.
// Guests send input. The host runs the actors and broadcasts poses, loot,
// buildings and the result. No other matchmaker exists.

import { openRoom } from './Room.js';
import { sampleInput } from './NetInput.js';

const MAX_HUMANS = 8;

function cleanName(name) {
  const s = String(name || '')
    .replace(/[\r\n\t]/g, ' ')
    .trim()
    .slice(0, 16);
  return s || 'Player';
}

function sig(rows) {
  let h = rows.length >>> 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const a = typeof r[0] === 'number' ? r[0] : 0;
    const b = typeof r[5] === 'number' ? r[5] : 0;
    const c = typeof r[6] === 'number' ? r[6] : 0;
    h = (Math.imul(h, 33) + (a | 0) + (b | 0) + (c | 0)) >>> 0;
  }
  return h;
}

export class NetMatch {
  constructor() {
    this.room = null;
    this.role = null;
    this.name = 'Player';
    this.hostId = '';
    this.players = [];
    this.game = null;
    this.onLobby = () => {};
    this.onStart = () => {};
    this.onError = () => {};
    this.onClosed = () => {};
    this._acc = 0;
    this._worldAcc = 0;
    this._worldSig = '';
    this._closed = false;
  }

  get id() {
    return this.room ? this.room.id : '';
  }

  lobbyInfo(extra = {}) {
    return {
      role: this.role,
      code: this.role === 'host' ? this.id : this.hostId,
      players: this.players.map((p) => ({ name: p.name, host: !!p.host })),
      status: this.role === 'host' ? 'Friends join with this code' : 'Waiting for the host to start',
      ...extra,
    };
  }

  async host(name) {
    this.role = 'host';
    this.name = cleanName(name);
    this.room = openRoom();
    this._wire();
    const code = await this.room.host();
    this.hostId = code;
    this.players = [{ id: code, name: this.name, host: true }];
    this.onLobby(this.lobbyInfo());
    return code;
  }

  async join(code, name) {
    this.role = 'client';
    this.name = cleanName(name);
    this.room = openRoom();
    this._wire();
    this.hostId = await this.room.join(code);
    this.room.send(this.hostId, { t: 'hello', name: this.name });
    this.onLobby(this.lobbyInfo({ status: 'Joining…' }));
  }

  bind(game) {
    this.game = game;
    game.match = this;
    if (this.role === 'host') game.setRoster(this.players);
  }

  began() {
    if (this.role !== 'host' || !this.game) return;
    this.room.broadcast({ t: 'start', seed: this.game.seed, hostId: this.id });
  }

  close() {
    if (this._closed) return;
    this._closed = true;
    if (this.room && this.role === 'client' && this.hostId) this.room.send(this.hostId, { t: 'bye' });
    if (this.room && this.role === 'host') this.room.broadcast({ t: 'closed' });
    if (this.room) this.room.close();
    this.room = null;
    if (this.game) this.game.match = null;
  }

  afterFrame(game) {
    if (!this.room || this._closed) return;
    const dt = game._frameDt || 0.016;
    if (this.role === 'client') this._sendInput(game, dt);
    else this._sendHost(game, dt);
  }

  announceOver() {
    const g = this.game;
    if (!g || this.role !== 'host' || !this.room) return;
    for (const r of g.remotes) {
      const alive = r.player.alive;
      this.room.send(r.id, {
        t: 'over',
        victory: !!alive,
        placement: alive ? 1 : r.player._place || g.combat.aliveCount + 1,
        kills: r.player.kills | 0,
        total: g.totalActors,
        time: g.matchTime,
        killer: r.player.lastKillerName || '',
      });
    }
  }

  _wire() {
    this.room.on('data', (id, msg) => this._onData(id, msg));
    this.room.on('leave', (id) => this._onLeave(id));
    this.room.on('error', (text) => this.onError(text));
    this.room.on('close', () => {
      if (!this._closed) this.onClosed();
    });
  }

  _addPlayer(id, name) {
    if (this.players.some((p) => p.id === id)) return;
    this.players.push({ id, name: cleanName(name), host: false });
    if (this.game) this.game.setRoster(this.players);
    this.room.broadcast({ t: 'lobby', players: this.players, hostId: this.id });
    this.onLobby(this.lobbyInfo());
  }

  _onLeave(id) {
    if (this.role === 'client' && id === this.hostId) {
      this.onError('The host left.');
      this.onClosed();
      return;
    }
    if (this.role !== 'host') return;
    this.players = this.players.filter((p) => p.id !== id);
    if (this.game) {
      this.game.setRoster(this.players);
      this.game.dropRemote(id);
    }
    this.room.broadcast({ t: 'lobby', players: this.players, hostId: this.id });
    this.onLobby(this.lobbyInfo());
  }

  _onData(id, msg) {
    if (!msg || typeof msg.t !== 'string') return;
    const game = this.game;
    if (msg.t === 'hello' && this.role === 'host') {
      if (game && game.state !== 'menu') {
        this.room.send(id, { t: 'error', text: 'That match already started.' });
        return;
      }
      if (this.players.length >= MAX_HUMANS) {
        this.room.send(id, { t: 'error', text: 'This match is full.' });
        return;
      }
      this._addPlayer(id, msg.name);
      this.room.send(id, { t: 'lobby', you: id, players: this.players, hostId: this.id });
      return;
    }
    if (msg.t === 'lobby' && this.role === 'client') {
      this.players = Array.isArray(msg.players) ? msg.players : this.players;
      this.hostId = msg.hostId || this.hostId;
      this.onLobby(this.lobbyInfo());
      return;
    }
    if (msg.t === 'start' && this.role === 'client') {
      this.hostId = msg.hostId || this.hostId;
      this.onStart(msg.seed | 0, this.hostId);
      return;
    }
    if (msg.t === 'in' && this.role === 'host' && game) {
      game.pushRemoteInput(id, msg);
      return;
    }
    if (msg.t === 'snap' && game) game.applySnap(msg);
    else if (msg.t === 'you' && game) game.applyYou(msg);
    else if (msg.t === 'world' && game) game.applyWorld(msg);
    else if (msg.t === 'feed' && game && game.hud) game.hud.killFeed(msg.text, msg.kind || 'elim');
    else if (msg.t === 'fx' && game) game.applyFx(msg);
    else if (msg.t === 'over' && game) game.finishNet(msg);
    else if (msg.t === 'error') this.onError(msg.text || 'Connection failed.');
    else if (msg.t === 'closed' && this.role === 'client') {
      this.onError('The host left.');
      this.onClosed();
    } else if (msg.t === 'bye' && this.role === 'host') this._onLeave(id);
  }

  _sendInput(game, dt) {
    if (game.state !== 'drop' && game.state !== 'play' && game.state !== 'over') return;
    this._acc += dt;
    if (this._acc < 0.05) return;
    this._acc = 0;
    const p = game.player;
    this.room.send(this.hostId, {
      t: 'in',
      ...sampleInput(game.input),
      x: p.pos.x,
      y: p.pos.y,
      z: p.pos.z,
      vx: p.vel.x,
      vy: p.vel.y,
      vz: p.vel.z,
      h: p.heading,
      pitch: p.pitch,
      mode: p.mode,
      ax: p.aimOrigin.x,
      ay: p.aimOrigin.y,
      az: p.aimOrigin.z,
      dx: p.aimDir.x,
      dy: p.aimDir.y,
      dz: p.aimDir.z,
    });
  }

  _sendHost(game, dt) {
    if (game.state !== 'drop' && game.state !== 'play' && game.state !== 'over') return;
    this._acc += dt;
    if (this._acc >= 0.1) {
      this._acc = 0;
      this.room.broadcast(game.collectSnap());
      for (const r of game.remotes) this.room.send(r.id, game.collectYou(r.player));
      for (const m of game.drainFeed()) this.room.broadcast(m);
    }
    this._worldAcc += dt;
    if (this._worldAcc >= 0.4) {
      this._worldAcc = 0;
      const world = game.collectWorld();
      const mark = sig(world.pieces) + '/' + sig(world.loot);
      if (mark !== this._worldSig) {
        this._worldSig = mark;
        this.room.broadcast({ t: 'world', pieces: world.pieces, loot: world.loot });
      }
    }
  }
}
