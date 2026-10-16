// Законы «Horizon Drift» по независимой проверке 1.1.0 (16.10): узкое окно 560-1120 px (гараж и HUD),
// пауза, пришедшая во время загрузки, клавиши свободной езды M и F, подсказки из назначенных клавиш.
// Каждый закон красный на 1.1.0; мутанты - в tests/web/horizon_drift-mutate.js (spec REVIEW).
const { test, expect } = require('@playwright/test');
const { openDrift, startQuick } = require('./_drift-helpers');

// прямоугольники видимых элементов: что вылезло за окно и что налезает друг на друга (больше 2 px по обеим осям)
const layout = (page, ids) => page.evaluate((ids) => {
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false; for (let a = el; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
  const els = ids.map((s) => [s, document.querySelector(s)]).filter(([, e]) => vis(e)), out = [], over = [];
  for (const [s, e] of els) { const r = e.getBoundingClientRect(); if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) out.push(s + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',')); }
  for (let a = 0; a < els.length; a++) for (let b = a + 1; b < els.length; b++) {
    if (els[a][1].contains(els[b][1]) || els[b][1].contains(els[a][1])) continue;        // своя рамка - не наложение
    const A = els[a][1].getBoundingClientRect(), B = els[b][1].getBoundingClientRect();
    if (Math.min(A.right, B.right) - Math.max(A.left, B.left) > 2 && Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 2) over.push(els[a][0] + ' / ' + els[b][0]);
  }
  return { out, over, shown: els.map(([s]) => s) };
}, ids);

const HUD_RACE = ['#hInfo', '#hBoard', '#hMap', '#hSpeedo', '#hNitro', '#hNitro span', '#hDmg', '#hDmg span', '#hKeys', '#hPauseBtn'];
const HUD_WORLD = ['#wInfo', '#wPrompt', '#hMap', '#hSpeedo', '#hNitro', '#hNitro span', '#hDmg', '#hDmg span', '#hKeys', '#hPauseBtn'];
const SIZES = [{ width: 560, height: 700 }, { width: 640, height: 480 }, { width: 800, height: 600 }, { width: 1120, height: 700 }];

