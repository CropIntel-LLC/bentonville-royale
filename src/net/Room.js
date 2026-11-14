// WebRTC room. Called from src/net/Match.js. No other networking module exists.
// The public PeerJS broker only introduces the browsers; gameplay bytes travel
// on a data channel. Messages are plain objects { t, ... }.

import Peer from 'peerjs';

const ICE = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
};
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const OPEN_MS = 12000;

function freshCode() {
  let s = 'BR';
  for (let i = 0; i < 4; i++) s += ALPHABET[(Math.random() * ALPHABET.length) | 0];
  return s;
}

export function normalizeCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function explain(err) {
  const type = (err && (err.type || err.message)) || '';
  if (type === 'peer-unavailable' || type === 'unavailable-id') return 'No match with that code.';
  if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed')
    return 'Could not reach matchmaking. Check your connection and try again.';
  return (err && err.message) || 'Connection failed.';
}

/**
 * openRoom()
 *   room.host() -> code
 *   room.join(code)
 *   room.send(id, obj) / room.broadcast(obj)
 *   room.on('join'|'leave'|'data'|'error'|'close', fn)
 *   room.close()
 */
export function openRoom() {
  const peers = new Map();
  const handlers = {};
  let peer = null;
  let myId = '';
  let closed = false;

  function emit(ev, ...args) {
    const list = handlers[ev];
    if (!list) return;
    for (const fn of list) fn(...args);
  }

  function bind(conn) {
    const id = conn.peer;
    conn.on('data', (data) => {
      if (data && typeof data === 'object') emit('data', id, data);
    });
    conn.on('close', () => {
      if (peers.get(id) === conn) peers.delete(id);
      emit('leave', id);
    });
    conn.on('error', (err) => emit('error', explain(err)));
  }

  function track(conn) {
    bind(conn);
    if (conn.open) {
      peers.set(conn.peer, conn);
      emit('join', conn.peer);
    } else {
      conn.on('open', () => {
        peers.set(conn.peer, conn);
        emit('join', conn.peer);
      });
    }
  }

  return {
    on(ev, fn) {
      (handlers[ev] = handlers[ev] || []).push(fn);
      return this;
    },
    get id() {
      return myId;
    },
    host() {
      return new Promise((resolve, reject) => {
        const attempt = (n) => {
          if (closed) return reject(new Error('Room closed'));
          const id = freshCode();
          let settled = false;
          const fail = (err) => {
            clearTimeout(timer);
            if (peer) {
              peer.destroy();
              peer = null;
            }
            if (!settled) {
              settled = true;
              reject(err instanceof Error ? err : new Error(explain(err)));
            }
          };
          const timer = setTimeout(() => fail(new Error('Could not reach matchmaking. Check your connection and try again.')), OPEN_MS);
          peer = new Peer(id, { config: ICE });
          peer.on('open', (opened) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            myId = opened;
            resolve(opened);
          });
          peer.on('connection', track);
          peer.on('error', (err) => {
            if (err && err.type === 'unavailable-id' && n < 5) {
              clearTimeout(timer);
              settled = true;
              peer.destroy();
              peer = null;
              attempt(n + 1);
              return;
            }
            fail(err);
          });
          peer.on('disconnected', () => {
            if (!closed && peer && !peer.destroyed) peer.reconnect();
          });
        };
        attempt(0);
      });
    },
    join(code) {
      const target = normalizeCode(code);
      return new Promise((resolve, reject) => {
        if (!/^BR[A-Z0-9]{4}$/.test(target)) {
          reject(new Error('Enter a code like BR4K2M.'));
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error('Could not reach matchmaking. Check your connection and try again.'));
        }, OPEN_MS);
        peer = new Peer(undefined, { config: ICE });
        peer.on('open', (opened) => {
          myId = opened;
          const conn = peer.connect(target, { reliable: true });
          bind(conn);
          conn.on('open', () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            peers.set(target, conn);
            resolve(target);
          });
          conn.on('error', (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(new Error(explain(err)));
          });
        });
        peer.on('error', (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(new Error(explain(err)));
        });
        peer.on('disconnected', () => {
          if (!closed && peer && !peer.destroyed) peer.reconnect();
        });
      });
    },
    send(id, msg) {
      const conn = peers.get(id);
      if (conn && conn.open) conn.send(msg);
    },
    broadcast(msg) {
      for (const conn of peers.values()) if (conn.open) conn.send(msg);
    },
    close() {
      closed = true;
      peers.clear();
      if (peer && !peer.destroyed) peer.destroy();
      peer = null;
      emit('close');
    },
  };
}
