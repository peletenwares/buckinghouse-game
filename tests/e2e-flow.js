// Prueba E2E de navegador — flujo de tres etapas jugado con ENTRADAS REALES.
// STAGE 1 (smoke) -> STAGE 2 (teclado real) -> STAGE 3 (resortera real) -> GAME COMPLETE.
//
// No usa teclas de debug para saltar escenas ni invoca hooks de victoria: la
// Etapa 2 se juega con flechas/espacio y la Etapa 3 lanzando despertadores con
// el mouse hasta llenar la barra; el callback onComplete se dispara solo.
// Se entra a la Etapa 2 por el selector (desbloqueo debug) — función legítima,
// no un salto dentro de la etapa.
//
// Requisitos: Node + Playwright + Chrome/Edge.  node tests/e2e-flow.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function startServer() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; res.end('404'); return; }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}
function loadPlaywright() {
  try { return require('playwright'); }
  catch (e) { console.error('Falta Playwright. Instala: npm i -D playwright'); process.exit(2); }
}

// ── Bot de Stage 2: teclado real (flechas + espacio) hasta que el host muestre
//    la pantalla de resultados (onComplete se disparó de forma natural). ──────
async function playStage2(page, timeoutMs) {
  const t0 = Date.now();
  const held = new Set();
  const hold = async (k, on) => { if (on && !held.has(k)) { await page.keyboard.down(k); held.add(k); } else if (!on && held.has(k)) { await page.keyboard.up(k); held.delete(k); } };
  const releaseAll = async () => { for (const k of Array.from(held)) { await page.keyboard.up(k); held.delete(k); } };
  let prevX = null, stall = 0, jumpBusy = 0, cool = 0, hopT = 0;
  const TICK = 40;
  while (Date.now() - t0 < timeoutMs) {
    const done = await page.evaluate(() => getComputedStyle(document.getElementById('stage2DoneScreen')).display !== 'none');
    if (done) { await releaseAll(); return { done: true }; }
    const s = await page.evaluate(() => (window.Stage2 && Stage2.state) ? Stage2.state() : null);
    if (!s || !s.key) { await sleep(TICK); continue; }
    if (s.key === 'FAILED') {   // reintentar: la pantalla de derrota reinicia con Espacio
      await releaseAll(); await page.keyboard.down('Space'); await sleep(90); await page.keyboard.up('Space');
      prevX = null; stall = 0; jumpBusy = 0; cool = 0; hopT = 0; await sleep(250); continue;
    }
    let goRight = true, goLeft = false, wantJump = false;
    if (s.key === 'BUS_STOP') {
      const bh = s.boardHint, px = s.playerX;
      if (bh && bh.open && bh.doorX != null && px != null) { const dx = bh.doorX - px; goRight = dx > 6; goLeft = dx < -6; }
      else { const dx = 700 - (px != null ? px : 700); goRight = dx > 10; goLeft = dx < -10; }  // esperar en la parada
    }
    const x = s.playerX;
    if (x != null && prevX != null && Math.abs(x - prevX) < 0.8) stall++; else stall = 0;
    prevX = x;
    // Cruce: saltar SOLO al estar sobre una plataforma (hop fiable, sin caídas por mistiming).
    if (s.key === 'MOVING_PLATFORM_CROSSING') { if (s.onGround) wantJump = true; }
    else if (stall > 4) wantJump = true;
    if (cool > 0) cool -= TICK;
    if (wantJump && cool <= 0 && jumpBusy <= 0) { jumpBusy = 120; cool = 190; }
    await hold('ArrowRight', goRight); await hold('ArrowLeft', goLeft);
    if (jumpBusy > 0) { await hold('Space', true); jumpBusy -= TICK; if (jumpBusy <= 0) await hold('Space', false); }
    await sleep(TICK);
  }
  await releaseAll();
  return { done: false };
}

