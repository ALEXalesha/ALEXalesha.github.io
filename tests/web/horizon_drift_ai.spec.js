// Законы Horizon Drift 1.2.0 в странице: соперники - нейросеть AiRacer, «Новая трасса» (генератор по коду),
// клавиша фестиваля отдельно от «передачи вверх», время физики с пятью соперниками-нейросетями.
// Законы ядра без окна (круг на 8 трассах, 200 кодов генератора, клавиши) - tests-app/unit/drift-ai.test.js.
// Мутанты - tests/web/horizon_drift-mutate.js (spec AI).
const { test, expect } = require('@playwright/test');
const { openDrift, startQuick } = require('./_drift-helpers');

test.describe('horizon_drift_offline: ИИ-соперники и новые трассы', () => {
  test.describe.configure({ timeout: 180_000 });

  test('соперников ведёт нейросеть: все доезжают круг, у каждого свой мозг и помощники игрока; «Бот игры» в настройках возвращает бота', async ({ page }) => {
    const errors = await openDrift(page);
    expect(await page.evaluate(() => __drift.settings.rivalAi)).toBe('neural');
    await startQuick(page, { track: 'city', mode: 'race', opp: 3, laps: 1 });
    const r = await page.evaluate(() => {
      const r = __drift.race; r.setAutopilot(r.player, 0.95);
      for (let i = 0; i < 200 * 120 && !r.cars.every((c) => c.finished); i++) __drift.step(1);
      return r.cars.filter((c) => !c.isPlayer).map((c) => ({ brain: !!c.ai.brain, decisions: c.ai.brain ? c.ai.brain.decisions : 0, finished: c.finished, steer: c.assist.steer, hits: c.hits }));
    });
    expect(r).toHaveLength(3);
    for (const c of r) { expect(c.brain).toBe(true); expect(c.finished).toBe(true); expect(c.steer).toBe(true); expect(c.decisions).toBeGreaterThan(1000); }
    await page.evaluate(() => __drift.toMenu());
    await page.evaluate(() => __drift.show('settings'));
    await page.locator('#sTabs button[data-tab="game"]').click();
    await page.locator('#sBody [data-set="rivalAi"] button[data-v="bot"]').click();
    await startQuick(page, { track: 'city', mode: 'race', opp: 3, laps: 1 });
    expect(await page.evaluate(() => __drift.race.cars.filter((c) => !c.isPlayer).map((c) => !!c.ai.brain))).toEqual([false, false, false]);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mix.drift.settings')).rivalAi)).toBe('bot');
    expect(errors).toEqual([]);
  });

  test('повреждения и нитро у соперников-нейросетей - по правилам игрока: «полные» подключены всем, удар мнёт, нитро тратится', async ({ page }) => {
    await openDrift(page);
    await page.evaluate(() => __drift.setSetting('damage', 'full'));
    // нитро нейросеть жмёт редко (0-1,5 с за 150 с): за 60 с в порту его мог не тронуть ни один из пятерых (ревью 17.10,
    // замер на 4 трассах) - берётся побережье, где за 150 с его тратят все
    await startQuick(page, { track: 'coast', mode: 'race', opp: 5, laps: 2 });
    const r = await page.evaluate(() => {
      const r = __drift.race; r.setAutopilot(r.player, 0.9);
      const rivals = r.cars.filter((c) => !c.isPlayer), nitro = rivals.map(() => 1);
      for (let i = 0; i < 150 * 120; i++) { __drift.step(1); rivals.forEach((c, k) => { nitro[k] = Math.min(nitro[k], c.nitro); }); }
      return { mode: r.damageMode, dmg: r.cars.map((c) => !!c.dmg && !!c.dmgFx), hits: rivals.reduce((a, c) => a + c.dmg.hits, 0), minNitro: Math.min(...nitro), brains: rivals.every((c) => !!c.ai.brain) };
    });
    expect(r.mode).toBe('full');
    expect(r.dmg.every(Boolean)).toBe(true);
    expect(r.brains).toBe(true);
    expect(r.minNitro).toBeLessThan(0.9);
  });

  test('дрифт с соперниками: соперники на заднем приводе набирают очки, таблица на экране и в итогах - по очкам', async ({ page }) => {
    const errors = await openDrift(page);
    // 6 стартов: «Искра» (передний привод) из класса игрока выпала бы почти наверняка, если бы не отбор
    let cars = [];
    for (let k = 0; k < 6; k++) {
      await startQuick(page, { track: 'port', mode: 'drift', opp: 3, laps: 1 });
      cars = cars.concat(await page.evaluate(() => __drift.race.cars.filter((c) => !c.isPlayer).map((c) => [c.ai.brain && c.ai.brain.model, __drift.core.carDef(c.carId).drive])));
    }
    expect(cars).toHaveLength(18);
    for (const [model, drive] of cars) { expect(model).toBe('drifter'); expect(drive).not.toBe('fwd'); }
    await page.evaluate(() => { const r = __drift.race; r.setAutopilot(r.player, 0.85, true); for (let i = 0; i < 400 * 120 && r.phase !== 'done'; i++) __drift.step(1); __drift.manual = false; });
    await page.evaluate(() => __drift.showResults());
    const res = await page.evaluate(() => __drift.lastResult.driftTable);
    expect(res).toHaveLength(4);
    expect(res.filter((r) => !r.isPlayer).some((r) => r.pts > 2000)).toBe(true);
    for (let i = 1; i < res.length; i++) expect(res[i - 1].pts).toBeGreaterThanOrEqual(res[i].pts);
    await expect(page.locator('#resTable')).toContainText('Очки дрифта');
    await expect(page.locator('#resText')).toContainText('место');
    expect(errors).toEqual([]);
  });

  test('«Новая трасса»: код из поля даёт трассу с проверкой; тот же код - та же трасса; сохранённая видна после перезагрузки', async ({ page }) => {
    const errors = await openDrift(page);
    await page.locator('#scrMain button[data-go="gen"]').click();
    await expect(page.locator('#scrGen')).toBeVisible();
    await page.locator('#genCode').fill('d1s-2k');
    await page.locator('#genMake').click();
    await expect(page.locator('#genCard')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#genSub')).toContainText('D1S-2K');
    await expect(page.locator('#genType button.on')).toHaveText('Дрифт');
    await expect(page.locator('#genInfo')).toContainText('нейросеть: круг');
    const def1 = await page.evaluate(() => JSON.stringify(__drift.gen.result.def));
    // другой код и обратно - та же трасса бит в бит
    await page.evaluate(() => __drift.generate({ code: 'R1S-7Q' }));
    expect(await page.evaluate(() => __drift.gen.result.code)).toBe('R1S-7Q');
    await page.evaluate(() => __drift.generate({ code: 'D1S-2K' }));
    expect(await page.evaluate(() => JSON.stringify(__drift.gen.result.def))).toBe(def1);
    await page.locator('#genSave').click();
    await expect(page.locator('#genSave')).toHaveText('Убрать из сохранённых');
    await page.reload();
    await page.waitForFunction(() => window.__drift && __drift.ready);
    await page.evaluate(() => __drift.show('gen'));
    await expect(page.locator('#genSaved .card[data-code="D1S-2K"]')).toBeVisible();
    await page.locator('#genSaved .card[data-code="D1S-2K"]').click();
    expect(await page.evaluate(() => JSON.stringify(__drift.gen.result.def))).toBe(def1);
    expect(errors).toEqual([]);
  });

  test('гонка на новой трассе с соперниками-нейросетями доходит до итогов, рекорд круга - по коду, виден в «Рекордах»', async ({ page }) => {
    const errors = await openDrift(page);
    await page.evaluate(() => __drift.generate({ code: 'R1S-7Q' }));
    await page.evaluate(async () => { __drift.manual = true; await __drift.startGen({ mode: 'race', opp: 3, laps: 1 }); });
    const st = await page.evaluate(() => {
      const r = __drift.race; r.setAutopilot(r.player, 0.95);
      for (let i = 0; i < 400 * 120 && !r.cars.every((c) => c.finished); i++) __drift.step(1);
      return { id: r.track.id, gen: r.track.def.gen.code, finished: r.cars.map((c) => c.finished), brains: r.cars.filter((c) => !c.isPlayer).every((c) => !!c.ai.brain) };
    });
    expect(st.gen).toBe('R1S-7Q');
    expect(st.finished.every(Boolean)).toBe(true);
    expect(st.brains).toBe(true);
    const rec = await page.evaluate(() => __drift.genRec['R1S-7Q']);
    expect(rec.lap).toBeGreaterThan(20);
    await page.evaluate(() => { __drift.showResults(); });
    await page.locator('#resNext').click();
    await expect(page.locator('#scrGen')).toBeVisible();
    await expect(page.locator('#genInfo')).toContainText('круг');
    await page.evaluate(() => __drift.show('records'));
    await expect(page.locator('#recGen')).toContainText('R1S-7Q');
    // рекорды трасс игры не тронуты: в них нет кода новой трассы
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mix.drift.records') || '{"tracks":{}}').tracks).some((k) => k.startsWith('gen')))).toBe(false);
    expect(errors).toEqual([]);
  });

  test('фестиваль - на своей клавише: T открывает, E - передача вверх; подсказка и справка показывают назначенную клавишу', async ({ page }) => {
    const errors = await openDrift(page);
    await page.evaluate(() => { __drift.setSetting('gearbox', 'manual'); return __drift.startWorld('coast', { fest: true }); });
    await page.waitForFunction(() => __drift.screen === 'world');
    await page.evaluate(() => { __drift.manual = true; __drift.stepWorld(3); __drift.manual = false; });
    await expect(page.locator('#wPrompt')).toContainText('T Фестиваль');
    await expect(page.locator('#hKeys')).toContainText('T фестиваль');
    const g0 = await page.evaluate(() => __drift.world.player.gear);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => __drift.overlay)).toBe(null);
    expect(await page.evaluate(() => __drift.world.player.gear)).toBe(g0 + 1);
    await page.keyboard.press('KeyT');
    await expect(page.locator('#scrHub')).toBeVisible();
    await page.keyboard.press('Escape');
    // переназначить фестиваль на H через настройки: подсказка следует за назначением
    await page.evaluate(() => { const s = __drift.settings, b = JSON.parse(JSON.stringify(s.bindings)); b.festival = ['KeyH', '']; __drift.setSetting('bindings', b); });
    await page.evaluate(() => { __drift.manual = true; __drift.stepWorld(1); __drift.manual = false; });
    await expect(page.locator('#wPrompt')).toContainText('H Фестиваль');
    await page.keyboard.press('KeyT');
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => __drift.overlay)).toBe(null);
    await page.keyboard.press('KeyH');
    await expect(page.locator('#scrHub')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.evaluate(() => { __drift.quitWorld(); __drift.show('help'); });
    await expect(page.locator('#helpBody')).toContainText('H фестиваль, события и дуэли');
    expect(errors).toEqual([]);
  });

  // Ревью 17.10: трасса строится по шагам в той же странице (шаг проверки - до ~0,1 с). Ушли с экрана и начали заезд -
  // стройка шла дальше и до 10 с отнимала кадры у гонки (рывки на старте). Заезд или свободная езда её прерывают.
  test('создание трассы прерывается, когда начинается заезд или свободная езда: кадры гонки не делятся со стройкой', async ({ page }) => {
    const errors = await openDrift(page);
    for (const start of ['race', 'world']) {
      await page.evaluate(() => __drift.show('gen'));
      await page.evaluate(() => { window.__genDone = __drift.generate({ code: 'C3M-1UMQO' }); });
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => __drift.gen.busy)).toBe(true);
      if (start === 'race') await startQuick(page, { track: 'city', mode: 'race', opp: 1, laps: 1 });
      else await page.evaluate(() => __drift.startWorld('coast', {}));
      // стройка на этой трассе идёт 7-15 с; прерванная заканчивает текущий шаг и выходит
      await page.waitForTimeout(800);
      expect(await page.evaluate(() => __drift.gen.busy), 'после начала: ' + start).toBe(false);
      expect(await page.evaluate(async () => await window.__genDone)).toBe(null);
      await expect(page.locator('#genStatus')).toContainText('прервано');
      await page.evaluate(() => { __drift.manual = false; if (__drift.world) __drift.quitWorld(); else __drift.toMenu(); });
    }
    // после прерывания трасса строится, как обычно
    expect(await page.evaluate(async () => (await __drift.generate({ code: 'R1S-7Q' })).code)).toBe('R1S-7Q');
    expect(errors).toEqual([]);
  });

  test('время физики: 5 соперников-нейросетей укладываются в кадр 60 fps с запасом, решения не все на одном шаге', async ({ page }) => {
    await openDrift(page);
    const m = {};
    for (const ai of ['bot', 'neural']) {
      await page.evaluate((ai) => __drift.setSetting('rivalAi', ai), ai);
      await startQuick(page, { track: 'city', mode: 'race', opp: 5, laps: 2 });
      m[ai] = await page.evaluate(() => {
        const r = __drift.race; r.setAutopilot(r.player, 0.9);
        __drift.step(600);                                       // разогрев JIT
        const per = [];
        for (let i = 0; i < 2400; i++) { const t0 = performance.now(); __drift.step(1); per.push(performance.now() - t0); }
        per.sort((a, b) => a - b);
        const same = r.cars.filter((c) => c.ai && c.ai.brain).map((c) => c.ai.brain.decisions);
        return { mean: per.reduce((a, b) => a + b, 0) / per.length, p99: per[Math.floor(per.length * 0.99)], decisions: same };
      });
      await page.evaluate(() => __drift.toMenu());
    }
    console.log('шаг физики, мс: бот', m.bot.mean.toFixed(3), 'p99', m.bot.p99.toFixed(2), '· нейросеть', m.neural.mean.toFixed(3), 'p99', m.neural.p99.toFixed(2));
    // при 60 fps на кадр приходится 2 шага физики (120 Гц): вся физика с ИИ - не больше 2 мс из 16.7
    expect(m.neural.mean * 2).toBeLessThan(2);
    expect(m.neural.p99).toBeLessThan(4);
    expect(m.neural.decisions).toHaveLength(5);
  });
});
