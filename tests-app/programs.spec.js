// Раздел «Программы» в настоящем приложении: «Скорость печати» (web/writing-speed) из
// общей таблицы web/_shared/games-data.js открывается во вкладке, как игра, со своим
// сеансом; в сборку попадает только её страница (electron/ и tools/ рядом - нет).
// Окно - за экраном и без фокуса (IGROTEKA_TEST=1).
'use strict';

const { test, expect } = require('@playwright/test');
const DATA = require('../web/_shared/games-data.js');
const H = require('./harness');

let ctx;
test.beforeAll(async () => { ctx = await H.launch(); });
test.afterAll(async () => { await H.close(ctx); H.rmData(ctx.dataDir); });

test('раздел «Программы»: карточка с картинкой и кнопкой «Открыть» между играми и демо систем', async () => {
  const { shell } = ctx;
  await expect(shell.locator('#programs-section .section-title')).toHaveText('Программы');
  const cards = await shell.locator('#programs .card').evaluateAll((els) => els.map((e) => ({ id: e.dataset.id, play: e.querySelector('.play').textContent })));
  expect(cards).toEqual(DATA.PROGRAMS.map((p) => ({ id: p.id, play: 'Открыть' })));
  await shell.evaluate(() => Promise.all([...document.querySelectorAll('#programs img')].map((i) => i.decode().catch(() => {}))));
  const imgs = await shell.locator('#programs .card .shot img').evaluateAll((els) => els.map((i) => i.naturalWidth > 0));
  expect(imgs).toEqual(DATA.PROGRAMS.map(() => true));
  const order = await shell.evaluate(() => {
    const y = (sel) => document.querySelector(sel).getBoundingClientRect().top;
    return y('#grid') < y('#programs-section') && y('#programs-section') < y('.systems');
  });
  expect(order).toBe(true);
});

for (const p of DATA.PROGRAMS) {
  test(`${p.id}: открывается во вкладке со своим сеансом, печать работает, наружу запросов нет`, async () => {
    const { app, shell } = ctx;
    await shell.click(`#programs .card[data-id="${p.id}"] .play`);
    await expect.poll(() => H.tabs(app).then((t) => t.active)).toBe(p.id);
    await H.gameLoaded(app, p.id, 30000);
    await expect(shell.locator(`.tab.game[data-id="${p.id}"] .name`)).toHaveText(p.name);
    expect(await app.evaluate(({ session }, id) => globalThis.__igroteka.views.get(id).webContents.session === session.fromPartition('persist:' + id), p.id)).toBe(true);
    const done = await H.inGame(app, p.id, `(() => { __ws.startCustom('да'); return __ws.state.words.length; })()`);
    expect(done).toBe(1);
    expect(await H.errorsOf(app, p.id)).toEqual([]);
    expect(await app.evaluate(() => globalThis.__igroteka.blocked)).toEqual([]);
    await expect(shell.locator(`#programs .card[data-id="${p.id}"] .play`)).toHaveText('Вернуться');
  });
}
