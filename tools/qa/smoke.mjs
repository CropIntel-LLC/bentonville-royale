#!/usr/bin/env node
// Headless-browser smoke test for a WebGL game. See README.md.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = {
    url: null, out: path.join(HERE, 'out'), wait: 4000, width: 1280, height: 720,
    evals: [], script: null, shots: 1, interval: 1500, timeout: 30000,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => {
      if (i + 1 >= argv.length) throw new Error(`missing value for ${k}`);
      return argv[++i];
    };
    if (k === '--url') a.url = v();
    else if (k === '--out') a.out = path.resolve(v());
    else if (k === '--wait') a.wait = Number(v());
    else if (k === '--width') a.width = Number(v());
    else if (k === '--height') a.height = Number(v());
    else if (k === '--eval') a.evals.push(v());
    else if (k === '--script') a.script = path.resolve(v());
    else if (k === '--shots') a.shots = Number(v());
    else if (k === '--interval') a.interval = Number(v());
    else if (k === '--timeout') a.timeout = Number(v());
    else if (k === '-h' || k === '--help') a.help = true;
    else throw new Error(`unknown argument: ${k}`);
  }
  return a;
}

const USAGE = `usage: node smoke.mjs --url <url> [--out dir] [--wait 4000] [--width 1280 --height 720]
       [--eval "<js expr>"]... [--script steps.mjs] [--shots 1 --interval 1500] [--timeout 30000]`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) => console.log(...m);

const COMMON_FLAGS = ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const GPU_FLAG_SETS = [
  ['--use-angle=metal'],
  ['--use-gl=angle', '--use-angle=swiftshader'],
  ['--enable-unsafe-swiftshader'],
];

function probeWebGL() {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2');
  if (!gl) return { ok: false, renderer: null };
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return { ok: !gl.isContextLost(), renderer: String(renderer) };
}

async function launchWithWebGL() {
  for (const flags of GPU_FLAG_SETS) {
    let browser;
    try {
      browser = await chromium.launch({ headless: true, args: [...flags, ...COMMON_FLAGS] });
      const page = await browser.newPage();
      await page.goto('about:blank');
      const r = await page.evaluate(probeWebGL);
      await page.close();
      if (r.ok) return { browser, flags, renderer: r.renderer };
      log(`[gpu] ${flags.join(' ')} -> no webgl2 context`);
    } catch (e) {
      log(`[gpu] ${flags.join(' ')} -> launch/probe failed: ${e.message.split('\n')[0]}`);
    }
    if (browser) await browser.close().catch(() => {});
  }
  return null;
}

