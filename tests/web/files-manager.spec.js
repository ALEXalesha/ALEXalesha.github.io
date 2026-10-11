// Законы «Файлового менеджера / FilesManager» (web/files-manager/index.html) - смоук.
// Только демо-диск в IndexedDB браузера: настоящие файлы проверки не трогают.
// Запуск: npx playwright test tests/web/files-manager.spec.js --workers=1
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const URL = pathToFileURL(path.join(__dirname, '..', '..', 'web', 'files-manager', 'index.html')).href;

async function openFm(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__fm && window.__fm.ready, null, { timeout: 20000 });
  await page.evaluate(() => window.__fm.idle());
  return errors;
}

test('страница открывается на демо-диске без ошибок', async ({ page }) => {
  const errors = await openFm(page);
  const st = await page.evaluate(() => ({ v: window.__fm.version, tab: window.__fm.tab() }));
  expect(st.v).toBe('1.0.0');
  expect(st.tab.vol).toBe('demo');
  expect(st.tab.error).toBeFalsy();
  expect(st.tab.names.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('новая папка, вкладка, две панели, удаление в Корзину программы', async ({ page }) => {
  const errors = await openFm(page);
  const before = await page.evaluate(() => window.__fm.tab().names.length);
  await page.evaluate(() => window.__fm.run('newFolder'));
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.__fm.idle());
  const after = await page.evaluate(() => window.__fm.tab());
  expect(after.names.length).toBe(before + 1);
  const made = after.names.find((n) => !n.startsWith('.') && after.sel.includes(n)) || after.sel[0];
  expect(made).toBeTruthy();

  // удаление: только в Корзину программы, и оттуда видно
  await page.evaluate((n) => window.__fm.select([n]), made);
  await page.evaluate(() => { window.__fm.run('delete'); });
  // спрашивает перед удалением; кнопка «Удалить» - data-act=ok
  await page.locator('[data-act="ok"]').last().click();
  await page.evaluate(() => window.__fm.idle());
  expect(await page.evaluate(() => window.__fm.tab().names)).not.toContain(made);
  await page.evaluate(() => window.__fm.run('trashOpen'));
  await page.evaluate(() => window.__fm.idle());
  expect((await page.evaluate(() => window.__fm.tab().names)).join('|')).toContain(made);

  // вкладка и две панели
  await page.evaluate(() => window.__fm.run('newTab'));
  await page.evaluate(() => window.__fm.run('dual'));
  await page.evaluate(() => window.__fm.idle());
  expect(await page.evaluate(() => window.__fm.settings.dual)).toBe(true);
  expect(errors).toEqual([]);
});

// Горячие клавиши Проводника на демо-диске: создать папку и назвать её, F2, копировать-вставить,
// войти и выйти (Enter, Alt+стрелка), вкладки Ctrl+T / Ctrl+W, вторая панель Ctrl+\.
test('горячие клавиши: Ctrl+Shift+N, F2, Ctrl+C/V, Enter, Alt+←, Ctrl+T/W, Ctrl+обратная косая', async ({ page }) => {
  const errors = await openFm(page);
  const tab = () => page.evaluate(() => window.__fm.tab());
  const idle = () => page.evaluate(() => window.__fm.idle());
  const tabsCount = () => page.evaluate(() => { const A = window.__fm.App; return A.panels[A.active].tabs.length; });

  // новая папка: имя сразу в поле, набранное заменяет выделенное
  await page.keyboard.press('Control+Shift+N');
  await idle();
  await expect(page.locator('input.rename')).toBeFocused();
  await page.keyboard.type('Ключи');
  await page.keyboard.press('Enter');
  await idle();
  expect((await tab()).names).toContain('Ключи');

  // F2 - переименовать выбранное
  await page.evaluate(() => window.__fm.select(['Ключи']));
  await page.keyboard.press('F2');
  await expect(page.locator('input.rename')).toBeFocused();
  await page.keyboard.type('Ключи-2');
  await page.keyboard.press('Enter');
  await idle();
  const t1 = await tab();
  expect(t1.names).toContain('Ключи-2');
  expect(t1.names).not.toContain('Ключи');

  // копировать файл, войти в папку Enter, вставить, назад Alt+←
  const file = t1.names.find((n) => /\.txt$/.test(n));
  expect(file).toBeTruthy();
  await page.evaluate((n) => window.__fm.select([n]), file);
  await page.keyboard.press('Control+C');
  await page.evaluate(() => window.__fm.select(['Ключи-2']));
  await page.keyboard.press('Enter');
  await idle();
  expect((await tab()).path).toContain('Ключи-2');
  expect((await tab()).names).toEqual([]);
  await page.keyboard.press('Control+V');
  await idle();
  expect((await tab()).names).toEqual([file]);
  await page.keyboard.press('Alt+ArrowLeft');
  await idle();
  const t2 = await tab();
  expect(t2.names).toContain('Ключи-2');
  expect(t2.names).toContain(file); // копия, а не перенос
  expect(t2.fwd).toBe(1);

  // вкладки и вторая панель
  const n0 = await tabsCount();
  await page.keyboard.press('Control+T');
  await idle();
  expect(await tabsCount()).toBe(n0 + 1);
  await page.keyboard.press('Control+W');
  await idle();
  expect(await tabsCount()).toBe(n0);
  const dual0 = await page.evaluate(() => window.__fm.settings.dual);
  await page.keyboard.press('Control+Backslash');
  await idle();
  expect(await page.evaluate(() => window.__fm.settings.dual)).toBe(!dual0);
  expect(errors).toEqual([]);
});
