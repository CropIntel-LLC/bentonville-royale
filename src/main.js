// BENTONVILLE ROYALE — entry point: boot into the title screen, wire menus to the game.

import { Game } from './game/Game.js';
import { createMenus } from './ui/menus.js';
import { loadSettings, saveSettings } from './ui/settings.js';
import { sfx } from './audio/Sfx.js';
import { createGoogleTilesController, hasGoogleTilesKey } from './render/GoogleTiles.js';
import { NetMatch } from './net/Match.js';

const canvas = document.getElementById('game');
const uiRoot = document.getElementById('ui-root');
const bootError = document.getElementById('boot-error');

function showError(msg) {
  bootError.textContent = msg;
  bootError.style.display = 'block';
}

let settings = loadSettings();
sfx.autoUnlock(window);
sfx.setVolume(settings.volume);

// Optional local menu music, served only by the local dev/preview server from
// local-music/menu.mp3 (git-ignored, never built or deployed). Falls back to
// the synthesized theme when absent.
fetch('/local-music/menu.mp3', { method: 'HEAD' })
  .then((r) => {
    const type = r.headers.get('content-type') || '';
    if (r.ok && type.startsWith('audio/')) sfx.setCustomMusic('menu', '/local-music/menu.mp3');
  })
  .catch(() => {});

let game = null;
let match = null;

const NAME_KEY = 'bentonville-royale.playerName';

function closeMatch() {
  if (!match) return;
  match.close();
  match = null;
}

function rememberName(name) {
  const clean = String(name || '').trim().slice(0, 16);
  if (clean) localStorage.setItem(NAME_KEY, clean);
  return clean || 'Player';
}

// Optional Google Photorealistic 3D Tiles view (off by default; inert without a key).
// The library is only imported when the toggle is on and a key is configured.
const googleTiles = createGoogleTilesController({
  getGame: () => game,
  onFail: () => {
    settings = { ...settings, googleTiles: false };
    saveSettings(settings);
    menus.setSettings(settings);
  },
});

const menus = createMenus(uiRoot, {
  settings,
  onClick: () => sfx.play('ui_click'),
  onHover: () => sfx.play('ui_hover', { volume: 0.4 }),
  onPlay: () => play(),
  onPlayAgain: () => {
    if (game && game.role === 'host' && match) startHosted();
    else if (game && game.role === 'client') menus.showLobby(match ? match.lobbyInfo({ status: 'Waiting for the host to start again' }) : { status: 'The host starts the next match' });
    else play();
  },
  onResume: () => game && game.pause(false),
  onLeave: () => {
    closeMatch();
    if (game) {
      game.prepareNet({ role: 'solo' });
      game.leave();
    }
    sfx.playMusic('menu');
  },
  onHost: (name) => hostMatch(name),
  onJoin: (code, name) => joinMatch(code, name),
  onLobbyStart: () => startHosted(),
  onLobbyLeave: () => {
    closeMatch();
    if (game) game.prepareNet({ role: 'solo' });
  },
  googleTilesAvailable: hasGoogleTilesKey(),
  onSettings: (s) => {
    settings = s;
    saveSettings(s);
    googleTiles.setEnabled(s.googleTiles);
    if (game) game.applySettings(s);
    else sfx.setVolume(s.volume);
  },
});

async function ensureLoaded() {
  if (!game.loaded) {
    menus.showLoading(0, 'Warming up');
    await game.load((p, label) => menus.setLoading(p, label));
  }
}

async function play() {
  try {
    closeMatch();
    game.prepareNet({ role: 'solo' });
    await ensureLoaded();
    game.startMatch();
  } catch (err) {
    console.error(err);
    showError('Could not start the match: ' + (err && err.message ? err.message : err));
    menus.showTitle();
  }
}

function attachMatch(next) {
  next.onLobby = (info) => menus.showLobby(info);
  next.onError = (text) => menus.lobbyError(text);
  next.onClosed = () => {
    closeMatch();
    if (game && game.state !== 'menu') game.leave();
    else menus.showFriends();
    sfx.playMusic('menu');
  };
  next.onStart = async (seed, hostId) => {
    try {
      game.hostId = hostId;
      game.prepareNet({ role: 'client', selfId: next.id, name: next.name, hostId });
      await ensureLoaded();
      game.player.predictOnly = true;
      game.startMatch(seed);
    } catch (err) {
      console.error(err);
      showError('Could not join the match: ' + (err && err.message ? err.message : err));
      menus.showFriends();
    }
  };
}

async function hostMatch(name) {
  const who = rememberName(name);
  closeMatch();
  match = new NetMatch();
  attachMatch(match);
  menus.showLobby({ role: 'host', code: '……', players: [{ name: who, host: true }], status: 'Opening a room…' });
  try {
    const code = await match.host(who);
    game.prepareNet({ role: 'host', selfId: code, name: who, hostId: code });
    match.bind(game);
  } catch (err) {
    console.error(err);
    menus.lobbyError(err && err.message ? err.message : 'Could not open a room.');
    closeMatch();
  }
}

async function joinMatch(code, name) {
  const who = rememberName(name);
  closeMatch();
  match = new NetMatch();
  attachMatch(match);
  menus.showLobby({ role: 'client', code: String(code || '').toUpperCase(), players: [], status: 'Joining…' });
  try {
    await match.join(code, who);
    game.prepareNet({ role: 'client', selfId: match.id, name: who, hostId: match.hostId });
    match.bind(game);
  } catch (err) {
    console.error(err);
    menus.lobbyError(err && err.message ? err.message : 'Could not join.');
    closeMatch();
    menus.showFriends();
  }
}

async function startHosted() {
  if (!match || match.role !== 'host') return;
  try {
    await ensureLoaded();
    match.bind(game);
    game.prepareNet({ role: 'host', selfId: match.id, name: match.name, hostId: match.id });
    game.startMatch((Math.random() * 1e9) | 0);
    match.began();
  } catch (err) {
    console.error(err);
    showError('Could not start the match: ' + (err && err.message ? err.message : err));
    menus.showLobby(match.lobbyInfo());
  }
}

try {
  game = new Game({ canvas, uiRoot, menus, settings });
  menus.showTitle();
  sfx.playMusic('menu');
  googleTiles.setEnabled(settings.googleTiles);
} catch (err) {
  console.error(err);
  showError('Bentonville Royale needs WebGL: ' + (err && err.message ? err.message : err));
}
