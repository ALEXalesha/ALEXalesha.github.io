// Законы браузерного «Хаба» (index.html в корне репозитория).
//
// Страница проверяется двумя способами, как её откроют люди:
//   file - двойной щелчок по index.html (Chromium БЕЗ --allow-file-access-from-files:
//          страницы с диска друг другу чужие, как у обычного человека);
//   http - сайт, как GitHub Pages: на деле Хаб - корневой сайт https://alexalesha.github.io/,
//          а свой маленький сервер отдаёт репозиторий из подпапки /hub/, так что любой
//          путь от корня сайта сломался бы. Страница здесь изолирована (hub-coi-sw.js),
//          как на сайте.
//
// Захват мыши - ТОЛЬКО заглушка: настоящий requestPointerLock в Chromium без окна всё
// равно зажимает курсор человека за этим компьютером. Подмена ставится до скриптов
// страницы и во всех рамках (addInitScript), сторож после каждой проверки смотрит, что
// подмену никто не снял и захвата нет ни в одной рамке.
const { test, expect } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const DATA = require('../web/_shared/games-data.js');

const ROOT = path.join(__dirname, '..');
const ITEMS = [...DATA.GAMES, ...DATA.PROGRAMS, ...DATA.SYSTEMS];  // в порядке карточек на странице
// то, что открывается во вкладке: программа со своим сайтом (url) - только ссылка
const TAB_ITEMS = ITEMS.filter((g) => !g.url);
const BASE_PATH = '/hub/';

test.describe.configure({ mode: 'serial' });
test.use({
  viewport: { width: 1280, height: 800 },
  launchOptions: { args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] },
});

// --- сервер «как GitHub Pages» -----------------------------------------------------

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
};

let server;
let httpBase;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (!url.startsWith(BASE_PATH)) { res.writeHead(404); res.end('not found'); return; }
    let file = path.join(ROOT, url.slice(BASE_PATH.length));
    if (!file.startsWith(ROOT) || file.includes(`${path.sep}node_modules${path.sep}`)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  httpBase = `http://127.0.0.1:${server.address().port}${BASE_PATH}`;
});

test.afterAll(async () => { if (server) await new Promise((r) => server.close(r)); });

const MODES = {
  file: () => pathToFileURL(path.join(ROOT, 'index.html')).href,
  http: () => httpBase,
};

// --- подмены во всех рамках ----------------------------------------------------------

// Ставится в КАЖДУЮ рамку до её скриптов: заглушка захвата мыши со счётчиком и журнал
// сообщений оболочки {mix: ...}, пришедших от родительского окна.
const INIT = () => {
  const stub = function () { window.__plCalls = (window.__plCalls || 0) + 1; return Promise.resolve(); };
  const exitStub = function () {};
  Object.defineProperty(Element.prototype, 'requestPointerLock', { configurable: true, writable: true, value: stub });
  Object.defineProperty(Document.prototype, 'exitPointerLock', { configurable: true, writable: true, value: exitStub });
  window.__plStub = stub;
  window.__plExitStub = exitStub;
  window.__mix = [];
  window.addEventListener('message', (e) => {
    if (e.source === window.parent && window.parent !== window && e.data && typeof e.data.mix === 'string') window.__mix.push(e.data.mix);
  });
};

