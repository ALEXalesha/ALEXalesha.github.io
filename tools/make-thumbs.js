// Картинки карточек домашнего экрана: app/assets/thumbs/<игра>.jpg, 640x360.
//
//   npm run thumbs            # все игры и демо систем
//   npm run thumbs -- dino    # одна
//
// Демо систем (SYSTEMS в web/_shared/games-data.js) нужны только браузерной странице
// (index.html в корне): их снимок - сама система сразу после загрузки, без нажатий.
//
// Каждая игра открывается в Chromium по файловому адресу (как в web-проверках), сеть
// закрыта. Игра начинается как у игрока: кнопка старта или Enter/пробел, потом пара
// секунд игры с зажатой «вправо», и снимок. После переделки игры картинку нужно снять
// заново этой же командой.
'use strict';

const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');
const { GAMES, SYSTEMS, PROGRAMS } = require('../web/_shared/games-data.js');
const { pageUrl } = require('../tests/helpers');
// Захват мыши - только подмена: в headless Chromium на Windows настоящий requestPointerLock
// зажимает курсор человека за компьютером в прямоугольник скрытого окна (ClipCursor).
const { lockStub } = require('../tests/web/_voxel-helpers');

const OUT = path.join(__dirname, '..', 'app', 'assets', 'thumbs');

// Что нажать, чтобы на картинке была игра, а не меню. По умолчанию - кнопка со словом
// «Играть/Поехали/Начать», потом Enter и пробел.
const PLAY = {
  dino: { hold: [], wait: 900 },
  // «Летучая птичка»: после старта ведёт автопилот заставки, иначе птичка падает до снимка
  flappy_wings: { hold: [], wait: 2600, after: '__game.setAutopilot(true)' },
  fps_1: { hold: ['KeyW'], wait: 1500, click: true },
  // «Компилятор»: на картинке - пример после запуска, с выводом
  // Медиаплеер: снимок, когда своя мелодия уже играет и визуализация рисует полосы
  media_player: { noStart: true, hold: [], wait: 2500, ready: '() => window.__mp && window.__mp.ready === true', after: '__mp.player.play(0)' },
  compiler: { noStart: true, hold: [], wait: 1500, ready: '() => document.documentElement.dataset.ready === "1"', after: 'document.getElementById("runBtn").click()' },
  // «Скорость печати»: на картинке - тест на середине, несколько слов уже напечатаны
  writing_speed: { query: 'seed=5', noStart: true, hold: [], wait: 400, ready: '() => window.__ws && __ws.ready',
    type: '__ws.state.words.slice(0, 7).map((w) => w.text).join(" ") + " " + __ws.state.words[7].text.slice(0, 2)' },
  // «Файловый менеджер»: на картинке - демо-диск, папка «Проекты» с кодом
  files_manager: { noStart: true, hold: [], wait: 600, ready: '() => window.__fm && __fm.ready' },
  // Калькуляторы (копии из Calculators): на картинке - посчитанный пример
  calcpro_glass: { noStart: true, hold: [], wait: 500, type: '"12*7+3="' },
  ios_calculator: { noStart: true, hold: [], wait: 500, type: '"12*7+3="' },
  mario: { hold: ['ArrowRight'], wait: 1800 },
  jungle_strike: { hold: ['ArrowRight'], wait: 1500 },
  horizon_drift_offline: { buttons: [/Свободная езда/, /поехать/i], hold: ['ArrowUp'], wait: 5000, noStart: true },
  space_shooter: { hold: [], wait: 5000, mouse: true },
  // «Кубический мир»: сразу в мир (без меню), снимок, когда построились куски вокруг
  minecraft_clone_3d_1: { query: 'seed=2026&mode=creative', hold: [], wait: 2500, ready: '() => window.__voxel && __voxel.state === "play"', noStart: true,
    after: '(() => { const v = __voxel, p = v.player; v.game.hideHud = true; v.game.hideHand = true; v.game.autoSpawn = false; p.flying = true; p.pos.y += 18; v.look(0.7, -0.35); v.game.ticks = 5000; })()' },
};

async function start(page) {
  // кнопка старта, но не «Как играть»
  const btn = page.locator('button:visible', { hasText: /^\s*(играть|поехали|начать|старт)/i }).first();
  if (await btn.count()) await btn.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(300);
  for (const key of ['Enter', 'Space']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(250);
  }
}

async function shoot(browser, id, system) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 0.5 });
  const page = await ctx.newPage();
  await page.addInitScript(lockStub);
  // Программа со своим сайтом (поле url): снимок самого сайта - единственный случай, когда
  // сюда пускается сеть.
  const link = PROGRAMS.find((p) => p.id === id && p.url);
  if (link) {
    await page.goto(link.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    return snap(page, ctx, id);
  }
  await page.route(/^https?:\/\//, (r) => r.abort());
  if (system) {
    await page.goto(pageUrl(id));
    await page.waitForTimeout(3000);
    return snap(page, ctx, id);
  }
  const how = PLAY[id.replace('-', '_')] || { hold: [], wait: 2000 };
  await page.goto(pageUrl(id) + (how.query ? '?' + how.query : ''));
  await page.waitForTimeout(1200);
  if (how.ready) await page.waitForFunction(how.ready, null, { timeout: 60000 }).catch(() => {});
  if (!how.noStart) await start(page);
  for (const b of how.buttons || []) { await page.locator('button:visible', { hasText: b }).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(800); }
  if (how.after) await page.evaluate(how.after);
  if (how.type) await page.keyboard.type(await page.evaluate(how.type), { delay: 40 });
  if (how.click) await page.mouse.click(640, 360);
  if (how.mouse) { await page.mouse.move(640, 500); await page.mouse.down(); }
  for (const k of how.hold) await page.keyboard.down(k);
  await page.waitForTimeout(how.wait);
  return snap(page, ctx, id);
}

// Кадр без паузы и курсора: на снимке должна быть сама игра.
async function snap(page, ctx, id) {
  const file = path.join(OUT, id + '.jpg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  await ctx.close();
  return file;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const browser = await chromium.launch({
    args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  for (const g of [...GAMES, ...PROGRAMS, ...SYSTEMS]) {
    if (only.length && !only.includes(g.id)) continue;
    const file = await shoot(browser, g.id, SYSTEMS.includes(g));
    console.log(path.relative(process.cwd(), file), Math.round(fs.statSync(file).size / 1024) + ' КБ');
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
