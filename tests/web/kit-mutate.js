// Проверка закона «Как играть называет назначенные сейчас клавиши» (tests/web/kit.spec.js): по одному ломает
// правило во всех копиях kit.js или в тексте игры, гоняет закон и возвращает файлы на место (даже при ошибке).
// Запуск из корня: node tests/web/kit-mutate.js. Не *.spec.js - Playwright его сам не запускает.
const fs = require('fs');
const { spawnSync } = require('child_process');
const ROOT = require('path').join(__dirname, '..', '..');
const GAMES = ['dino', 'mario', 'tetris', 'space_shooter', 'jungle-strike', 'sudoku'];
const KITS = GAMES.map((g) => `web/${g}/kit.js`);
const MUTANTS = [
  { name: 'шаблоны {keys:} не заменяются', files: KITS, from: "return String(this.o.howto || '').replace(", to: "return String(this.o.howto || '') || String('').replace(" },
  { name: 'клавиши по умолчанию вместо назначенных', files: KITS, from: 'const k = (this.bindings[action] || []).filter(Boolean)', to: 'const k = ((this.actions[action] || {}).keys || []).filter(Boolean)' },
  { name: '«Как играть» без howtoHtml', files: KITS, from: 'html: this.howtoHtml(),', to: "html: this.o.howto || ''," },
  { name: 'дино: старый текст', files: ['web/dino/index.html'], from: '<b>Прыжок</b> - {keys:jump}', to: '<b>Прыжок</b> - Пробел, ↑', g: 'dino:' },
  { name: 'прыг-скок: старый текст', files: ['web/mario/index.html'], from: '{keys:jump} - прыжок', to: 'Пробел или ↑ - прыжок', g: 'mario:' },
];
let killed = 0;
for (const m of MUTANTS) {
  const saved = m.files.map((f) => [f, fs.readFileSync(`${ROOT}/${f}`, 'utf8')]);
  try {
    for (const [f, s] of saved) { if (s.split(m.from).length !== 2) throw new Error(`${f}: нет куска ${m.from}`); fs.writeFileSync(`${ROOT}/${f}`, s.replace(m.from, m.to)); }
    const g = (m.g || '') + '.*Как играть';
    const r = spawnSync(`npx playwright test tests/web/kit.spec.js -g "${g}" --workers=4 --reporter=dot`, { cwd: ROOT, shell: true, encoding: 'utf8' });
    const dead = r.status !== 0;
    if (dead) killed++;
    console.log(`${dead ? 'убит ' : 'ВЫЖИЛ'}  ${m.name}`);
  } finally { for (const [f, s] of saved) fs.writeFileSync(`${ROOT}/${f}`, s); }
}
console.log(`итог: убито ${killed} из ${MUTANTS.length}`);
if (killed < MUTANTS.length) process.exitCode = 1;
