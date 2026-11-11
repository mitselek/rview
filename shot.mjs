// rview: headless screenshots through the DevTools protocol (node >= 22, Brave).
// Usage: node shot.mjs "<query string>" <shots.json | -> [width height]
// shots: [{ "out": "/tmp/x.png", "js": "rv.set({blend: 0.5}); rv.cam(...)" }, ...]; each js runs in the page first.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const [qs, shotsArg, W = '1600', H = '1000'] = process.argv.slice(2);
const shots = JSON.parse(readFileSync(shotsArg === '-' ? 0 : shotsArg, 'utf8'));
const PORT = 9333, URL_ = `http://127.0.0.1:${process.env.RVIEW_PORT ?? 41911}/index.html?${qs}`;
const gpu = (process.env.RVIEW_GPU ?? '--use-angle=vulkan --enable-features=Vulkan --enable-gpu --ignore-gpu-blocklist').split(' ').filter(Boolean);
const br = spawn('/opt/brave.com/brave/brave', ['--headless=new', '--user-data-dir=/tmp/rview-brave', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--hide-scrollbars', ...gpu, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const wait = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { wait.set(++id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
try {
  let tab;
  for (let i = 0; i < 100 && !tab; i++) {
    await sleep(200);
    try { tab = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
  }
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); }
    else if (m.method === 'Runtime.consoleAPICalled') console.log('console:', m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 400));
    else if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTION:', (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 600));
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  const t0 = Date.now();
  await send('Page.navigate', { url: URL_ });
  let ready = false;
  let dead = false; const onmsg = ws.onmessage; ws.onmessage = e => { if (e.data.includes('exceptionThrown')) dead = true; onmsg(e); };
  for (let i = 0; i < 600 && !ready && !dead; i++) { await sleep(250); ready = (await evalJs('document.title')) === 'rview ready'; }
  console.log(ready ? `ready in ${((Date.now() - t0) / 1000).toFixed(1)} s` : 'NOT READY', '|', await evalJs('document.getElementById("status").textContent'));
  console.log('gl:', await evalJs('window.rv ? rv.gl() : "no rv"'));
  for (const s of shots) {
    if (s.js) await evalJs(s.js);
    for (const [method, params] of s.cdp ?? []) { await send(method, params); await sleep(60); }
    if (s.say) console.log(s.say, await evalJs(s.say));
    const t1 = Date.now();
    await evalJs('new Promise(r => { let n = 0; const f = () => ++n < 8 ? requestAnimationFrame(f) : r(n); requestAnimationFrame(f); })');
    const png = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(s.out, Buffer.from(png.data, 'base64'));
    console.log(s.out, `(8 frames in ${Date.now() - t1} ms)`);
  }
} finally { try { ws?.close(); } catch { /* closing */ } br.kill(); }