test.describe('horizon_drift_offline: независимая проверка 16.10', () => {
  test.describe.configure({ timeout: 180_000 });

  test('гараж в окне 375-1120 px: список машин, панель с вкладками и кнопка покупки целиком в окне', async ({ page }) => {
    const bad = {};
    await openDrift(page);
    for (const size of [{ width: 375, height: 667 }, ...SIZES, { width: 840, height: 820 }]) {
      await page.setViewportSize(size);
      await page.evaluate(() => __drift.show('garage'));
      for (const tab of ['stats', 'tune', 'look']) {
        await page.evaluate((tab) => document.querySelector(`#gTabs button[data-tab="${tab}"]`).click(), tab);   // щелчок кодом: за краем окна мышь кнопку не достанет
        const r = await layout(page, ['#gCarsWrap', '#gPanel', '#gName', '#gTabs button[data-tab="stats"]', '#gTabs button[data-tab="look"]', '#gActions button', '#scrGarage .head .money']);
        if (r.out.length || r.over.length) bad[size.width + ' ' + tab] = r.out.concat(r.over);
      }
      await page.evaluate(() => __drift.show('main'));
    }
    expect(bad).toEqual({});
  });

  test('HUD в окне 560-1120 px: в заезде и в свободной езде (подсказка E, схема повреждений) ничего не уходит за край и не налезает', async ({ page }) => {
    const bad = {};
    await openDrift(page);
    await page.evaluate(() => __drift.setSetting('damage', 'full'));
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await startQuick(page, { track: 'city', mode: 'race', opp: 5, laps: 2 });
      await page.evaluate(() => { __drift.step(3.5 * 120, { thr: 1 }); __drift.manual = false; });
      await page.waitForTimeout(250);
      const r = await layout(page, HUD_RACE);
      if (r.out.length || r.over.length) bad['заезд ' + size.width] = r.out.concat(r.over);
      await page.evaluate(() => __drift.toMenu());
    }
    // мир: появление у фестиваля - подсказка «E Фестиваль…» видна
    await page.evaluate(() => __drift.startWorld('coast', { fest: true }));
    await page.waitForFunction(() => __drift.screen === 'world');
    await page.evaluate(() => { __drift.manual = true; });
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await page.waitForTimeout(250);
      const r = await layout(page, HUD_WORLD);
      expect(r.shown).toContain('#wPrompt');
      expect(r.shown).toContain('#hDmg');
      if (r.out.length || r.over.length) bad['мир ' + size.width] = r.out.concat(r.over);
    }
    expect(bad).toEqual({});
  });

  test('пауза от оболочки и потеря фокуса во время загрузки: заезд и мир открываются на паузе, время стоит', async ({ page }) => {
    await openDrift(page);
    const viaMsg = await page.evaluate(async () => {
      __drift.manual = false;
      const p = __drift.startQuick({ track: 'port', mode: 'race', opp: 3, laps: 1 });
      const during = __drift.screen;
      window.postMessage({ mix: 'pause' }, '*');
      await p; await new Promise((r) => setTimeout(r, 300));
      return { during, screen: __drift.screen, paused: __drift.paused, cd: __drift.race.countdown };
    });
    expect(viaMsg.during).toBe('load');
    expect(viaMsg).toMatchObject({ screen: 'race', paused: true });
    await expect(page.locator('#scrPause')).toBeVisible();
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => __drift.race.countdown)).toBe(viaMsg.cd);
    await page.evaluate(() => __drift.toMenu());
    // потеря фокуса окна во время загрузки
    const viaBlur = await page.evaluate(async () => {
      const p = __drift.startQuick({ track: 'port', mode: 'race', opp: 3, laps: 1 });
      window.dispatchEvent(new Event('blur'));
      await p; await new Promise((r) => setTimeout(r, 100));
      return { screen: __drift.screen, paused: __drift.paused };
    });
    expect(viaBlur).toEqual({ screen: 'race', paused: true });
    await page.evaluate(() => __drift.toMenu());
    // свободная езда
    const world = await page.evaluate(async () => {
      const p = __drift.startWorld('coast');
      window.postMessage({ mix: 'pause' }, '*');
      await p; await new Promise((r) => setTimeout(r, 100));
      const t0 = __drift.world.t; await new Promise((r) => setTimeout(r, 400));
      return { screen: __drift.screen, paused: __drift.paused, still: __drift.world.t === t0 };
    });
    expect(world).toEqual({ screen: 'world', paused: true, still: true });
    await page.evaluate(() => __drift.toMenu());
    // пауза, пришедшая в меню, к следующему заезду не прилипает
    const fresh = await page.evaluate(async () => {
      window.postMessage({ mix: 'pause' }, '*'); window.dispatchEvent(new Event('blur'));
      await new Promise((r) => setTimeout(r, 50));
      await __drift.startQuick({ track: 'port', mode: 'race', opp: 1, laps: 1 });
      return __drift.paused;
    });
    expect(fresh).toBe(false);
  });

  test('клавиши M и F заняты свободной ездой (карта и фото): назначить их действию нельзя, прежняя клавиша остаётся, игрок видит почему', async ({ page }) => {
    await openDrift(page);
    await page.evaluate(() => __drift.show('settings'));
    await page.locator('#sTabs button[data-tab="controls"]').click();
    for (const [act, code, word] of [['nitro', 'KeyF', 'фото'], ['camera', 'KeyM', 'карт']]) {
      const before = await page.evaluate((a) => __drift.settings.bindings[a].slice(), act);
      await page.locator(`.keyslot[data-act="${act}"][data-slot="0"]`).click();
      await page.keyboard.press(code);
      expect(await page.evaluate((a) => __drift.settings.bindings[a], act)).toEqual(before);
      await expect(page.locator('#toast')).toContainText(word);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mix.drift.settings')).bindings.nitro)).not.toContain('KeyF');
    }
    // обычная клавиша назначается как раньше
    await page.locator('.keyslot[data-act="nitro"][data-slot="0"]').click();
    await page.keyboard.press('KeyN');
    expect(await page.evaluate(() => __drift.settings.bindings.nitro[0])).toBe('KeyN');
    // в свободной езде F по-прежнему фото-режим, M - карта
    await page.evaluate(() => __drift.startWorld('coast'));
    await page.waitForFunction(() => __drift.screen === 'world');
    await page.keyboard.press('KeyF');
    expect(await page.evaluate(() => __drift.overlay)).toBe('photo');
  });

  test('подсказки называют назначенные клавиши: «на трассу» в советах загрузки заезда и мира; справка про камеру знает вид из салона', async ({ page }) => {
    await openDrift(page);
    await page.evaluate(() => { const s = __drift.settings; s.bindings.reset = ['KeyT', '']; __drift.setSetting('bindings', s.bindings); });
    // все советы загрузки заезда: Math.random выбирает каждый по очереди
    const tips = await page.evaluate(async () => {
      const out = [], orig = Math.random;
      for (let i = 0; i < 16; i++) {
        Math.random = () => (i + 0.5) / 16;
        __drift.manual = true;
        const p = __drift.startQuick({ track: 'port', mode: 'race', opp: 0, laps: 1 });
        out.push(document.getElementById('loadTip').textContent);
        Math.random = orig; await p; __drift.toMenu();
      }
      return [...new Set(out)];
    });
    expect(tips.length).toBeGreaterThan(4);
    for (const t of tips) expect(t).not.toMatch(/(^|[^A-Za-zА-Яа-я])R([^A-Za-zА-Яа-я]|$)/);
    expect(tips.some((t) => /(^|\s)T\s/.test(t))).toBe(true);
    const wt = await page.evaluate(async () => { const p = __drift.startWorld('coast'); const t = document.getElementById('loadTip').textContent; await p; __drift.toMenu(); return t; });
    expect(wt).not.toMatch(/(^|[^A-Za-zА-Яа-я])R([^A-Za-zА-Яа-я]|$)/);
    expect(wt).toMatch(/(^|\s)T - /);
    await page.evaluate(() => __drift.show('help'));
    await expect(page.locator('#helpBody')).toContainText('из салона');
  });
});
