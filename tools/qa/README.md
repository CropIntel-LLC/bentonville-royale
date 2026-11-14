# tools/qa — headless WebGL smoke test

Self-contained (own `package.json` / `node_modules`). Setup once:

```
cd tools/qa && npm i && npx playwright install chromium
```

## Usage

```
node tools/qa/smoke.mjs --url http://localhost:5173 [--out tools/qa/out] [--wait 4000]
     [--width 1280 --height 720] [--timeout 30000]
     [--eval "<js expression>"]      repeatable; result printed as JSON
     [--script path/to/steps.mjs]    scripted steps (see below)
     [--shots 3 --interval 1500]     N final screenshots spaced by interval (default 1)
```

Order of operations: launch Chromium (first GPU flag set that yields a WebGL2 context:
`--use-angle=metal`, then SwiftShader fallbacks) -> load page -> `--wait` -> canvas health
check -> `--eval`s -> `--script` -> `--shots`.

Output lines are prefixed: `[gpu]`, `[load]`, `[console.error]`, `[console.warning]`,
`[pageerror]`, `[requestfailed]`, `[http 404]`, `[canvas]`, `[eval]`, `[shot]`, `[script]`.
The last line is always a one-line JSON summary:

```
{ok, pageErrors, consoleErrors, consoleWarnings, failedRequests, screenshots:[...], renderer, gpuFlags, blankCanvas, loaded, ms}
```

- Exit code 0 = page loaded (HTTP < 400) and no uncaught page errors; otherwise 1 (2 = bad args).
  Console errors and failed requests are reported but do not fail the run.
- `blankCanvas` is true when >= 99.5% of the largest `<canvas>` is one colour
  (`null` if there is no canvas). `failedRequests` includes HTTP >= 400 responses.
- Screenshots are `NN-name.png` in the out dir (default `tools/qa/out`); old files are overwritten, not cleared.

## Steps script

```js
// steps.mjs
export default async function (page, h) {
  await h.shot('menu');                       // -> out/01-menu.png
  await h.click();                            // click at current mouse pos (starts at centre)
  await h.key('KeyW', 800);                   // hold W for 800 ms (keyboard.down/up)
  await h.mouseMove(200, 0);                  // relative move, in CSS px
  await h.sleep(500);
  const pos = await h.evalJSON('window.__game && window.__game.player?.position');
  console.log('player', JSON.stringify(pos));
  await h.shot('after-move');
}
```

`helpers`: `shot(name)`, `key(code, ms)`, `mouseMove(dx, dy)`, `click()`, `sleep(ms)`,
`evalJSON(expr)` (expression evaluated in the page, promises awaited, result JSON-cloned).
`page` is the raw Playwright page.

## Limitations

- Pointer lock is generally not granted in headless Chromium; `mouseMove` produces normal
  `mousemove` events (with `movementX/Y`), but code gated on `document.pointerLockElement`
  will not run. Drive the game through `window.__game` via `evalJSON` instead.
- No audio output is verified (autoplay is allowed, nothing is listened to).
- Each run starts a fresh browser; there is no persistent state between runs.

## Self-test

```
python3 -m http.server 5190 --directory tools/qa/selftest &
node tools/qa/smoke.mjs --url http://localhost:5190 --eval "1+1" --script tools/qa/selftest/steps.mjs
```

Expect a rotating RGB triangle in the screenshots, `blankCanvas:false`, and one captured
`[console.error] selftest-error`.
