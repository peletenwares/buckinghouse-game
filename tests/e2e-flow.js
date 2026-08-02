// Prueba E2E de navegador — flujo completo de tres etapas.
// STAGE 1 (gatos) -> STAGE 2 (Nico) -> STAGE 3 (despertarlos) -> GAME COMPLETE.
//
// Requisitos:  Node + Playwright + Chrome/Edge instalado.
//   npm i -D playwright            (o tener 'playwright' resoluble por NODE_PATH)
//   node tests/e2e-flow.js
//
// Levanta su propio servidor estático (sin dependencias) y conduce el juego en
// un navegador real, verificando: cronómetro de 60s, sin bonos, avance de
// etapas, GAME_COMPLETE, "jugar de nuevo", páginas dev, y cero errores/404.

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

function startServer() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404; res.end('404'); return;
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}

function loadPlaywright() {
  try { return require('playwright'); }
  catch (e) { console.error('No se encontró Playwright. Instala con: npm i -D playwright'); process.exit(2); }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = await startServer();
  const BASE = 'http://localhost:' + server.address().port;
  const { chromium } = loadPlaywright();
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome', headless: true }); }
  catch (e) { browser = await chromium.launch({ channel: 'msedge', headless: true }); }

  const results = [];
  const check = (label, ok, detail) => results.push([!!ok, label, detail || '']);

  function hook(page, bag) {
    page.on('console', m => { if (m.type() === 'error') { const l = m.location && m.location(); bag.console.push(m.text() + ' @ ' + ((l && l.url) || '?')); } });
    page.on('pageerror', e => bag.page.push(e.message));
    page.on('response', r => { if (r.status() >= 400) bag.http.push(r.status() + ' ' + r.url()); });
    page.on('requestfailed', r => bag.http.push('FAILED ' + r.url()));
  }
  const freshBag = () => ({ console: [], page: [], http: [] });

  // ─── Flujo principal ───────────────────────────────────────────────────────
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const bag = freshBag(); hook(page, bag);

  await page.goto(BASE + '/index.html?debug=1', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('buckinghouse_progress'));

  check('index.html expone el controlador de flujo',
    await page.evaluate(() => typeof goToStage2 === 'function' && typeof goToStage3 === 'function' && typeof showGameComplete === 'function'));

  // Stage 1 sigue funcionando
  await page.click('#startBtn');
  await page.waitForFunction(() => typeof running !== 'undefined' && running === true, { timeout: 8000 }).catch(() => {});
  check('Stage 1 arranca (loop activo)', await page.evaluate(() => typeof S === 'object' && S && S.phase === 'play'));

  // Selector con desbloqueo debug
  await page.evaluate(() => showStageSelect());
  await sleep(150);
  check('Selector visible', await page.evaluate(() => getComputedStyle(document.getElementById('stageSelectScreen')).display !== 'none'));
  check('Debug desbloquea Etapas 2 y 3',
    await page.evaluate(() => !document.getElementById('selStage2').disabled && !document.getElementById('selStage3').disabled));

  // Etapa 2
  await page.click('#selStage2');
  await page.waitForFunction(() => window.Stage2 && Stage2.state && Stage2.state().key !== null, { timeout: 8000 });
  await sleep(300);
  const s2 = await page.evaluate(() => Stage2.state());
  check('Etapa 2 inicia con cronómetro en 60', Math.abs((s2.timer || 0) - 60) < 1.5, 'timer=' + s2.timer);
  check('Canvas de Etapa 2 presente (s2canvas)', await page.evaluate(() => !!document.getElementById('s2canvas')));

  // Timer corre tras INTRO y nunca supera 60
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => Stage2.state().key && Stage2.state().key !== 'INTRO', { timeout: 6000 }).catch(() => {});
  const s2play = await page.evaluate(() => Stage2.state());
  await sleep(1500);
  const s2after = await page.evaluate(() => Stage2.state());
  await page.keyboard.up('ArrowRight');
  check('Cronómetro corre tras INTRO', s2after.timer < s2play.timer, s2play.timer + '->' + s2after.timer);
  check('Cronómetro nunca supera 60', s2after.timer <= 60.001 && s2play.timer <= 60.001);

  // Avanzar a COMPLETE con la tecla debug (BracketRight), sosteniendo cada pulsación 1 frame
  for (let i = 0; i < 12; i++) {
    await page.keyboard.down('BracketRight'); await sleep(70);
    await page.keyboard.up('BracketRight'); await sleep(90);
    if (await page.evaluate(() => Stage2.state().key) === 'COMPLETE') break;
  }
  await page.waitForFunction(() => getComputedStyle(document.getElementById('stage2DoneScreen')).display !== 'none', { timeout: 8000 }).catch(() => {});
  check('Etapa 2 completa -> pantalla "Continuar a Etapa 3"',
    await page.evaluate(() => getComputedStyle(document.getElementById('stage2DoneScreen')).display !== 'none'));
  check('Completar Etapa 2 habilita Etapa 3 (progreso)',
    await page.evaluate(() => { try { return !!JSON.parse(localStorage.getItem('buckinghouse_progress')).stage2Completed; } catch (e) { return false; } }));
  check('Canvas de Etapa 2 removido al completar', await page.evaluate(() => !document.getElementById('s2canvas')));

  // Etapa 3 (wake-up)
  await page.click('#toStage3Btn');
  await page.waitForFunction(() => !!document.getElementById('s3canvas'), { timeout: 8000 }).catch(() => {});
  check('La etapa wake-up carga como Etapa 3 (s3canvas)', await page.evaluate(() => !!document.getElementById('s3canvas')));
  check('window.Stage3 disponible', await page.evaluate(() => !!(window.Stage3 && Stage3.state)));
  await sleep(400);

  // Completar Etapa 3 (cableado del host) -> GAME_COMPLETE
  await page.evaluate(() => onStage3Complete({ score: 500 }));
  await page.waitForFunction(() => getComputedStyle(document.getElementById('gameCompleteScreen')).display !== 'none', { timeout: 3000 }).catch(() => {});
  check('Completar Etapa 3 -> GAME_COMPLETE', await page.evaluate(() => getComputedStyle(document.getElementById('gameCompleteScreen')).display !== 'none'));
  check('GAME_COMPLETE muestra resumen de etapas', await page.evaluate(() => /Etapa 3/.test(document.getElementById('gameSummary').textContent)));
  check('Progreso stage3Completed guardado',
    await page.evaluate(() => { try { return !!JSON.parse(localStorage.getItem('buckinghouse_progress')).stage3Completed; } catch (e) { return false; } }));

  // Jugar de nuevo -> Etapa 1, sin canvases residuales (sin loops/listeners duplicados)
  await page.click('#playAgainBtn');
  await sleep(1500);
  check('Jugar de nuevo reinicia en Etapa 1 (sin canvases de etapa 2/3)',
    await page.evaluate(() => !document.getElementById('s2canvas') && !document.getElementById('s3canvas') && getComputedStyle(document.getElementById('game')).display !== 'none'));

  check('Flujo sin errores de página', bag.page.length === 0, bag.page.join(' | '));
  check('Flujo sin rutas 404', bag.http.length === 0, bag.http.join(' , '));
  check('Flujo sin errores de consola', bag.console.length === 0, bag.console.slice(0, 4).join(' | '));

  // ─── Páginas dev cargan sin errores ─────────────────────────────────────────
  for (const url of ['/stage2-dev.html', '/stage3-dev.html', '/debug-stage2.html', '/debug-stage3.html']) {
    const dp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const dbag = freshBag(); hook(dp, dbag);
    const r = await dp.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => null);
    await sleep(600);
    const ok = r && r.status() === 200 && dbag.page.length === 0 && dbag.http.length === 0;
    check('Dev/debug carga sin errores: ' + url, ok, 'page=' + dbag.page.join('|') + ' http=' + dbag.http.join('|'));
    await dp.close();
  }

  await browser.close();
  server.close();

  let fail = 0;
  for (const [ok, label, detail] of results) { console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : ' — ' + detail)); if (!ok) fail++; }
  console.log('\n' + (results.length - fail) + '/' + results.length + ' checks passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('E2E ERROR', e.stack || e.message); process.exit(1); });
