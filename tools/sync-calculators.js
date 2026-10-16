// Копии двух калькуляторов из своего репозитория Calculators (на GitHub - CalculatorPro) в Хаб:
// Calc Pro Glass -> web/calcpro-glass, Calculator iOS 26 -> web/ios-calculator. Карточки раздела
// «Программы» открывают их во вкладке и без сети - так же, как tools/sync-calibrate.js делает с
// Калибровкой. Третий калькулятор (Calc Pro на C# и WPF) - не страница, в Хаб он не попадает.
//
//   node tools/sync-calculators.js [папка Calculators]
//
// Папка - аргументом или переменной CALCULATORS_DIR; без них - ../../Apps/Calculators от корня
// репозитория (так лежат проекты у владельца; из worktree wip/* путь передавать явно). Берутся
// файлы <приложение>/src/ из последнего коммита (git show HEAD:...), а не с диска: несохранённые
// правки калькуляторов в Хаб не попадают.
//
// Что меняется в копии (и только это):
//   index.html - после <title> вставляются <meta name="application-name"> (Хаб берёт имя вкладки из
//     страницы, закон «имя в таблице совпадает с именем из страницы») и <style id="hub-embed">:
//     во вкладке нет своего окна, поэтому кнопки «Свернуть» и «Закрыть» спрятаны, перетаскивание
//     окна выключено, а сам калькулятор стоит по центру вкладки в размере большого окна;
//   theme.js - ключ темы в localStorage. В программах он общий («calc-theme»), а в браузерном Хабе все
//     страницы сайта делят одно хранилище, и приставки у карточек не должны пересекаться (закон в
//     tests-app/unit/rules.test.js) - поэтому у Glass «calcPro.theme», у iOS «calc_theme».
// Рядом пишется SOURCE.txt (версия из package.json приложения и коммит), а в README.md и README.ru.md -
// версии между метками <!--calc-ver-->...<!--/calc-ver--> (одна версия на оба: выпуски Calculators общие).
// Файлов, которых в калькуляторе больше нет, скрипт не стирает - он останавливается и называет их
// (убрать через git rm).
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.resolve(ROOT, process.argv[2] || process.env.CALCULATORS_DIR || '../../Apps/Calculators');

const APPS = [
  { from: 'calcpro-glass', id: 'calcpro-glass', name: 'Калькулятор Glass', product: 'Calc Pro Glass',
    themeKey: 'calcPro.theme', hide: ['#btnMinimize', '#btnClose'], width: 460, height: 760 },
  { from: 'ios-calculator', id: 'ios-calculator', name: 'Калькулятор iOS 26', product: 'Calculator iOS 26',
    themeKey: 'calc_theme', hide: ['#winMin', '#winClose'], width: 400, height: 760,
    // место под кнопки окна справа в заголовке и в истории больше не нужно - «•••» встаёт к краю
    css: ':root .header, :root .history-panel-header { padding-right: 14px; }' },
];

const git = (...args) => execFileSync('git', ['-C', SRC, ...args], { maxBuffer: 64 << 20 });

function embedStyle(app) {
  // Высота и ширина - как у большого окна программы; меньше вкладка - калькулятор во всю вкладку,
  // как окно, ужатое до этого размера (его медиа-запросы и раскладка клавиш считают то же самое).
  const v = (n, axis) => `max(0px, calc((100${axis} - ${n}px) / 2))`;
  return [
    '<style id="hub-embed">',
    '  /* Хаб: копия для вкладки (tools/sync-calculators.js) - окна нет */',
    `  ${app.hide.join(', ')} { display: none !important; }`,
    '  .drag-zone, .drag { -webkit-app-region: no-drag !important; }',
    '  :root:root, :root:root body { background: color-mix(in srgb, var(--app-base) 72%, #000) !important; }',
    `  :root .app-shell { top: ${v(app.height, 'vh')}; bottom: ${v(app.height, 'vh')}; left: ${v(app.width, 'vw')}; right: ${v(app.width, 'vw')}; }`,
    ...(app.css ? ['  ' + app.css] : []),
    '</style>',
  ].join('\n');
}

