// Копия игры «Бег по рельсам» (свой репозиторий RailRunner) в web/rail-runner/, чтобы карточка Хаба
// открывала её во вкладке и без сети - так же, как tools/sync-calibrate.js делает с Калибровкой.
//
//   node tools/sync-railrunner.js [папка RailRunner]
//
// Папка - аргументом или переменной RAILRUNNER_DIR; без них - ../RailRunner от корня репозитория
// (Projects/Web/RailRunner рядом с Programms; из worktree wip/* путь передавать явно). Берутся файлы
// web/ из последнего коммита (git show HEAD:...), а не с диска: несохранённые правки в Хаб не попадают.
//
// Копия - как есть: <meta name="application-name" content="Бег по рельсам"> в странице уже есть
// (закон Хаба «имя в таблице совпадает с именем из страницы» - скрипт это проверяет, а не вставляет).
// Esc игра понимает сама (пауза по P и Esc), в Хабе он доходит до неё - escToGame не нужен.
// Рядом пишется SOURCE.txt (версия из package.json и коммит), а в README.md и README.ru.md - версия
// между метками <!--rail-ver-->...<!--/rail-ver-->.
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.resolve(ROOT, process.argv[2] || process.env.RAILRUNNER_DIR || '../RailRunner');
const OUT = path.join(ROOT, 'web', 'rail-runner');
const NAME = 'Бег по рельсам';

const git = (...args) => execFileSync('git', ['-C', SRC, ...args], { maxBuffer: 64 << 20 });

function main() {
  if (!fs.existsSync(path.join(SRC, 'web', 'index.html'))) throw new Error('нет web/index.html в ' + SRC + ' (укажи папку аргументом или RAILRUNNER_DIR)');
  const version = JSON.parse(git('show', 'HEAD:package.json').toString()).version;
  const commit = git('rev-parse', '--short', 'HEAD').toString().trim();
  const list = git('ls-files', '-z', '--', 'web').toString().split('\0').filter(Boolean);

  const written = new Set();
  for (const f of list) {
    const rel = f.slice('web/'.length);
    let data = git('show', 'HEAD:' + f);
    if (rel === 'index.html') {
      const html = data.toString('utf8');
      const m = /<meta name=["']application-name["'] content=["']([^"']*)["']/i.exec(html);
      if (!m || m[1] !== NAME) throw new Error(`в index.html RailRunner нет <meta name="application-name" content="${NAME}"> - Хаб берёт имя вкладки оттуда`);
    }
    const dst = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, data);
    written.add(path.normalize(rel));
  }
  fs.writeFileSync(path.join(OUT, 'SOURCE.txt'),
    `RailRunner ${version} (commit ${commit})\n` +
    'https://github.com/ALEXalesha/RailRunner - folder web/ as is.\n' +
    'Do not edit here: fix it in RailRunner and run node tools/sync-railrunner.js.\n');
  written.add('SOURCE.txt');

  // файлы, которых в RailRunner больше нет (копия в git - их всегда можно вернуть)
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(OUT)) {
    const rel = path.relative(OUT, f);
    if (!written.has(path.normalize(rel))) { fs.rmSync(f); console.log('убран лишний файл:', rel); }
  }

  for (const readme of ['README.md', 'README.ru.md']) {
    const p = path.join(ROOT, readme);
    const text = fs.readFileSync(p, 'utf8');
    const next = text.replace(/<!--rail-ver-->[^<]*<!--\/rail-ver-->/g, `<!--rail-ver-->${version}<!--/rail-ver-->`);
    if (next === text && !text.includes(`<!--rail-ver-->${version}<!--/rail-ver-->`)) throw new Error('в ' + readme + ' нет метки <!--rail-ver-->');
    if (next !== text) fs.writeFileSync(p, next);
  }
  console.log(`web/rail-runner: RailRunner ${version} (${commit}), файлов ${list.length}`);
}

main();
