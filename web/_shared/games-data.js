// Игры «Хаба» - одна таблица для приложения на Electron (app/games.js читает её через
// require) и для браузерной страницы (index.html в корне подключает её тегом <script> и
// получает window.IGROTEKA_DATA). Порядок - как назвал владелец; карточки идут так же.
//
// Поля игры:
//   id       - папка игры в web/ (страница web/<id>/index.html, картинка карточки
//              app/assets/thumbs/<id>.jpg - её снимает npm run thumbs);
//   name     - имя на карточке и вкладке. Совпадает с <meta name="application-name">
//              страницы игры (это сверяет закон в tests-app/unit/rules.test.js): приложение
//              читает имя из самой страницы, а браузерная страница берёт его отсюда;
//   desc     - строка под именем на карточке;
//   keys     - клавиши, которые игра забирает себе: пока она активна, приложение их не
//              трогает (перезапуск тогда - Ctrl+R, Ctrl+F5 или меню вкладки);
//   escToGame - Esc перехватывает приложение и отдаёт игре само (событие 'igroteka:esc'),
//              см. app/games.js и app/main.js; браузерной странице поле не нужно;
//   storage  - чем игра пользуется в хранилище браузера: приставки ключей localStorage и
//              базы IndexedDB (с пометкой «idb:»). В приложении у каждой игры свой сеанс, а
//              в браузере все страницы одного сайта делят одно хранилище, поэтому приставки
//              игр не должны пересекаться (закон в tests/weblauncher.spec.js проверяет, что
//              игра пишет только под своими). По ним же браузерная страница стирает данные
//              одной игры.
//
// SYSTEMS - демо интерфейсов в духе настольных и телефонных систем: раздел «Демо систем»
// и в приложении, и на браузерной странице.
// PROGRAMS - программы, а не игры (раздел «Программы» под играми): открываются во вкладке
// так же, но в приложение попадает только их страница index.html - у программы рядом
// бывают своя оболочка Electron и инструменты (web/writing-speed/electron, tools).
// Поля программ сверх полей игр (необязательные):
//   uses   - соседние папки web/, из которых страница грузит общие файлы (компилятор берёт
//            Python и ядро редактора из web/python_ide): приложение пускает её и туда;
//   files  - что из web/ идёт в сборку приложения, если не одна страница index.html;
//   url    - программа открывается на своём сайте: карточка - ссылка (браузерная страница -
//            новая вкладка браузера, приложение - системный браузер), своей вкладки, папки в
//            web/ и хранилища у неё нет (storage пустой). Только вместе с external: true - явная
//            пометка «уводит наружу» (закон в tests-app/unit/rules.test.js); сейчас таких нет:
//            программы из своих репозиториев копируются в web/<id> (tools/sync-calibrate.js);
//   single - false: не вкладывать в «Хаб одним файлом» (tools/make-single.js) - там
//            карточки нет; так у компилятора, его движки - десятки мегабайт соседних файлов.
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.IGROTEKA_DATA = data;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GAMES = [
    { id: 'minecraft_clone_3d_1', name: 'Кубический мир', desc: 'Песочница из кубов: копай, строй, мир сохраняется', keys: ['F1', 'F2', 'F3', 'F5'], escToGame: true, storage: ['idb:cubeworld', 'cw2_', 'cubeworld_'] },
    { id: 'roblox-mini', name: 'Блоксити', desc: 'Город площадок: выбирай место и наряжай своего героя', storage: ['mix.blox.'] },
    { id: 'fps_1', name: 'Операция: Периметр', desc: 'Тактический шутер от первого лица: раунды, оружие, точность', storage: ['mix.tactical.'] },
    { id: 'dino', name: 'Дино-бег', desc: 'Беги, прыгай через кактусы и пригибайся от птиц', storage: ['dino:'] },
    { id: 'mario', name: 'Прыг-скок', desc: 'Платформер: жуки, ямы, колонны и подарочные блоки', storage: ['jumper:'] },
    { id: 'horizon_drift_offline', name: 'Horizon Drift', desc: 'Гонки с дрифтом: три трассы и три режима', storage: ['mix.drift.'] },
    { id: 'jungle-strike', name: 'Огненные джунгли', desc: 'Аркада-стрелялка: пробейся через джунгли к боссу', storage: ['jungle:'] },
    { id: 'space_shooter', name: 'Космический стрелок', desc: 'Отбивайся от волн кораблей и астероидов', storage: ['space:'] },
    // Добавлены 27.09.2026 по выбору владельца; описания временные, их уточнят после
    // слияния доработанных игр.
    { id: 'tetris', name: 'Блоки', desc: 'Падающие фигуры: собирай ряды, держи запас, крути фигуры', storage: ['blocks:'] },
    { id: 'sudoku', name: 'Судоку', desc: 'Судоку четырёх уровней с подсказками, паузой и рекордами', storage: ['sudoku:'] },
    // Добавлена 10.10.2026 по «да» владельца. Фан-игра в жанре «пролети между колоннами»,
    // имя своё: с правообладателями известных игр жанра не связана.
    { id: 'flappy-wings', name: 'Летучая птичка', desc: 'Пролети между колоннами: взмах - клик, пробел или касание', storage: ['flappy:'] },
    // Добавлена 16.10.2026: свой репозиторий RailRunner (Pages /RailRunner/), здесь копия его web/
    // (tools/sync-railrunner.js), как у Калибровки. Сохранение - ключ railrunner:save.
    { id: 'rail-runner', name: 'Бег по рельсам', desc: 'Беги по трём путям: прыгай, ныряй под перекладины, уходи от поездов', storage: ['railrunner:'] },
  ];

  // style - на что похоже демо: это попадает в подпись «демо в стиле ...».
  const SYSTEMS = [
    { id: 'win11_3', name: 'Win-подобная оболочка', desc: 'Рабочий стол: окна, «Пуск», свои программы и папка «Игры»', style: 'Windows 11', storage: ['idb:win11_3', 'win11_3.'] },
    { id: 'macos-tahoe', name: 'Тахо', desc: 'Стекло, Dock, Mission Control, Launchpad и папка «Игры»', style: 'macOS', storage: ['idb:macos-tahoe', 'macos-tahoe.'] },
    { id: 'ios26', name: 'Телефон «Стекло»', desc: 'Телефон: стеклянные значки, уведомления, переключатель и игры', style: 'iOS', storage: ['idb:ios26', 'ios26.'] },
    { id: 'oneui7', name: 'Телефон «Волна»', desc: 'Телефон: шторка, недавние приложения, свои файлы и игры', style: 'One UI', storage: ['idb:oneui7', 'oneui7.'] },
  ];

  // Добавлена 10.10.2026 по просьбе владельца («добавим в игротеку как программу»).
  const PROGRAMS = [
    { id: 'writing-speed', name: 'Скорость печати', desc: 'Тест скорости печати: шесть языков и код, ошибки по клавишам, рекорды', storage: ['typing:'] },
    // Добавлен 10.10.2026 по слову владельца («добавим в Игротеку как программу»).
    { id: 'compiler', name: 'Компилятор', desc: 'C, C++, Python, JavaScript, TypeScript, Lua, Ruby и SQL - запуск прямо здесь, без сети', storage: ['compiler.'],
      uses: ['python_ide'], files: ['web/compiler/**/*', 'web/python_ide/runtime.js', 'web/python_ide/vendor/**/*'], single: false },
    { id: 'files-manager', name: 'Файловый менеджер', desc: 'Проводник: дерево, вкладки, две панели, поиск и просмотр файлов; здесь - демо-диск', storage: ['idb:files-manager', 'files-manager.'] },
    // Добавлена 11.10.2026: свой репозиторий Calibrate3dPrinter; сначала была ссылкой на его сайт, с того же дня -
    // копия страницы в web/calibrate3dprinter (node tools/sync-calibrate.js), открывается во вкладке и без сети.
    { id: 'calibrate3dprinter', name: 'Калибровка 3D-принтера', desc: 'Calibrate 3D Printer: G-code десяти тестов для любого FDM-принтера и расчёт поправок',
      storage: ['calib3d-'], files: ['web/calibrate3dprinter/**/*'] },
    // Добавлен 11.10.2026: «Медиаплеер» - своя музыка из генератора песен и файлы пользователя.
    { id: 'media-player', name: 'Медиаплеер', desc: 'Своя музыка без интернета и ваши файлы: плейлист, эквалайзер 10 полос, визуализация', storage: ['mplayer:'] },
    // Добавлены 16.10.2026 вместо прежней страницы web/calculator (решение владельца): два калькулятора
    // из своего репозитория Calculators, копии их src/ (node tools/sync-calculators.js), как у Калибровки.
    // Ключ темы в копиях свой у каждого (в программах он общий «calc-theme»).
    { id: 'calcpro-glass', name: 'Калькулятор Glass', desc: 'Calc Pro Glass: обычный, научный, дроби и программист (HEX, DEC, OCT, BIN), история и память',
      storage: ['calcPro.'], files: ['web/calcpro-glass/**/*'] },
    { id: 'ios-calculator', name: 'Калькулятор iOS 26', desc: 'Calculator iOS 26: калькулятор в духе iPhone - пошаговый счёт, научная панель, история',
      storage: ['calc_history_v1', 'calc_theme'], files: ['web/ios-calculator/**/*'] },
  ];

  for (const g of GAMES) { g.keys = g.keys || []; Object.freeze(g.keys); Object.freeze(g.storage); Object.freeze(g); }
  for (const s of SYSTEMS) { Object.freeze(s.storage); Object.freeze(s); }
  for (const p of PROGRAMS) { Object.freeze(p.storage); if (p.uses) Object.freeze(p.uses); if (p.files) Object.freeze(p.files); Object.freeze(p); }
  return Object.freeze({ GAMES: Object.freeze(GAMES), SYSTEMS: Object.freeze(SYSTEMS), PROGRAMS: Object.freeze(PROGRAMS) });
});
