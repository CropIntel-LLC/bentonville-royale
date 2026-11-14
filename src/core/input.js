// BENTONVILLE ROYALE — keyboard / mouse / pointer-lock state.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // key codes that went down since the last endFrame()
    this.buttons = [false, false, false];
    this.clicked = [false, false, false];
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
    this.enabled = true;
    this.onLockChange = null;

    this._down = (e) => {
      if (e.repeat) return;
      if (!this.enabled) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (this.locked && (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow'))) e.preventDefault();
    };
    this._up = (e) => this.keys.delete(e.code);
    this._mdown = (e) => {
      if (!this.locked || !this.enabled) return;
      if (e.button < 3) {
        this.buttons[e.button] = true;
        this.clicked[e.button] = true;
      }
    };
    this._mup = (e) => {
      if (e.button < 3) this.buttons[e.button] = false;
    };
    this._move = (e) => {
      if (!this.locked) return;
      this.dx += e.movementX || 0;
      this.dy += e.movementY || 0;
    };
    this._wheel = (e) => {
      if (this.locked) this.wheel += Math.sign(e.deltaY);
    };
    this._lock = () => {
      if (!this.locked) this.releaseAll();
      if (this.onLockChange) this.onLockChange(this.locked);
    };
    this._blur = () => this.releaseAll();
    this._ctx = (e) => e.preventDefault();

    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('mousedown', this._mdown);
    window.addEventListener('mouseup', this._mup);
    window.addEventListener('mousemove', this._move);
    window.addEventListener('wheel', this._wheel, { passive: true });
    window.addEventListener('blur', this._blur);
    document.addEventListener('pointerlockchange', this._lock);
    canvas.addEventListener('contextmenu', this._ctx);
  }

  get locked() {
    return document.pointerLockElement === this.canvas;
  }

  lock() {
    if (this.locked) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (err) {
      /* not allowed right now (no user gesture) */
    }
  }

  unlock() {
    if (this.locked) document.exitPointerLock();
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
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
  }
}