function syncOne(app, commit) {
  const OUT = path.join(ROOT, 'web', app.id);
  const prefix = app.from + '/src/';
  const version = JSON.parse(git('show', `HEAD:${app.from}/package.json`).toString()).version;
  const list = git('ls-files', '-z', '--', prefix).toString().split('\0').filter(Boolean);
  if (!list.includes(prefix + 'index.html')) throw new Error(`нет ${prefix}index.html в ${SRC} (укажи папку аргументом или CALCULATORS_DIR)`);

  const written = new Set();
  for (const f of list) {
    const rel = f.slice(prefix.length);
    let data = git('show', 'HEAD:' + f);
    if (rel === 'index.html') {
      const html = data.toString('utf8');
      if (!/<\/title>/i.test(html)) throw new Error(`в ${f} нет <title>`);
      if (/name=["']application-name["']/i.test(html)) throw new Error(`в ${f} уже есть application-name - проверь имя`);
      if (!/class="app-shell"/.test(html)) throw new Error(`в ${f} нет .app-shell - раскладку для вкладки надо пересмотреть`);
      for (const sel of app.hide) if (!html.includes(`id="${sel.slice(1)}"`)) throw new Error(`в ${f} нет кнопки ${sel}`);
      data = Buffer.from(html.replace(/<\/title>/i, `</title>\n<meta name="application-name" content="${app.name}">\n${embedStyle(app)}`), 'utf8');
    } else if (rel === 'theme.js') {
      const js = data.toString('utf8');
      const re = /const STORAGE_KEY = 'calc-theme';/;
      if (!re.test(js)) throw new Error(`в ${f} нет const STORAGE_KEY = 'calc-theme' - проверь ключ темы`);
      data = Buffer.from(js.replace(re, `const STORAGE_KEY = '${app.themeKey}'; // в Хабе свой ключ (tools/sync-calculators.js)`), 'utf8');
    }
    const dst = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, data);
    written.add(path.normalize(rel));
  }
  fs.writeFileSync(path.join(OUT, 'SOURCE.txt'),
    `${app.product} ${version} (Calculators, commit ${commit})\n` +
    `https://github.com/ALEXalesha/CalculatorPro - folder ${prefix} as is, plus <meta name="application-name">,\n` +
    '<style id="hub-embed"> (no window buttons in a tab, centred) and its own theme key in theme.js.\n' +
    'Do not edit here: fix it in Calculators and run node tools/sync-calculators.js.\n');
  written.add('SOURCE.txt');

  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const stale = walk(OUT).map((f) => path.relative(OUT, f)).filter((rel) => !written.has(path.normalize(rel)));
  if (stale.length) throw new Error(`в web/${app.id} лишние файлы (в калькуляторе их нет) - убери через git rm: ${stale.join(', ')}`);
  console.log(`web/${app.id}: ${app.product} ${version} (${commit}), файлов ${list.length}`);
  return version;
}

function main() {
  const commit = git('rev-parse', '--short', 'HEAD').toString().trim();
  const versions = new Set(APPS.map((a) => syncOne(a, commit)));
  if (versions.size !== 1) throw new Error('у калькуляторов разные версии: ' + [...versions].join(', ') + ' - метка в README одна');
  const version = [...versions][0];
  for (const readme of ['README.md', 'README.ru.md']) {
    const p = path.join(ROOT, readme);
    const text = fs.readFileSync(p, 'utf8');
    const next = text.replace(/<!--calc-ver-->[^<]*<!--\/calc-ver-->/g, `<!--calc-ver-->${version}<!--/calc-ver-->`);
    if (next === text && !text.includes(`<!--calc-ver-->${version}<!--/calc-ver-->`)) throw new Error('в ' + readme + ' нет метки <!--calc-ver-->');
    if (next !== text) fs.writeFileSync(p, next);
  }
}

main();
