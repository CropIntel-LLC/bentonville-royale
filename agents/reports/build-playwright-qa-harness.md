# Build Playwright QA harness
Agent id: `agent-acc446a24cc16047d`
Model: claude-fable-5-2. Type: general-purpose background agent.
Harness is working in `/Users/shehryarahmed/Bentonville_Royale/tools/qa/` and passed its self-test.

**Command:**
```
node tools/qa/smoke.mjs --url http://localhost:5173 [--wait 4000] [--eval "expr"] [--script steps.mjs] [--shots 3 --interval 1500]
```

**GPU:** the first flag, `--use-angle=metal`, worked. Renderer: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`. The SwiftShader fallbacks were never exercised.

**Self-test (observed, against `selftest/index.html` on port 5190):**
- `[console.error] selftest-error` was captured.
- `--eval "1+1"` printed 2.
- `blankCanvas` was false (about 90% background).
- I opened `out/01-shot.png` and the RGB triangle is clearly visible.
- The summary line printed and the exit code was 0.
- With `selftest/steps.mjs`, all helpers ran, and `key('KeyW')` reached the page (`__game.keys.KeyW` was true).
- A 404 URL gave `ok:false`, with the 404 counted in `failedRequests`.
- The server is killed.

**Time:** about 2s of overhead plus `--wait`. The default run is about 6s, and the first cold run was 9s.

**Does not work / caveats:**
- Pointer lock is not tested and is assumed unavailable headlessly; `mouseMove` sends plain mousemove events only, so drive the game via `window.__game`.
- Console errors and failed requests do not fail the run; only a load failure or a `pageerror` does.
- Order is fixed: wait, canvas check, evals, script, then shots.
- The out dir is not cleared between runs.
- `npm i` failed on its first attempt with a network error and succeeded on retry (Playwright 1.65.1).

A root `package.json` ("bentonville-royale") appeared at 13:19 during my run. I did not create it; presumably another agent did.

README: `/Users/shehryarahmed/Bentonville_Royale/tools/qa/README.md`
