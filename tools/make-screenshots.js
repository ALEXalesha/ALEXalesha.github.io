// Кадры приложения для README: docs/screens/app-*.png.
//
//   npm run screenshots
//
// Снимает само приложение (Playwright запускает Electron со своей временной папкой
// данных), а не экран: на кадр не попадёт ничего, кроме окна «Игротеки». Страница игры
// живёт в отдельном WebContentsView, поэтому кадр с игрой собирается из двух: полоса
// вкладок из оболочки и сама игра под ней.
'use strict';

const path = require('path');
const fs = require('fs');
const H = require('../tests-app/harness');

const OUT = path.join(__dirname, '..', 'docs', 'screens');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Оболочка + активная игра под полосой -> один PNG.
async function composite(app, shell, id) {
  const bar = (await shell.screenshot()).toString('base64');
  const game = await app.evaluate(async (_e, gid) => {
    const img = await globalThis.__igroteka.views.get(gid).webContents.capturePage();
    return img.toPNG().toString('base64');
  }, id);
  const png = await shell.evaluate(async ([a, b, barH]) => {
    const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + s; });
    const [top, view] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas');
    c.width = top.width;
    c.height = top.height;
    const g = c.getContext('2d');
    g.drawImage(top, 0, 0);
    const y = Math.round(barH * (top.width / window.innerWidth));
    g.drawImage(view, 0, y, c.width, c.height - y);
    return c.toDataURL('image/png').split(',')[1];
  }, [bar, game, 40]);
  return Buffer.from(png, 'base64');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = await H.launch();
  const { app, shell } = ctx;
  const save = (name, buf) => { fs.writeFileSync(path.join(OUT, name), buf); console.log('docs/screens/' + name); };
  try {
    const size = async (w, h) => { await app.evaluate((_e, [cw, ch]) => globalThis.__igroteka.win.setContentSize(cw, ch), [w, h]); await sleep(800); };
    // Раздел «Программы» - вверху окна (кадры app-programs*.png).
    const programs = async (name) => {
      await shell.evaluate(() => document.querySelector('#programs-section').scrollIntoView({ block: 'start' }));
      await shell.evaluate(() => Promise.all([...document.querySelectorAll('#programs img')].map((i) => i.decode().catch(() => {}))));
      await sleep(400);
      save(name, await shell.screenshot());
      await shell.evaluate(() => document.querySelector('#grid').scrollIntoView({ block: 'start' }));
    };

    // Главная целиком до конца раздела «Программы»: окно на время кадра выше обычного
    // (Windows даёт поставить окно выше экрана - оно за краем экрана и так).
    await size(1280, 1600);
    await shell.evaluate(() => Promise.all([...document.querySelectorAll('img')].map((i) => i.decode().catch(() => {}))));
    const bottom = await shell.evaluate(() => Math.ceil(document.querySelector('#programs-section').getBoundingClientRect().bottom + 24));
    const vh = await shell.evaluate(() => window.innerHeight);
    save('app-home.png', await shell.screenshot({ clip: { x: 0, y: 0, width: 1280, height: Math.min(bottom, vh) } }));
    await size(1280, 800);
    await programs('app-programs.png');

    // Игра во вкладке: «Horizon Drift» (с 1.1.0 открывается главным меню - кадр меню).
    for (const id of ['dino', 'mario', 'horizon_drift_offline']) {
      await H.press(app, 'shell', 'T', ['control']);
      await shell.click(`.card[data-id="${id}"]`);
      await H.gameLoaded(app, id);
    }
    await sleep(800);
    await sleep(1500);
    save('app-game.png', await composite(app, shell, 'horizon_drift_offline'));

    // Вопрос F5 поверх снимка игры.
    await H.press(app, 'horizon_drift_offline', 'F5');
    await shell.waitForSelector('#modal:not([hidden])');
    await sleep(400);
    save('app-question.png', await shell.screenshot());
    await shell.click('#modal .cancel');

    // Настройки на домашнем экране.
    await H.press(app, 'horizon_drift_offline', 'T', ['control']);
    await shell.click('#gear');
    await sleep(400);
    save('app-settings.png', await shell.screenshot());

    // Светлая тема.
    await shell.click('#set-theme button[data-theme-value="light"]');
    await shell.click('#settings [data-close]');
    await sleep(400);
    save('app-light.png', await shell.screenshot());
    await programs('app-programs-light.png');
  } finally {
    await H.close(ctx);
    H.rmData(ctx.dataDir);
  }
})().catch((e) => { console.error(e); process.exit(1); });
