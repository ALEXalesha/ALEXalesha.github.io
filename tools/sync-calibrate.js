// Копия страницы «Калибровки 3D-принтера» (свой репозиторий Calibrate3dPrinter) в web/calibrate3dprinter/,
// чтобы карточка Хаба открывала её во вкладке и без сети.
//
//   node tools/sync-calibrate.js [папка Calibrate3dPrinter]
//
// Папка - аргументом или переменной CALIBRATE_DIR; без них - ../../Apps/Calibrate3dPrinter от корня
// репозитория (так лежат проекты у владельца). Берутся файлы web/ из последнего коммита (git show
// HEAD:...), а не с диска: несохранённые правки Калибровки в Хаб не попадают.
//
// Что меняется в копии: в index.html после <title> вставляется
// <meta name="application-name" content="Калибровка 3D-принтера"> - Хаб берёт имя вкладки из страницы
// (закон «имя в таблице совпадает с именем из страницы»). Больше ничего.
// Рядом пишется SOURCE.txt (версия и коммит), а в README.md и README.ru.md - версия между метками
// <!--calib-ver-->...<!--/calib-ver-->.
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.resolve(ROOT, process.argv[2] || process.env.CALIBRATE_DIR || '../../Apps/Calibrate3dPrinter');
const OUT = path.join(ROOT, 'web', 'calibrate3dprinter');
const NAME = 'Калибровка 3D-принтера';

const git = (...args) => execFileSync('git', ['-C', SRC, ...args], { maxBuffer: 64 << 20 });

function main() {
  if (!fs.existsSync(path.join(SRC, 'web', 'index.html'))) throw new Error('нет web/index.html в ' + SRC + ' (укажи папку аргументом или CALIBRATE_DIR)');
  const version = git('show', 'HEAD:VERSION').toString().trim();
  const commit = git('rev-parse', '--short', 'HEAD').toString().trim();
  const list = git('ls-files', '-z', '--', 'web').toString().split('\0').filter(Boolean);

  const written = new Set();
  for (const f of list) {
    const rel = f.slice('web/'.length);
    let data = git('show', 'HEAD:' + f);
    if (rel === 'index.html') {
      const html = data.toString('utf8');
      if (!/<\/title>/i.test(html)) throw new Error('в index.html Калибровки нет <title>');
      if (/name=["']application-name["']/i.test(html)) throw new Error('в index.html Калибровки уже есть application-name - проверь имя');
      data = Buffer.from(html.replace(/<\/title>/i, `</title>\n  <meta name="application-name" content="${NAME}">`), 'utf8');
    }
    const dst = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, data);
    written.add(path.normalize(rel));
  }
  fs.writeFileSync(path.join(OUT, 'SOURCE.txt'),
    `Calibrate 3D Printer ${version} (commit ${commit})\n` +
    'https://github.com/ALEXalesha/Calibrate3dPrinter - folder web/ as is, plus <meta name="application-name">.\n' +
    'Do not edit here: fix it in Calibrate3dPrinter and run node tools/sync-calibrate.js.\n');
  written.add('SOURCE.txt');

  // файлы, которых в Калибровке больше нет (копия в git - их всегда можно вернуть)
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(OUT)) {
    const rel = path.relative(OUT, f);
    if (!written.has(path.normalize(rel))) { fs.rmSync(f); console.log('убран лишний файл:', rel); }
  }

  for (const readme of ['README.md', 'README.ru.md']) {
    const p = path.join(ROOT, readme);
    const text = fs.readFileSync(p, 'utf8');
    const next = text.replace(/<!--calib-ver-->[^<]*<!--\/calib-ver-->/g, `<!--calib-ver-->${version}<!--/calib-ver-->`);
    if (next === text && !text.includes(`<!--calib-ver-->${version}<!--/calib-ver-->`)) throw new Error('в ' + readme + ' нет метки <!--calib-ver-->');
    if (next !== text) fs.writeFileSync(p, next);
  }
  console.log(`web/calibrate3dprinter: Calibrate 3D Printer ${version} (${commit}), файлов ${list.length}`);
}

main();