async function launch(page, mode, { clean = true } = {}) {
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(String((e && e.stack) || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${m.location().url}: ${m.text()}`); });
  await page.context().addInitScript(INIT);
  // Сеть закрыта: страница и игры обязаны работать без интернета. Свой сервер можно.
  await page.context().route(/^(https?|wss?):\/\//, (route) => {
    const u = route.request().url();
    if (httpBase && u.startsWith(httpBase)) return route.continue();
    external.push(u);
    return route.abort();
  });
  await page.goto(MODES[mode]());
  // С сервера страница при первом заходе ставит hub-coi-sw.js и перезагружается через него
  // (изоляция для Компилятора) - дождаться изолированной и готовой страницы.
  if (mode === 'http') await expect.poll(() => page.evaluate(() => self.crossOriginIsolated && document.body.dataset.ready === '1').catch(() => false), { timeout: 20_000 }).toBe(true);
  if (clean) {
    await page.evaluate(async () => {
      localStorage.clear();
      for (const d of (await indexedDB.databases())) await new Promise((r) => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = r; });
    });
    await page.reload();
  }
  await page.waitForSelector('body[data-ready="1"]');
  return { errors, external };
}

const frameEl = (page, id) => page.locator(`#stage iframe[data-id="${id}"]`);

async function openCard(page, id) {
  await page.locator('.tab.home').click();
  await page.locator(`.card[data-id="${id}"] .play`).click();
  const handle = await frameEl(page, id).elementHandle();
  const frame = await handle.contentFrame();
  await frame.waitForLoadState('load');
  return frame;
}

const mixLog = (frame) => frame.evaluate(() => window.__mix.slice());

// Сторож захвата мыши: во всех рамках подмена на месте и захвата нет.
test.afterEach(async ({ page }) => {
  for (const f of page.frames()) {
    if (f.isDetached()) continue;
    const r = await f.evaluate(() => ({
      stub: !window.__plStub || Element.prototype.requestPointerLock === window.__plStub,
      exit: !window.__plExitStub || Document.prototype.exitPointerLock === window.__plExitStub,
      lock: document.pointerLockElement === null,
    })).catch(() => null);
    if (!r) continue;
    expect(r, `захват мыши в ${f.url()}`).toEqual({ stub: true, exit: true, lock: true });
  }
});

// --- данные и вид --------------------------------------------------------------------

test('карточки - все игры, программы и демо систем из общей таблицы, по порядку, с картинками', async ({ page }) => {
  await launch(page, 'file');
  const cards = (sel) => page.locator(`${sel} .card`).evaluateAll((els) => els.map((e) => ({
    id: e.dataset.id,
    name: e.querySelector('h2').firstChild.nextSibling.textContent,
    desc: e.querySelector('.desc').textContent,
    play: e.querySelector('.play').textContent,
  })));
  expect(await cards('#grid')).toEqual(DATA.GAMES.map((g) => ({ id: g.id, name: g.name, desc: g.desc, play: 'Играть' })));
  expect(await cards('#programs')).toEqual(DATA.PROGRAMS.map((g) => ({ id: g.id, name: g.name, desc: g.desc, play: g.url ? 'Открыть сайт' : 'Открыть' })));
  await expect(page.locator('#programs-section')).toBeVisible();
  expect((await cards('#systems')).map((c) => c.id)).toEqual(DATA.SYSTEMS.map((s) => s.id));
  expect((await cards('#systems')).map((c) => c.name)).toEqual(DATA.SYSTEMS.map((s) => s.name));
  // Картинки - те же, что у приложения (app/assets/thumbs), и все загрузились.
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  const imgs = await page.locator('.card .shot img').evaluateAll((els) => els.map((i) => ({ src: i.getAttribute('src'), ok: i.naturalWidth > 0 })));
  expect(imgs).toEqual(ITEMS.map((g) => ({ src: `app/assets/thumbs/${g.id}.jpg`, ok: true })));
  await expect(page.locator('h1.product')).toHaveText('Хаб');
  await expect(page).toHaveTitle('Хаб');
  await expect(page.locator('footer.note')).toHaveText('Игры - фан-концепты, не связаны с правообладателями.');
  await expect(page.locator('#systems-note')).toHaveText('Демо в стиле Windows 11, macOS, iOS и One UI, не связано с Apple/Microsoft/Samsung.');
  await expect(page.locator('#gear')).toBeVisible();
});

// Программа со своим сайтом (Calibrate3dPrinter): карточка открывает её адрес в новой вкладке
// браузера, своей вкладки в Хабе не появляется.
for (const p of DATA.PROGRAMS.filter((x) => x.url)) {
  test(`«${p.name}»: карточка открывает сайт ${p.url} в новой вкладке браузера`, async ({ page }) => {
    await launch(page, 'file');
    // сеть в проверках закрыта: window.open подменён записью, что и куда открыли бы
    await page.evaluate(() => { window.__opened = []; window.open = (...a) => { window.__opened.push(a); return null; }; });
    const card = page.locator(`#programs .card[data-id="${p.id}"]`);
    await expect(card.locator('.play')).toHaveText('Открыть сайт');
    await card.click();
    expect(await page.evaluate(() => window.__opened)).toEqual([[p.url, '_blank', 'noopener']]);
    await expect(page.locator(`.tab.game[data-id="${p.id}"]`)).toHaveCount(0);
    await expect(page.locator('#home')).toBeVisible();
  });
}

// Калибровка (свой репозиторий Calibrate3dPrinter) живёт в Хабе копией web/calibrate3dprinter
// (tools/sync-calibrate.js), а не ссылкой на свой сайт: карточка открывает вкладку Хаба, и
// G-code строится в ней, без сети и без нового окна (Алексей 11.10: «почему калибровка
// открывается не в игротеке, а в соседнем окне»).
for (const mode of Object.keys(MODES)) {
  test(`${mode}: «Калибровка 3D-принтера» - вкладка Хаба с копией страницы, G-code строится в ней`, async ({ page }) => {
    const { errors, external } = await launch(page, mode);
    const p = DATA.PROGRAMS.find((x) => x.id === 'calibrate3dprinter');
    expect(p.url, 'у карточки нет адреса наружу').toBeUndefined();
    const popups = [];
    page.on('popup', (w) => popups.push(w.url()));
    const frame = await openCard(page, 'calibrate3dprinter');
    expect(frame.url()).toMatch(/\/web\/calibrate3dprinter\/index\.html$/);
    const g = await frame.evaluate(async () => {
      for (let i = 0; i < 100 && !window.calib3dApp; i++) await new Promise((r) => setTimeout(r, 100));
      const S = window.calib3dApp.state;
      S.selected = S.selected.slice(0, 1);
      const f = window.calib3dApp.files();
      return f.length + '|' + f[0].text.length + '|' + /^G1 /m.test(f[0].text);
    });
    expect(g).toMatch(/^1\|\d{4,}\|true$/);
    await expect(page.locator('.tab.game[data-id="calibrate3dprinter"]')).toHaveCount(1);
    expect(popups).toEqual([]);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
}

// Компилятор во вкладке Хаба на сайте: ввод по ходу программы, как в отдельном Compiler 1.1.x
// (там страницу изолирует свой coi-sw.js). Вкладка - рамка Хаба, а изолированной рамка бывает
// только у изолированной страницы: её изолирует hub-coi-sw.js. До 1.1.0 Хаба программа во
// вкладке видела только поле «Ввод (stdin)» и подсказку.
test('http: Компилятор во вкладке Хаба ждёт строку, набранную в выводе (страница изолирована)', async ({ page }) => {
  test.setTimeout(120_000);
  const { errors, external } = await launch(page, 'http');
  expect(await page.evaluate(() => self.crossOriginIsolated)).toBe(true);
  const frame = await openCard(page, 'compiler');
  await frame.waitForSelector('html[data-ready="1"]', { timeout: 30_000 });
  expect(await frame.evaluate(() => self.crossOriginIsolated)).toBe(true);
  await frame.evaluate(() => window.__compiler.cm.setValue('console.log("got " + prompt("Name? "));\nconsole.log("end");\n'));
  await frame.locator('#stdin').fill('');
  await frame.locator('#runBtn').click();
  await expect(frame.locator('#out')).toContainText('Name? ', { timeout: 30_000 });
  const box = frame.locator('#termIn');
  await expect(box).toBeVisible();
  await box.pressSequentially('Хаб');
  await box.press('Enter');
  await expect(frame.locator('#out')).toContainText('got Хаб');
  await expect(frame.locator('#out')).toContainText(/─── готово за/);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('hub-coi-sw.js: заголовки изоляции только у файлов Хаба, соседние сайты адреса - как есть', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'hub-coi-sw.js'), 'utf8');
  const OWN = new Function('BASE', `const OWN = ${/const OWN = ([^\n]+);/.exec(src)[1]}; return OWN;`)('/');
  for (const p of ['/', '/index.html', '/web/compiler/index.html', '/web/dino/kit.js', '/app/renderer/style.css']) expect(OWN(p), p).toBe(true);
  for (const p of ['/PaintPro/', '/Compiler/index.html', '/GameRoom/', '/webx/a.js', '/MediaPlayer/web/a.js']) expect(OWN(p), p).toBe(false);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  expect(html).toMatch(/<script src="hub-coi-sw\.js"><\/script>/);
});

test('все пути относительные, без внешних адресов; .nojekyll на месте', async () => {
  const files = ['index.html', 'web/_launcher/launcher.js', 'web/_launcher/launcher.css', 'web/_shared/games-data.js'];
  for (const f of files) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    expect(s, f).not.toMatch(/(src|href)\s*=\s*["']\s*(\/|https?:|\/\/)/i);
    expect(s, f).not.toMatch(/url\(\s*["']?(\/|https?:)/i);
    expect(s, f).not.toMatch(/import\s*\(|fetch\(|XMLHttpRequest/);
  }
  // GitHub Pages собирает сайт Jekyll-ом, а тот выбрасывает папки с подчёркиванием
  // (web/_shared, web/_launcher, web/_os-shared). Пустой .nojekyll это отключает.
  expect(fs.existsSync(path.join(ROOT, '.nojekyll'))).toBe(true);
});

// --- каждая игра во вкладке ----------------------------------------------------------

for (const mode of Object.keys(MODES)) {
  for (const g of TAB_ITEMS) {
    test(`${mode}: «${g.name}» открывается во вкладке без ошибок и без сети`, async ({ page }) => {
      const { errors, external } = await launch(page, mode);
      const frame = await openCard(page, g.id);
      expect(frame.url()).toMatch(new RegExp(`/web/${g.id}/index\\.html$`));
      await expect(page.locator(`.tab.game[data-id="${g.id}"]`)).toHaveClass(/active/);
      await expect(page.locator(`.tab.game[data-id="${g.id}"] .name`)).toHaveText(g.name);
      await expect(frameEl(page, g.id)).toBeVisible();
      await expect(page.locator('#home')).toBeHidden();
      // Игра запускается как у игрока: щелчок и пара клавиш.
      await page.mouse.click(640, 420);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      await page.waitForTimeout(2000);
      expect(await frame.title()).toMatch(/\S/);
      expect(errors, errors.join('\n')).toEqual([]);
      expect(external, external.join('\n')).toEqual([]);
      if (mode === 'http') {
        // Хранилище общее на весь сайт: игра пишет только под своими приставками.
        const used = await page.evaluate(async () => ({
          ls: Object.keys(localStorage),
          idb: (await indexedDB.databases()).map((d) => 'idb:' + d.name),
        }));
        const own = [...g.storage, 'igroteka.'];
        for (const k of [...used.ls, ...used.idb]) {
          expect(own.some((p) => k.startsWith(p)), `${g.id} пишет чужое: ${k}`).toBe(true);
        }
      }
    });
  }
}

// --- вкладки: пауза, переключение, закрытие ----------------------------------------

for (const mode of Object.keys(MODES)) {
  test(`${mode}: ушли с игры - {mix:'pause'}, вернулись - {mix:'resume'}; новой вкладке resume не шлётся`, async ({ page }) => {
    await launch(page, mode);
    const dino = await openCard(page, 'dino');
    await page.waitForTimeout(300);
    expect(await mixLog(dino)).toEqual([]);

    const blocks = await openCard(page, 'tetris'); // через домашнюю: dino уже на паузе
    await expect.poll(() => mixLog(dino)).toEqual(['pause']);
    expect(await mixLog(blocks)).toEqual([]);

    await page.locator('.tab.game[data-id="dino"]').click();
    await expect.poll(() => mixLog(dino)).toEqual(['pause', 'resume']);
    await expect.poll(() => mixLog(blocks)).toEqual(['pause']);
    await expect(frameEl(page, 'dino')).toBeVisible();
    await expect(frameEl(page, 'tetris')).toBeHidden();

    // Домашняя вкладка - тоже «ушли с игры».
    await page.locator('.tab.home').click();
    await expect.poll(() => mixLog(dino)).toEqual(['pause', 'resume', 'pause']);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('.card[data-id="dino"] .play')).toHaveText('Вернуться');

    // Вкладку браузера скрыли и вернули.
    await page.locator('.tab.game[data-id="tetris"]').click();
    await expect.poll(() => mixLog(blocks)).toEqual(['pause', 'resume']);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => mixLog(blocks)).toEqual(['pause', 'resume', 'pause', 'resume']);
    expect(await mixLog(dino)).toEqual(['pause', 'resume', 'pause']);
  });
}

test('настоящая игра слышит паузу из вкладки: «Дино-бег» встаёт на паузу, resume её не снимает', async ({ page }) => {
  await launch(page, 'http');
  const dino = await openCard(page, 'dino');
  const mode = () => dino.evaluate(() => kit.mode); // eslint-disable-line no-undef
  await dino.getByRole('button', { name: 'Бесконечный бег' }).click();
  await expect.poll(mode).toBe('play');
  // Только сообщение, без потери фокуса (щелчок по полосе вкладок сам снял бы фокус с
  // игры, и та встала бы на паузу по blur): скрыли вкладку браузера - игре ушло pause.
  const visibility = (hidden) => page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await visibility(true);
  await expect.poll(mode).toBe('paused');
  await visibility(false);
  await page.waitForTimeout(500);
  // Вернулись, а игра ждёт игрока: паузу снимает он сам.
  expect(await mode()).toBe('paused');
  expect(await mixLog(dino)).toEqual(['pause', 'resume']);
});

test('закрытие вкладки освобождает рамку; активной становится соседняя, как в приложении', async ({ page }) => {
  await launch(page, 'file');
  await openCard(page, 'dino');
  await openCard(page, 'mario');
  await openCard(page, 'sudoku');
  await page.locator('.tab.game[data-id="mario"]').click();
  expect(await page.locator('#stage iframe').count()).toBe(3);

  await page.locator('.tab.game[data-id="mario"] .x').click();
  await expect(page.locator('#stage iframe')).toHaveCount(2);
  await expect(frameEl(page, 'mario')).toHaveCount(0);
  expect(page.frames().some((f) => /\/web\/mario\//.test(f.url()))).toBe(false);
  await expect(page.locator('.tab.game[data-id="sudoku"]')).toHaveClass(/active/); // соседняя справа
  await expect(page.locator('.card[data-id="mario"] .play')).toHaveText('Играть');

  // Средняя кнопка мыши тоже закрывает.
  await page.locator('.tab.game[data-id="sudoku"]').click({ button: 'middle' });
  await expect(frameEl(page, 'sudoku')).toHaveCount(0);
  await expect(page.locator('.tab.game[data-id="dino"]')).toHaveClass(/active/); // крайняя - соседняя слева

  await page.locator('.tab.game[data-id="dino"] .x').click();
  await expect(page.locator('#stage iframe')).toHaveCount(0);
  await expect(page.locator('#home')).toBeVisible();
  expect(page.frames().length).toBe(1);
});

test('повторный щелчок по карточке не открывает вторую вкладку', async ({ page }) => {
  await launch(page, 'file');
  await openCard(page, 'dino');
  await openCard(page, 'dino');
  await expect(page.locator('.tab.game')).toHaveCount(1);
  await expect(page.locator('#stage iframe')).toHaveCount(1);
});

test('рамка разрешает захват мыши, весь экран, геймпад и звук; захват из игры доходит (до заглушки)', async ({ page }) => {
  await launch(page, 'http');
  const frame = await openCard(page, 'fps_1');
  const allow = await frameEl(page, 'fps_1').getAttribute('allow');
  for (const f of ['pointer-lock', 'fullscreen', 'gamepad', 'autoplay']) expect(allow).toContain(f + ' *');
  // Разрешения действительно действуют внутри рамки (по file:// без «*» геймпад запрещён).
  const pp = await frame.evaluate(() => ['gamepad', 'fullscreen', 'autoplay'].map((f) => document.featurePolicy ? document.featurePolicy.allowsFeature(f) : true));
  expect(pp).toEqual([true, true, true]);
  expect(await frameEl(page, 'fps_1').getAttribute('sandbox')).toBeNull();
  // Игра просит захват из своей рамки: просьба не теряется по дороге.
  await frame.evaluate(() => document.body.requestPointerLock());
  expect(await frame.evaluate(() => window.__plCalls)).toBe(1);
});

test('кнопка «на весь экран» разворачивает рамку игры, на домашней её нет', async ({ page }) => {
  await launch(page, 'file');
  await expect(page.locator('#fullscreen')).toBeHidden();
  await openCard(page, 'sudoku');
  await expect(page.locator('#fullscreen')).toBeVisible();
  await page.locator('#fullscreen').click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement && document.fullscreenElement.dataset.id)).toBe('sudoku');
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
});

// --- настройки ----------------------------------------------------------------------

test('тема переключается и запоминается, вкладки прошлого раза открываются без загрузки фоновых', async ({ page }) => {
  await launch(page, 'file');
  await page.locator('#gear').click();
  await page.locator('#set-theme [data-theme-value="light"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#settings [data-close]').click();
  await openCard(page, 'dino');
  await openCard(page, 'tetris');
  await page.reload();
  await page.waitForSelector('body[data-ready="1"]');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.tab.game')).toHaveCount(2);
  await expect(page.locator('.tab.game[data-id="tetris"]')).toHaveClass(/active/);
  // Фоновая восстановленная вкладка не грузится, пока на неё не переключились.
  await expect(page.locator('#stage iframe')).toHaveCount(1);
  await page.locator('.tab.game[data-id="dino"]').click();
  await expect(page.locator('#stage iframe')).toHaveCount(2);

  // Выключили «открывать вкладки прошлого раза» - после перезагрузки только домашняя.
  await page.locator('.tab.home').click();
  await page.locator('#gear').click();
  await page.locator('#set-reopen').uncheck();
  await page.reload();
  await page.waitForSelector('body[data-ready="1"]');
  await expect(page.locator('.tab.game')).toHaveCount(0);
  await expect(page.locator('#home')).toBeVisible();
});

test('http: громкость из настроек доходит до игры, фоновая вкладка молчит', async ({ page }) => {
  await launch(page, 'http');
  const vol = (f) => f.evaluate(() => window[Symbol.for('igroteka.volume')] ? window[Symbol.for('igroteka.volume')]() : 'нет');
  const dino = await openCard(page, 'dino');
  await expect.poll(() => vol(dino)).toBe(0.8);
  await page.locator('.tab.home').click();
  await expect.poll(() => vol(dino)).toBe(0); // в фоне
  await page.locator('#gear').click();
  await page.locator('#set-volume').fill('40');
  await page.locator('#set-mute-bg').uncheck();
  await expect.poll(() => vol(dino)).toBe(0.4);
  await page.locator('#set-mute').click();
  await expect.poll(() => vol(dino)).toBe(0);
  await page.locator('#set-mute').click();
  await expect(page.locator('#volume-hint')).toBeHidden();
  // Игра перезагрузилась - громкость ставится в новое окно.
  await page.locator('#settings [data-close]').click();
  await page.locator('.tab.game[data-id="dino"]').click();
  await dino.evaluate(() => { window.__old = true; location.reload(); });
  await expect.poll(() => dino.evaluate(() => !window.__old && document.readyState === 'complete').catch(() => false)).toBe(true);
  await expect.poll(() => vol(dino)).toBe(0.4);
  // Звук WebAudio идёт через усилитель страницы: connect в окне игры подменён.
  expect(await dino.evaluate(() => /native code/.test(AudioNode.prototype.connect.toString()))).toBe(false);
});

test('file: громкость игр недоступна - в настройках об этом сказано', async ({ page }) => {
  await launch(page, 'file');
  await openCard(page, 'dino');
  await page.locator('.tab.home').click();
  await page.locator('#gear').click();
  await expect(page.locator('#volume-hint')).toBeVisible();
});

for (const mode of Object.keys(MODES)) {
  test(`${mode}: «Очистить данные» стирает только выбранную игру и закрывает её вкладку`, async ({ page }) => {
    await launch(page, mode);
    await page.evaluate(() => new Promise((r) => {
      localStorage.setItem('blocks:records', '[1]');
      localStorage.setItem('dino:records', '[2]');
      const q = indexedDB.open('cubeworld');
      q.onsuccess = () => { q.result.close(); r(); };
    }));
    await openCard(page, 'tetris');
    await page.locator('.tab.home').click();
    await page.locator('#gear').click();
    await page.locator('#clear-game').selectOption('tetris');
    await page.locator('#clear-btn').click();
    await expect(page.locator('#modal .cancel')).toBeFocused();
    await page.locator('#modal .ok').click();
    await expect(page.locator('#clear-hint')).toHaveText('Данные «Блоки» стёрты.');
    expect(await page.evaluate(() => [localStorage.getItem('blocks:records'), localStorage.getItem('dino:records')])).toEqual([null, '[2]']);
    await expect(page.locator('.tab.game[data-id="tetris"]')).toHaveCount(0);

    await page.locator('#clear-game').selectOption('minecraft_clone_3d_1');
    await page.locator('#clear-btn').click();
    await page.locator('#modal .ok').click();
    await expect(page.locator('#clear-hint')).toHaveText('Данные «Кубический мир» стёрты.');
    expect(await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))).not.toContain('cubeworld');
  });
}

// --- ширина экрана ------------------------------------------------------------------

for (const [label, size, cols] of [['телефон', { width: 375, height: 812 }, 1], ['планшет', { width: 768, height: 1024 }, 3], ['ПК', { width: 1280, height: 800 }, 5]]) {
  test(`${label}: ${cols} ${cols === 1 ? 'колонка' : 'колонок'} карточек, без прокрутки вбок`, async ({ page }) => {
    await page.setViewportSize(size);
    await launch(page, 'file');
    const lefts = await page.locator('#grid .card').evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().left)))].length);
    expect(lefts).toBe(cols);
    const over = await page.evaluate(() => {
      const bad = [];
      for (const e of document.querySelectorAll('#home *')) {
        const r = e.getBoundingClientRect();
        if (r.width && (r.right > innerWidth + 0.5 || r.left < -0.5) && !e.closest('#tabs')) bad.push(e.className || e.tagName);
      }
      const home = document.querySelector('#home');
      return { doc: document.documentElement.scrollWidth - innerWidth, home: home.scrollWidth - home.clientWidth, bad };
    });
    expect(over).toEqual({ doc: 0, home: 0, bad: [] });
    // С открытыми вкладками полоса прокручивается сама, а страница - нет.
    for (const id of ['dino', 'mario', 'tetris']) await openCard(page, id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    const box = await frameEl(page, 'tetris').boundingBox();
    expect(Math.round(box.width)).toBe(size.width);
  });
}
