// Example steps script: node tools/qa/smoke.mjs --url ... --script tools/qa/selftest/steps.mjs
export default async function (page, h) {
  await h.shot('start');
  await h.click();              // focus the page (pointer lock will NOT be granted headlessly)
  await h.key('KeyW', 500);     // hold W for 500 ms
  await h.mouseMove(120, -40);  // relative mouse move
  await h.sleep(300);
  console.log('[steps] game state:', JSON.stringify(await h.evalJSON('window.__game')));
  await h.shot('after-input');
}