// Screenshot the largest <canvas> and decide whether it is one flat colour.
// Pixels are decoded in a scratch page (no npm dependencies needed).
async function canvasHealth(context, page) {
  const box = await page.evaluate(() => {
    let best = null;
    for (const c of document.querySelectorAll('canvas')) {
      const r = c.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > 0 && (!best || area > best.area)) {
        best = { area, x: r.x, y: r.y, width: r.width, height: r.height, bufW: c.width, bufH: c.height };
      }
    }
    return best;
  });
  if (!box) return { found: false, blankCanvas: null };
  const vp = page.viewportSize();
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const width = Math.min(vp.width - x, Math.ceil(box.width));
  const height = Math.min(vp.height - y, Math.ceil(box.height));
  if (width <= 0 || height <= 0) return { found: true, blankCanvas: null, note: 'canvas outside viewport' };
  const png = await page.screenshot({ clip: { x, y, width, height }, type: 'png' });
  const scratch = await context.newPage();
  try {
    const stats = await scratch.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const w = Math.min(bmp.width, 256), h = Math.min(bmp.height, 256);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bmp, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      const n = w * h;
      const hist = new Map();
      for (let i = 0; i < d.length; i += 4) {
        // quantise to 4 bits/channel so noise/dithering doesn't count as content
        const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
        hist.set(key, (hist.get(key) || 0) + 1);
      }
      let top = 0, topKey = 0;
      for (const [k, v] of hist) if (v > top) { top = v; topKey = k; }
      return {
        dominantFraction: top / n,
        distinctColors: hist.size,
        dominantColor: '#' + [(topKey >> 8) & 15, (topKey >> 4) & 15, topKey & 15].map((q) => (q * 17).toString(16).padStart(2, '0')).join(''),
      };
    }, png.toString('base64'));
    return {
      found: true,
      blankCanvas: stats.dominantFraction >= 0.995,
      cssSize: [Math.round(box.width), Math.round(box.height)],
      bufferSize: [box.bufW, box.bufH],
      ...stats,
    };
  } finally {
    await scratch.close();
  }
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message + '\n' + USAGE); return 2; }
  if (args.help || !args.url) { console.error(USAGE); return 2; }
  mkdirSync(args.out, { recursive: true });

  const summary = {
    ok: false, pageErrors: 0, consoleErrors: 0, consoleWarnings: 0, failedRequests: 0,
    screenshots: [], renderer: null, gpuFlags: null, blankCanvas: null, loaded: false,
  };
  const t0 = Date.now();
  let browser = null;
  try {
    const launched = await launchWithWebGL();
    if (launched) {
      browser = launched.browser;
      summary.renderer = launched.renderer;
      summary.gpuFlags = launched.flags.join(' ');
      log(`[gpu] flags: ${summary.gpuFlags}`);
      log(`[gpu] renderer: ${summary.renderer}`);
    } else {
      log('[gpu] WARNING: no flag set produced a WebGL2 context; continuing without WebGL');
      browser = await chromium.launch({ headless: true, args: COMMON_FLAGS });
    }

    const context = await browser.newContext({ viewport: { width: args.width, height: args.height } });
    const page = await context.newPage();

    page.on('console', (m) => {
      const t = m.type();
      if (t !== 'error' && t !== 'warning') return;
      if (t === 'error') summary.consoleErrors++; else summary.consoleWarnings++;
      const loc = m.location();
      const where = loc && loc.url ? ` (${loc.url}:${loc.lineNumber})` : '';
      log(`[console.${t}] ${m.text()}${where}`);
    });
    page.on('pageerror', (e) => {
      summary.pageErrors++;
      log(`[pageerror] ${e.stack || e.message || e}`);
    });
    page.on('requestfailed', (r) => {
      summary.failedRequests++;
      log(`[requestfailed] ${r.method()} ${r.url()} ${r.failure()?.errorText ?? ''}`);
    });
    page.on('response', (r) => {
      if (r.status() >= 400) {
        summary.failedRequests++;
        log(`[http ${r.status()}] ${r.request().method()} ${r.url()}`);
      }
    });

    let shotN = 0;
    const shot = async (name = 'shot') => {
      const safe = String(name).replace(/[^\w.-]+/g, '_');
      const file = path.join(args.out, `${String(++shotN).padStart(2, '0')}-${safe}.png`);
      await page.screenshot({ path: file, type: 'png' });
      summary.screenshots.push(file);
      log(`[shot] ${file}`);
      return file;
    };
    const evalJSON = async (expr) => page.evaluate(async (src) => {
      const v = await (0, eval)(src);
      if (v === undefined) return null;
      try { return JSON.parse(JSON.stringify(v)); } catch (e) { return String(v); }
    }, expr);

    try {
      const resp = await page.goto(args.url, { waitUntil: 'load', timeout: args.timeout });
      summary.loaded = !!resp && resp.status() < 400;
      log(`[load] ${args.url} -> ${resp ? resp.status() : 'no response'}`);
    } catch (e) {
      log(`[load] FAILED ${args.url}: ${e.message.split('\n')[0]}`);
    }

    if (summary.loaded) {
      await sleep(args.wait);

      try {
        const h = await canvasHealth(context, page);
        summary.blankCanvas = h.blankCanvas;
        log(`[canvas] ${JSON.stringify(h)}`);
      } catch (e) {
        log(`[canvas] check failed: ${e.message.split('\n')[0]}`);
      }

      for (const expr of args.evals) {
        try {
          log(`[eval] ${expr} => ${JSON.stringify(await evalJSON(expr))}`);
        } catch (e) {
          summary.evalErrors = (summary.evalErrors || 0) + 1;
          log(`[eval] ${expr} !! ${e.message.split('\n')[0]}`);
        }
      }

      if (args.script) {
        let mx = args.width / 2, my = args.height / 2;
        await page.mouse.move(mx, my);
        const helpers = {
          shot,
          sleep,
          evalJSON,
          key: async (code, ms = 100) => {
            await page.keyboard.down(code);
            await sleep(ms);
            await page.keyboard.up(code);
          },
          mouseMove: async (dx, dy) => {
            mx += dx; my += dy;
            await page.mouse.move(mx, my, { steps: 5 });
          },
          click: async () => { await page.mouse.click(mx, my); },
        };
        try {
          const mod = await import(pathToFileURL(args.script).href);
          if (typeof mod.default !== 'function') throw new Error('script must export a default async function(page, helpers)');
          await mod.default(page, helpers);
          log(`[script] ${args.script} done`);
        } catch (e) {
          summary.scriptError = String(e.message || e).split('\n')[0];
          log(`[script] FAILED: ${e.stack || e}`);
        }
      }

      for (let i = 0; i < args.shots; i++) {
        if (i > 0) await sleep(args.interval);
        await shot('shot');
      }
    }
  } catch (e) {
    summary.harnessError = String(e.message || e).split('\n')[0];
    log(`[harness] ${e.stack || e}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  summary.ok = summary.loaded && summary.pageErrors === 0 && !summary.harnessError;
  summary.ms = Date.now() - t0;
  console.log(JSON.stringify(summary));
  return summary.ok ? 0 : 1;
}

main().then((code) => process.exit(code));