// ── Bot de Stage 3: resortera real (pointer events) hasta alarma 100%. ───────
const S3P = { x: 640, y: 577 };
const S3T = [ { x: 335, y: 142 }, { x: 715, y: 127 }, { x: 1115, y: 127 } ];
function s3drag(t) {
  const dist = Math.hypot(t.x - S3P.x, t.y - S3P.y);
  const flight = dist / 560, drop = 0.5 * 300 * flight * flight, aimY = t.y - drop;
  let lx = t.x - S3P.x, ly = aimY - S3P.y; const ln = Math.hypot(lx, ly); lx /= ln; ly /= ln;
  return { x: S3P.x - lx * 118, y: S3P.y - ly * 118 };
}
async function playStage3(page, timeoutMs) {
  const t0 = Date.now(); let shots = 0;
  while (Date.now() - t0 < timeoutMs && shots < 120) {
    const s = await page.evaluate(() => (window.Stage3 && Stage3.state) ? Stage3.state() : null);
    if (!s) { await sleep(120); continue; }
    if (s.phase === 'completed' || s.alarm >= 100) return { completed: true, shots };
    const d = s3drag(S3T[shots % 3]);
    await page.mouse.move(S3P.x, S3P.y); await page.mouse.down();
    for (let i = 1; i <= 4; i++) await page.mouse.move(S3P.x + (d.x - S3P.x) * i / 4, S3P.y + (d.y - S3P.y) * i / 4);
    await page.mouse.up(); shots++; await sleep(340);
  }
  return { completed: false, shots };
}

