// A keyboard/mouse stand-in filled from a guest's packet. Same shape as Input
// (down, hit, buttons, clicked, wheel) so Player.update can read it.
// Called from src/net/Match.js and src/game/Game.js. No other input replica exists.

const CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ControlLeft', 'KeyZ', 'Space', 'KeyE', 'KeyR', 'KeyF', 'KeyQ', 'KeyC', 'KeyV', 'KeyX', 'KeyG', 'KeyB', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];

export class NetInput {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.buttons = [false, false, false];
    this.clicked = [false, false, false];
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
  }

  down(code) {
    return this.keys.has(code);
  }

  hit(code) {
    return this.pressed.has(code);
  }

  releaseAll() {
    this.keys.clear();
    this.buttons[0] = this.buttons[1] = this.buttons[2] = false;
  }

  endFrame() {
    this.pressed.clear();
    this.clicked[0] = this.clicked[1] = this.clicked[2] = false;
    this.wheel = 0;
  }

  /** Merge one packet. `keys` is what is held; `hit` is edges since the last packet. */
  apply(pkt) {
    this.keys.clear();
    const held = pkt.keys || [];
    for (let i = 0; i < held.length; i++) if (CODES.includes(held[i])) this.keys.add(held[i]);
    const edges = pkt.hit || [];
    for (let i = 0; i < edges.length; i++) if (CODES.includes(edges[i])) this.pressed.add(edges[i]);
    const b = pkt.btn | 0;
    const c = pkt.click | 0;
    for (let i = 0; i < 3; i++) {
      this.buttons[i] = !!(b & (1 << i));
      this.clicked[i] = !!(c & (1 << i));
    }
    this.wheel = pkt.wheel | 0;
  }
}

/** Sample the real Input into a packet. Call before Input.endFrame. */
export function sampleInput(input) {
  const keys = [];
  const hit = [];
  for (const code of CODES) {
    if (input.down(code)) keys.push(code);
    if (input.hit(code)) hit.push(code);
  }
  let btn = 0;
  let click = 0;
  for (let i = 0; i < 3; i++) {
    if (input.buttons[i]) btn |= 1 << i;
    if (input.clicked[i]) click |= 1 << i;
  }
  return { keys, hit, btn, click, wheel: input.wheel | 0 };
}