(async () => {
  const server = await startServer();
  const BASE = 'http://localhost:' + server.address().port;
  const { chromium } = loadPlaywright();
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome', headless: true }); }
  catch (e) { browser = await chromium.launch({ channel: 'msedge', headless: true }); }

  const results = [];
  const check = (label, ok, detail) => results.push([!!ok, label, detail || '']);
  const freshBag = () => ({ console: [], page: [], http: [] });
  function hook(page, bag) {
    page.on('console', m => { if (m.type() === 'error') { const l = m.location && m.location(); bag.console.push(m.text() + ' @ ' + ((l && l.url) || '?')); } });
    page.on('pageerror', e => bag.page.push(e.message));
    page.on('response', r => { if (r.status() >= 400) bag.http.push(r.status() + ' ' + r.url()); });
    page.on('requestfailed', r => bag.http.push('FAILED ' + r.url()));
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const bag = freshBag(); hook(page, bag);
  await page.goto(BASE + '/index.html?debug=1', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('buckinghouse_progress'));

  check('Controlador de flujo presente',
    await page.evaluate(() => typeof goToStage2 === 'function' && typeof goToStage3 === 'function'));

  // Stage 1 smoke: arranca y corre.
  await page.click('#startBtn');
  await page.waitForFunction(() => typeof running !== 'undefined' && running === true, { timeout: 8000 }).catch(() => {});
  check('Stage 1 arranca y corre (smoke)', await page.evaluate(() => typeof S === 'object' && S && S.phase === 'play'));

  // Entrar a Etapa 2 por el selector (desbloqueo debug) y JUGARLA de verdad.
  await page.evaluate(() => showStageSelect());
  await sleep(150);
  check('Selector desbloquea etapas con debug',
    await page.evaluate(() => !document.getElementById('selStage2').disabled && !document.getElementById('selStage3').disabled));
  await page.click('#selStage2');
  await page.waitForFunction(() => window.Stage2 && Stage2.state && Stage2.state().key, { timeout: 8000 });
  await sleep(200);
  check('Etapa 2 inicia con cronómetro en 60', Math.abs((await page.evaluate(() => Stage2.state().timer)) - 60) < 1.5);

  const s2res = await playStage2(page, 90000);
  check('Etapa 2 completada con teclado real (pantalla de resultados)', s2res.done);
  const s2stats = await page.evaluate(() => document.getElementById('stage2Stats').textContent);
  check('Resultados de Etapa 2 mostrados', /Tiempo restante/.test(s2stats), s2stats);
  check('Progreso stage2Completed guardado',
    await page.evaluate(() => { try { return !!JSON.parse(localStorage.getItem('buckinghouse_progress')).stage2Completed; } catch (e) { return false; } }));
  check('Sin canvas de Etapa 2 tras completar', await page.evaluate(() => !document.getElementById('s2canvas')));

  // Continuar a Etapa 3 y JUGARLA con la resortera hasta la victoria natural.
  await page.click('#toStage3Btn');
  await page.waitForFunction(() => !!document.getElementById('s3canvas'), { timeout: 8000 }).catch(() => {});
  await sleep(400);
  check('Etapa 3 (wake-up) activa con canvas propio', await page.evaluate(() => !!document.getElementById('s3canvas')));
  const s3res = await playStage3(page, 60000);
  check('Etapa 3 completada jugando la resortera (alarma 100%)', s3res.completed, 'shots=' + s3res.shots);
  await page.waitForFunction(() => getComputedStyle(document.getElementById('gameCompleteScreen')).display !== 'none', { timeout: 5000 }).catch(() => {});
  check('onComplete natural -> GAME_COMPLETE', await page.evaluate(() => getComputedStyle(document.getElementById('gameCompleteScreen')).display !== 'none'));
  check('Resumen final con las 3 etapas', await page.evaluate(() => /Etapa 3/.test(document.getElementById('gameSummary').textContent)));
  check('Progreso stage3Completed guardado',
    await page.evaluate(() => { try { return !!JSON.parse(localStorage.getItem('buckinghouse_progress')).stage3Completed; } catch (e) { return false; } }));
  check('Sin canvas de Etapa 3 tras completar', await page.evaluate(() => !document.getElementById('s3canvas')));

  // Jugar de nuevo -> Etapa 1, sin canvases residuales (sin loops duplicados).
  await page.click('#playAgainBtn');
  await sleep(1500);
  check('Jugar de nuevo reinicia en Etapa 1 sin canvases de etapa',
    await page.evaluate(() => !document.getElementById('s2canvas') && !document.getElementById('s3canvas') && getComputedStyle(document.getElementById('game')).display !== 'none'));

  check('Flujo sin errores de página', bag.page.length === 0, bag.page.join(' | '));
  check('Flujo sin rutas 404', bag.http.length === 0, bag.http.join(' , '));
  check('Flujo sin errores de consola', bag.console.length === 0, bag.console.slice(0, 4).join(' | '));

  // Persistencia / desbloqueo (sin debug): el selector respeta localStorage.
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await p2.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  // Con Etapa 1 y 2 marcadas como completadas, se desbloquean Etapa 2 (tras la 1)
  // y Etapa 3 (tras la 2). Escribir el progreso simula haberlas superado.
  await p2.evaluate(() => localStorage.setItem('buckinghouse_progress',
    JSON.stringify({ stage1Completed: true, stage2Completed: true, stage3Completed: false })));
  await p2.reload({ waitUntil: 'networkidle' });
  await p2.evaluate(() => showStageSelect()); await sleep(150);
  check('Sin debug: progreso guardado desbloquea Etapas 2 y 3',
    await p2.evaluate(() => !document.getElementById('selStage2').disabled && !document.getElementById('selStage3').disabled));
  await p2.evaluate(() => localStorage.removeItem('buckinghouse_progress'));
  await p2.reload({ waitUntil: 'networkidle' });
  await p2.evaluate(() => showStageSelect()); await sleep(150);
  check('Progreso limpio: solo Etapa 1 disponible',
    await p2.evaluate(() => document.getElementById('selStage2').disabled && document.getElementById('selStage3').disabled));
  await p2.close();

  // Páginas dev/debug cargan sin errores.
  for (const url of ['/stage2-dev.html', '/stage3-dev.html', '/debug-stage2.html', '/debug-stage3.html']) {
    const dp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const dbag = freshBag(); hook(dp, dbag);
    const r = await dp.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => null);
    await sleep(600);
    check('Dev/debug sin errores: ' + url, r && r.status() === 200 && dbag.page.length === 0 && dbag.http.length === 0,
      'page=' + dbag.page.join('|') + ' http=' + dbag.http.join('|'));
    await dp.close();
  }

  await browser.close();
  server.close();
  let fail = 0;
  for (const [ok, label, detail] of results) { console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : ' — ' + detail)); if (!ok) fail++; }
  console.log('\n' + (results.length - fail) + '/' + results.length + ' checks passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('E2E ERROR', e.stack || e.message); process.exit(1); });
