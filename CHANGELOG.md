# Changelog / Журнал изменений

## Unreleased

**EN**

- New game: RailRunner («Бег по рельсам», `web/rail-runner`) - run along three tracks in 3D, jump,
  slide under bars, dodge trains. It lives in its own repository RailRunner (Pages /RailRunner/);
  `web/rail-runner` is a copy of its `web/` folder (1.0.0, commit 87e9f72), refreshed with
  `node tools/sync-railrunner.js [folder]` (or `RAILRUNNER_DIR`); the copy is as is (its page already
  names itself). Esc reaches the game in a tab of the Hub and pauses the run, like P (law in
  `tests-app/games.spec.js`).
- Horizon Drift 1.1.1: in a window narrower than about 840 px (a tab of the app, half of the
  screen) the garage went past the right edge - the stats, the Tuning tab and the buy button
  were cut off. Now the 3D stand hides and the panel takes the room; on a phone the car list
  goes on top. In a window 560-1120 px wide the key hint at the bottom ran under the speedometer
  and the damage panel, the "E Festival" prompt in free roam was under the speedometer, and the
  pause button sat on the free-roam panel; now the hint wraps (and hides below 640 px), the
  prompt is above the speedometer and the pause button is under the map. A pause asked for
  while a track or a map was loading (the app switched to another tab, the window lost focus)
  was forgotten - the race started behind the player's back; now it opens paused. M and F are
  the map and photo keys in free roam: an action set to them did not work there, and the
  settings did not say so - now these keys are refused with a reason. The loading tip and the
  free-roam tip named R even after "back to the track" was set to another key; the help did not
  list the cockpit camera. 5 laws in `tests/web/horizon_drift_review.spec.js` (110 Horizon
  Drift laws), 11 new mutants (`node tests/web/horizon_drift-mutate.js`, now it can break
  `index.html` too).

**RU**

- Новая игра: «Бег по рельсам» (RailRunner, `web/rail-runner`) - бег по трём путям в 3D: прыгай,
  ныряй под перекладины, уходи от поездов. Живёт в своём репозитории RailRunner (Pages /RailRunner/);
  `web/rail-runner` - копия его папки `web/` (1.0.0, коммит 87e9f72), обновляется
  `node tools/sync-railrunner.js [папка]` (или `RAILRUNNER_DIR`); копия как есть (страница уже
  называет себя сама). Esc во вкладке Хаба доходит до игры и ставит забег на паузу, как P (закон в
  `tests-app/games.spec.js`).
- Horizon Drift 1.1.1: в окне уже ~840 px (вкладка приложения, полэкрана) гараж уходил за
  правый край - характеристики, вкладка «Тюнинг» и кнопка покупки обрезались. Теперь 3D-стенд
  прячется и панель занимает его место, на телефоне список машин встаёт сверху. В окне
  560-1120 px подсказка клавиш внизу залезала под спидометр и схему повреждений, подсказка
  «E Фестиваль» в свободной езде - под спидометр, кнопка паузы - на панель мира; теперь
  подсказка переносится (а уже 640 px прячется), «E» - над спидометром, пауза - под картой.
  Пауза, о которой попросили во время загрузки трассы или карты (приложение переключили на
  другую вкладку, окно потеряло фокус), забывалась - заезд начинался без игрока; теперь он
  открывается на паузе. M и F в свободной езде - карта и фото: действие, назначенное на них,
  там не работало, а настройки молчали - теперь эти клавиши не назначаются, с объяснением.
  Совет на экране загрузки и подсказка мира называли R, даже когда «вернуться на трассу»
  переназначили; в «Помощи» камера не знала вида из салона. 5 законов в
  `tests/web/horizon_drift_review.spec.js` (законов Horizon Drift 110), 11 новых мутантов
  (`node tests/web/horizon_drift-mutate.js`, теперь умеет ломать и `index.html`).

## 1.1.0 - 2026-10-16

**EN**

- The app and the browser page are now called **Hub** («Хаб»): there are not only games in it
  any more. Window title, home screen, installer, shortcuts and files of the build
  (`Hub-1.1.0-Setup.exe`, `Hub-1.1.0-Portable.exe`, `dist/hub-single.html`) carry the new
  name. Nothing of the user's is lost: the app keeps its data folder
  (`%APPDATA%\MixOfProject-Games`, it never depended on the name), the page keeps its storage
  keys, and the installer has the same appId, so it installs over Igroteka 1.0.0 and renames
  its shortcuts.
- Removed the old pages `web/windows_4` (a second Windows-style desktop), `web/explorer_1`
  (a file explorer page) and `web/browser_1` (an offline mini browser) with their laws and
  pictures. They were not in the Hub; new Compiler, Browser and Explorer programs replace
  them (the owner: the old ones are not needed).
- The Compiler in a tab of the browser Hub on the site waits for a line typed in its output,
  as the Compiler 1.1.x on its own site and in the app. Before, the Hub page was not
  cross-origin isolated, so its frames were not either, and the program saw only the Input
  field. Now `hub-coi-sw.js` (page script and service worker in one file) adds COOP/COEP to
  the Hub's own files (the page, `web/`, `app/`); the other sites of the address
  (`/PaintPro/`, `/Compiler/`, ...) stay untouched. Laws: the Compiler in a Hub tab gets a
  typed line (red without the worker), the worker touches only the Hub's paths; all 61 laws
  of the page pass with the isolation on.
- MediaPlayer 1.0.4: in a tab of the Hub the player pauses when you leave its tab and plays on
  from the same place when you come back (before, the background tab only went quiet while
  the song kept going); a pause you set yourself stays. The app sends the page of the tab
  `{hub: 'pause' | 'resume'}` (`postMix` in `app/main.js`), the browser Hub and the system
  demos send the frame `{mix: ...}`; when the whole Hub page is hidden (another browser tab)
  the browser Hub adds `why: 'page'`, and the player keeps playing. On its own the player
  keeps playing in the background as before. Laws: the page (top window and a frame), the
  browser Hub, the app; 3 new mutants.

- Independent review (16.10) of the released programs, each finding with a law that is red on
  the old code and a mutant:
  - WritingSpeed 1.1.2: a short Russian custom text or zen text got the QWERTY map of mistakes,
    and a mistake on a Russian letter went to "Other characters". The key name `space` was counted
    as five Latin letters. The speed chart with one point (the first test in History, a test
    shorter than a second) was empty - now the point is drawn. The page description no longer
    says "quotes" (the mode is "text" since 1.1.0). 91 laws, 2 new mutants.
  - Compiler 1.1.2: in a narrow window the open file list covered the ☰ button and a click beside
    it did nothing - only picking a file closed it. Now the list starts under the top bar and
    closes with ☰, a click beside it or Esc. The top bar had backdrop-filter with buttons inside
    (the cause of the light band on hover in WritingSpeed 1.1.1 and MediaPlayer 1.0.2) - now the
    same glass without it. With many files the overlay scroll bar of the list covered the ×
    button - now the list gets room for it. 32 laws, 4 new mutants (23 in all).
  - Flappy Wings: the hint before the flight and "How to play" named the default keys (Space, ↑,
    P) even after the keys were changed in the settings. Now they name the keys set now. 2 new
    mutants.

- Calibrate 3D Printer opens in a tab of the app, offline, like the other programs (before,
  the card opened the site in the system browser). `web/calibrate3dprinter` is a copy of the
  `web/` folder of Calibrate3dPrinter 1.0.0 (commit 12cbdca), made by
  `node tools/sync-calibrate.js [folder]` (or `CALIBRATE_DIR`): it takes the files of the last
  commit, adds `<meta name="application-name">` and writes the version into `SOURCE.txt` and
  the READMEs. Law: no card of "Programs" leads out of the app unless marked `external: true`
  (mutant: the old `url` back on the card - the law fails). In the app the tab builds the
  G-code of one test, with no outside requests and no console errors.
- New README frames made by `npm run screenshots`: the home screen with games and the whole
  "Programs" section, and the "Programs" section in the dark and light themes.

- Compiler 1.1.1: a double click on a file in the list renames it again. The first click
  opens the file and draws the list anew, so the double click went to the row that was
  already gone and the rename field never showed. Now the second press on the same file
  starts the rename. Law with the real mouse (`page.mouse.dblclick`) on the open file and on
  another one; a new mutant (19 in all, all killed).
- MediaPlayer 1.0.1: the playlist scroll bar no longer covers the play button of each row.
  Overlay scroll bars (Chrome on Windows 11, macOS) take no space and are drawn over the right
  edge of the rows; the bar covered the button by 7 px. Now the page checks the scroll bar kind
  and gives the list a 14 px right padding for an overlay bar. Law over 12 window sizes and five
  themes, classic and overlay bars, gap at least 4 px; 3 new mutants.
- New program: MediaPlayer (`web/media-player`) in the "Programs" section: 12 own songs from
  a song generator (no more than two equal notes in a row), your files, playlist, 10-band
  equalizer, visualizer, Media Session, five themes, RU/EN; its own Electron shell. 36 laws,
  11 of 11 mutants killed.
- WritingSpeed 1.1.0: pressing a menu button no longer highlights the whole row (the row text
  was selected when the mouse moved a little); the "quote" mode became "text" - classic
  passages and original texts of ~10/~20/~50/~100/~200/~300 words, 10 per length and language
  (length within 20 %), old quote records move to "text"; "time" can run on words or on text;
  "words 1000" became "dictionary: 200/1000/5000 most frequent words" with a hint; each mode
  shows only the settings that change it; zen: "new text" became "Erase"; custom text: Tab
  opens the new-text window; a long word without spaces wraps; Chinese (IME, characters per
  minute, "pinyin in Latin letters" mode, pinyin hint, mistakes by character, wordfreq zh).
- Compiler 1.1.0: input while the program runs - when the program waits for a line,
  an input box appears right in the output; Enter sends the line, Ctrl+D ends the input, Stop
  works while it waits, waiting does not use up the time limit. JS, TypeScript, Python, C/C++
  (WASI fd_read), Lua and Ruby; the worker sleeps in Atomics.wait on a SharedArrayBuffer.
  On a site the page is made cross-origin isolated by `coi-sw.js` (the coi-serviceworker idea,
  MIT); the app turns SharedArrayBuffer on with a Chromium switch; a page opened from disk keeps
  only the Input field and shows a hint (the field flashes) when the program wants more.
  9 laws in `tests/web/compiler-input.spec.js` and one in `tests-app/programs.spec.js`;
  7 new mutants in `tests/web/compiler-mutate.js` (18 in all, all killed).
- "Programs" gets a third card, Calibrate 3D Printer: a link to
  https://alexalesha.github.io/Calibrate3dPrinter/ (its own repository, no code copied). The new
  `url` field of `PROGRAMS`: the browser page opens the site in a new tab, the app in the system
  browser (no question - the address comes from the table), no tab, no storage, not in the
  clear-data list; card picture shot from the site by `npm run thumbs`.
- New program: the Compiler (`web/compiler`) in the "Programs" section of Igroteka (app and
  browser page; storage prefix `compiler.`). C and C++ are compiled by Clang 22 (YoWASP:
  clang, lld, wasi-libc, libc++ built for WebAssembly) and run with a small WASI host;
  Python is the Pyodide of `web/python_ide` (shared, not copied: the new `uses` field lets the
  app tab read that folder); JavaScript runs in a worker, TypeScript is type-checked first;
  Lua (Fengari), Ruby (ruby.wasm) and SQL (sql.js). Every program runs in its own worker:
  time limit, Stop, input from the Input field, errors highlighted on their line. Engines
  are packed (gzip + base64 in `<script>` files, `vendor/make-packs.js`) and load when their
  language is first used; the page works from disk. Not in the one-file Igroteka
  (`single: false`). 18 laws in `tests/web/compiler.spec.js`, 11 mutants in
  `tests/web/compiler-mutate.js`. Also published on its own as ALEXalesha/Compiler.
- New program: WritingSpeed («Скорость печати», `web/writing-speed`), a typing speed
  test in one HTML page: time (15/30/60/120 s), words (10/25/50/100), quotes, custom text
  and zen; Russian, Ukrainian, English, German, French, Spanish and JS/Python code; the
  200/1000/5000 most frequent words (wordfreq 3.1.1, CC BY-SA 4.0, filtered with Hunspell
  dictionaries, no names or rude words); punctuation, numbers, capitals, no backspace,
  stop on error; WPM/CPM, raw speed, accuracy, consistency, a per-second graph, mistakes
  by key on the test language layout, records per mode and history (storage prefix
  `typing:`), a layout hint, the five Paint themes, RU/EN interface, font size. Its own
  Electron app (`web/writing-speed/electron`: NSIS setup and portable, remembers the
  window, version in the title) loads the same page. 40 laws, 20 mutants
  (`tests/web/writing-speed*`), app laws in `tests-app/unit/writing-speed.test.js` and
  `tests-app/writing-speed-app.spec.js`.
- New section "Programs" in the app and the browser page, below the games: WritingSpeed
  opens in a tab like a game (button "Открыть"), with its own session; only its
  `index.html` goes into the app build.
- Horizon Drift 1.1.0. Fix: "infinite nitro". The race added 0.012 per second to the nitro
  supply on every physics step (free roam: 0.02), and any supply above zero switched the full
  boost on, so with the button held the bar stayed empty while the car kept accelerating. An
  empty bottle is now locked until it refills to 10%, and a last bit smaller than one step's
  use gives only that share of the boost; the bar is dimmed while locked. 3 laws in
  `tests/web/horizon_drift_nitro.spec.js`.
- Horizon Drift: car damage with a setting in Settings → Game: "Off", "Visual only" (default)
  and "Full". The body dents where it is hit (mesh vertices pushed in along the hit, fading
  with distance, capped; light taps leave nothing), mirrors, bumpers and the hood fly off on
  hard hits and lie on the road for 12 s (24 pieces at most). "Full" adds tyre wear from
  locked-wheel braking, drifting and wheelspin (worn tyres grip up to 30% less), a steering
  pull after a hit to a front wheel and less power with a crushed front; a car and tyre
  diagram on the HUD. Career and time trials always use "Visual only". Repair: a new race,
  the festival, or G in free roam. With damage off or visual the physics is bit-for-bit the
  same as before (a law compares a hash of three runs with a recording made before the damage
  code). 13 laws in `tests/web/horizon_drift_damage.spec.js`, 33 mutants in
  `tests/web/horizon_drift-mutate.js`.
- New game in the list: Flappy Wings («Летучая птичка», `web/flappy-wings`), a fan game
  in the fly-between-the-columns genre, not affiliated with the rights holders of its known
  games. Card, picture and description in the app and the browser page; storage prefix
  `flappy:`; 24 laws and 10 mutants in `tests/web/flappy-wings*`.
- New: the browser version of Igroteka, `index.html` at the repository root: the same
  cards and pictures, games in tabs of the page, a "System demos" section; works from
  disk and from GitHub Pages (`.nojekyll` added). Pause/resume messages to the game when
  its tab is left or the browser tab is hidden, full screen button, volume, theme,
  reopening tabs, clearing one game's data.
- The game table moved to `web/_shared/games-data.js`, shared by the app and the page.
- New in the app: a "System demos" section (win11_3, macos-tahoe, ios26, oneui7) with the
  same cards as the browser page; demos open in tabs with their own `persist:` session,
  may load their own folder, `web/_os-shared` and the game folders, get the preload in
  every frame (volume; pointer lock stub in tests) and pass `{mix: 'pause'|'resume'}` to
  their game frames when the tab is left or shown again.
- Fix: the app took the game name from `<title>` and showed "Операция" instead of
  "Операция: Периметр"; now `<meta name="application-name">` comes first.

**RU**

- Приложение и браузерная страница теперь называются **«Хаб»** (Hub): там уже не только игры.
  Новое имя - в заголовке окна, на домашнем экране, в установщике, ярлыках и файлах сборки
  (`Hub-1.1.0-Setup.exe`, `Hub-1.1.0-Portable.exe`, `dist/hub-single.html`). Ничего своего
  не теряется: папка данных приложения прежняя (`%APPDATA%\MixOfProject-Games`, от имени она
  не зависела и раньше), у страницы прежние ключи хранилища, у установщика прежний appId -
  он встаёт поверх «Игротеки» 1.0.0 и переименовывает её ярлыки.
- Убраны старые страницы `web/windows_4` (вторая оболочка в духе Windows), `web/explorer_1`
  (страница проводника) и `web/browser_1` (офлайн-мини-браузер) вместе с их законами и
  кадрами. В Хабе их не было; на смену идут новые программы «Компилятор», «Браузер» и
  «Проводник» (Алексей: старые не нужны).
- «Компилятор» во вкладке браузерного Хаба на сайте ждёт строку, набранную в выводе, как
  Compiler 1.1.x на своём сайте и в приложении. Раньше страница Хаба не была изолирована,
  значит, и её вкладки-рамки тоже, и программа видела только поле «Ввод (stdin)». Теперь
  `hub-coi-sw.js` (скрипт страницы и service worker в одном файле) добавляет COOP/COEP к
  файлам Хаба (страница, `web/`, `app/`); соседние сайты адреса (`/PaintPro/`, `/Compiler/`
  и другие) он не трогает. Законы: «Компилятор» во вкладке Хаба получает набранную строку
  (красный без worker), worker трогает только пути Хаба; все 61 закон страницы проходят с
  изоляцией.
- Медиаплеер 1.0.4: во вкладке Хаба плеер встаёт на паузу, когда уходишь с его вкладки, и
  играет с того же места, когда возвращаешься (раньше фоновая вкладка только молчала, а песня
  шла); паузу, поставленную самим человеком, возврат не снимает. Приложение шлёт странице
  вкладки `{hub: 'pause' | 'resume'}` (`postMix` в `app/main.js`), браузерный Хаб и демо
  систем - рамке `{mix: ...}`; когда скрыта вся страница Хаба (другая вкладка браузера),
  браузерный Хаб добавляет `why: 'page'`, и плеер играет дальше. Сам по себе плеер, как и
  раньше, играет в фоне. Законы: страница (верхнее окно и рамка), браузерный Хаб,
  приложение; 3 новых мутанта.

- Независимая проверка (16.10) выпущенных программ, каждая находка - с законом, красным на старом
  коде, и мутантом:
  - WritingSpeed 1.1.2: короткий русский текст в «своём тексте» и дзене получал карту ошибок QWERTY,
    а ошибка по русской букве уходила в «Другие знаки». Имя клавиши `space` считалось пятью
    латинскими буквами. График скорости из одной точки (первый тест в «Истории», тест короче
    секунды) был пустым - теперь точка рисуется. В описании страницы больше нет «цитат» (режим с
    1.1.0 называется «текст»). 91 закон, 2 новых мутанта.
  - Компилятор 1.1.2: в узком окне открытый список файлов закрывал кнопку ☰, а щелчок мимо списка
    ничего не делал - закрыть можно было только выбором файла. Теперь список начинается под
    верхней панелью и закрывается ☰, щелчком мимо и Esc. У верхней панели был backdrop-filter с
    кнопками внутри (причина светлой полосы при наведении в WritingSpeed 1.1.1 и Медиаплеере
    1.0.2) - теперь то же стекло без него. При многих файлах overlay-полоса прокрутки списка
    закрывала кнопку × - теперь у списка есть место под неё. 32 закона, 4 новых мутанта (всего 23).
  - «Летучая птичка»: подсказка перед полётом и «Как играть» называли клавиши по умолчанию
    (пробел, ↑, P), даже когда их переназначили в настройках. Теперь - назначенные сейчас.
    2 новых мутанта.

- «Калибровка 3D-принтера» открывается во вкладке приложения и без сети, как остальные
  программы (раньше карточка открывала сайт в системном браузере). `web/calibrate3dprinter` -
  копия папки `web/` из Calibrate3dPrinter 1.0.0 (коммит 12cbdca), её делает
  `node tools/sync-calibrate.js [папка]` (или `CALIBRATE_DIR`): берёт файлы последнего коммита,
  добавляет `<meta name="application-name">`, пишет версию в `SOURCE.txt` и в README. Закон: ни
  одна карточка «Программ» не уводит из приложения, если не помечена `external: true` (мутант:
  старый `url` на карточке - закон краснеет). В приложении вкладка строит G-code одного теста,
  без запросов наружу и без ошибок в консоли.
- Новые кадры README (`npm run screenshots`): главная с играми и всем разделом «Программы» и
  раздел «Программы» в тёмной и светлой темах.

- Компилятор 1.1.1: двойной щелчок по файлу в списке снова переименовывает его. Первый
  щелчок открывает файл и рисует список заново, поэтому двойной щелчок уходил в строку,
  которой уже нет, и поле имени не появлялось. Теперь переименование начинает второе нажатие
  на тот же файл. Закон настоящей мышью (`page.mouse.dblclick`) по открытому и по другому
  файлу; новый мутант (всего 19, все убиты).
- Медиаплеер 1.0.1: полоса прокрутки плейлиста больше не заходит на кнопку «играть» в строках.
  Полоса поверх содержимого (Chrome в Windows 11, macOS) места не занимает и рисуется над правым
  краем строк - она закрывала кнопку на 7 px. Теперь страница узнаёт вид полосы и для такой даёт
  списку отступ справа 14 px. Закон на 12 размерах окна и пяти темах, классическая и наложенная
  полоса, зазор не меньше 4 px; 3 новых мутанта.
- Новая программа: Медиаплеер (`web/media-player`) в разделе «Программы»: 12 своих мелодий из
  генератора песен (не больше двух одинаковых нот подряд), ваши файлы, плейлист, эквалайзер
  10 полос, визуализация, Media Session, пять тем, RU/EN; своя оболочка Electron. 36 законов,
  мутантов убито 11 из 11.
- «Скорость печати» 1.1.0: нажатие кнопки меню больше не подсвечивает весь ряд (мышь чуть
  сдвигалась и выделяла текст ряда); режим «цитата» стал «текстом» - отрывки классиков и свои
  тексты на ~10/~20/~50/~100/~200/~300 слов, по 10 на длину и язык (длина ±20 %), рекорды
  цитат переехали в «текст»; «время» - на словах или на тексте; «слова 1000» стали
  «словарь: 200/1000/5000 частых слов» с подсказкой; в каждом режиме видны только влияющие
  настройки; дзен: «новый текст» стал «Стереть»; свой текст: Tab - окно нового текста; длинное
  слово без пробелов переносится; китайский (IME, знаков в минуту, режим «пиньинь латиницей»,
  подсказка-пиньинь, ошибки по иероглифам, wordfreq zh).
- Компилятор 1.1.0: ввод по ходу программы - когда программа ждёт строку, поле ввода
  появляется прямо в выводе; Enter отправляет строку, Ctrl+D - конец ввода, «Стоп» работает
  во время ожидания, ожидание не тратит предел времени. JS, TypeScript, Python, C/C++ (WASI
  fd_read), Lua и Ruby; поток спит в Atomics.wait на SharedArrayBuffer. На сайте изоляцию
  страницы даёт `coi-sw.js` (мысль coi-serviceworker, MIT), приложение включает
  SharedArrayBuffer флагом Chromium; у страницы с диска только поле «Ввод (stdin)» и подсказка
  (поле мигает), когда программе нужно больше. 9 законов в `tests/web/compiler-input.spec.js`
  и один в `tests-app/programs.spec.js`; 7 новых мутантов в `tests/web/compiler-mutate.js` (всего 18,
  все убиты).
- В «Программах» третья карточка - «Калибровка 3D-принтера»: ссылка на
  https://alexalesha.github.io/Calibrate3dPrinter/ (свой репозиторий, код не копируется). Новое
  поле `url` в `PROGRAMS`: браузерная страница открывает сайт в новой вкладке, приложение - в
  системном браузере (без вопроса - адрес из таблицы), без вкладки и хранилища, в списке очистки
  данных её нет; картинка карточки снята с сайта командой `npm run thumbs`.
- Новая программа: «Компилятор» (`web/compiler`) в разделе «Программы» «Игротеки»
  (приложение и браузерная страница; приставка хранилища `compiler.`). C и C++ компилирует
  Clang 22 (YoWASP: clang, lld, wasi-libc, libc++, собранные под WebAssembly), запуск -
  небольшим хостом WASI; Python - Pyodide из `web/python_ide` (общий, не копия: новое поле
  `uses` пускает вкладку приложения в эту папку); JavaScript - в отдельном потоке,
  TypeScript сначала проверяется на типы; Lua (Fengari), Ruby (ruby.wasm) и SQL (sql.js).
  Каждая программа - в своём потоке: предел времени, «Стоп», ввод из поля «Ввод (stdin)»,
  ошибки подсвечены на своей строке. Движки упакованы (gzip + base64 в файлах `<script>`,
  `vendor/make-packs.js`) и грузятся при первом выборе языка; страница работает с диска.
  В «Игротеку одним файлом» не входит (`single: false`). 18 законов в
  `tests/web/compiler.spec.js`, 11 мутантов в `tests/web/compiler-mutate.js`. Выложен и
  отдельным репозиторием ALEXalesha/Compiler.
- Новая программа: «Скорость печати» / WritingSpeed (`web/writing-speed`), тест скорости
  печати одной страницей HTML: время (15/30/60/120 с), слова (10/25/50/100), цитаты, свой
  текст и дзен; русский, украинский, английский, немецкий, французский, испанский и код
  JS/Python; 200/1000/5000 самых частых слов (wordfreq 3.1.1, CC BY-SA 4.0, отобраны
  словарями Hunspell, без имён и грубых слов); знаки, цифры, заглавные, «без Backspace»,
  «стоп на ошибке»; WPM/CPM, сырая скорость, точность, ровность, график по секундам,
  ошибки по клавишам на раскладке языка теста, рекорды по режимам и история (приставка
  хранилища `typing:`), подсказка про раскладку, пять тем Paint, интерфейс RU/EN, размер
  шрифта. Своя программа на Electron (`web/writing-speed/electron`: установщик NSIS и
  portable, помнит окно, версия в заголовке) открывает ту же страницу. 40 законов,
  20 мутантов (`tests/web/writing-speed*`), законы программы - в
  `tests-app/unit/writing-speed.test.js` и `tests-app/writing-speed-app.spec.js`.
- Новый раздел «Программы» в приложении и на браузерной странице, под играми: «Скорость
  печати» открывается во вкладке, как игра (кнопка «Открыть»), со своим сеансом; в сборку
  приложения попадает только её `index.html`.
- Horizon Drift 1.1.0. Исправлено «бесконечное нитро». Заезд каждый шаг физики добавлял к
  запасу нитро 0.012 в секунду (свободная езда - 0.02), а толчок включался целиком при любом
  запасе больше нуля: с зажатой кнопкой полоса стояла пустой, а машина разгонялась без конца.
  Теперь пустой баллон заперт, пока запас не вернётся к 10%, а остаток меньше расхода за шаг
  толкает только своей долей; запертая полоса тусклая. 3 закона в
  `tests/web/horizon_drift_nitro.spec.js`.
- Horizon Drift: повреждения машин и настройка «Настройки» → «Игра» → «Повреждения»: «Выкл»,
  «Только вид» (по умолчанию) и «Полные». Кузов мнётся в месте удара (вершины меша сдвигаются
  внутрь по направлению удара, сдвиг гаснет с расстоянием и ограничен; лёгкое касание следа не
  оставляет), зеркала, бамперы и капот отлетают от сильного удара и 12 секунд лежат на дороге
  (не больше 24 обломков). «Полные»: ещё шины стираются от торможения юзом, заносов и
  пробуксовки (стёртые держат до 30% хуже), удар в переднее колесо уводит руль, смятый перед
  отнимает мощность; на HUD - схема кузова и шин. В карьере и заездах на время всегда «Только
  вид». Ремонт: новый заезд, фестиваль или G в свободной езде. С повреждениями «Выкл» и «Только
  вид» физика бит в бит прежняя (закон сверяет хэш трёх заездов с записью, сделанной до кода
  повреждений). 13 законов в `tests/web/horizon_drift_damage.spec.js`, 33 мутанта в
  `tests/web/horizon_drift-mutate.js`.
- Новая игра в списке: «Летучая птичка» / Flappy Wings (`web/flappy-wings`), фан-игра в
  жанре «пролети между колоннами», не связана с правообладателями известных игр жанра.
  Карточка, картинка и описание в приложении и на браузерной странице; приставка
  хранилища `flappy:`; 24 закона и 10 мутантов в `tests/web/flappy-wings*`.
- Новое: браузерная «Игротека», `index.html` в корне: те же карточки и картинки, игры во
  вкладках страницы, раздел «Демо систем»; работает с диска и с GitHub Pages (добавлен
  `.nojekyll`). Пауза и возврат игре при уходе с её вкладки и при скрытии вкладки
  браузера, кнопка «на весь экран», громкость, тема, вкладки прошлого раза, очистка данных
  одной игры.
- Таблица игр перенесена в `web/_shared/games-data.js`, общую для приложения и страницы.
- Новое в приложении: раздел «Демо систем» (win11_3, macos-tahoe, ios26, oneui7) с теми же
  карточками, что на браузерной странице; демо открываются во вкладках со своим сеансом
  `persist:`, им можно в свою папку, `web/_os-shared` и папки игр, предзагрузка - в каждой
  рамке (громкость; в проверках подмена захвата мыши), уход с вкладки и возврат передаются
  рамкам игр как `{mix: 'pause'|'resume'}`.
- Исправлено: приложение брало имя игры из `<title>` и показывало «Операция» вместо
  «Операция: Периметр»; теперь сначала `<meta name="application-name">`.

## 1.0.0 - 2026-09-26

**EN**

- New: Igroteka, an Electron desktop app with ten games from `web/` in tabs of one
  window: Cube World, Cube Parkour, 3D Shooting Range, Dino Run, Hop-Skip, Horizon Drift,
  Fire Jungle, Space Shooter, Blocks, Sudoku.
- Each game has its own storage (`persist:<game>` session): records and saves do not mix
  and survive a restart; one game's data can be cleared in the settings.
- Background tabs are detached from the window (paused, no animation frames) and muted.
- Game pages have no Node and no bridges, no network and no access to files outside
  their folder; external links open in the system browser only after a question.
- Keys: Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+1..9, F11, F5 / Ctrl+R / Ctrl+F5 and a
  tab menu to restart; a game can keep F-keys for itself (Cube World: F1-F3, F5).
- The window remembers its size, position, maximised state and open tabs.
- Settings: reopen tabs, mute background tabs, volume and mute, dark and light theme,
  clearing one game's data, About.
- Own icon drawn by code (`app/assets/logo.svg` -> `icon.ico` 16-256 px).
- Windows builds: NSIS installer (per-user, Russian) and portable.
- Tests: 35 unit laws, 60 checks of the real app; CI on Gitea and GitHub.

**RU**

- Новое: «Игротека», приложение на Electron: десять игр из `web/` во вкладках одного окна.
- У каждой игры своё хранилище (сеанс `persist:<игра>`): рекорды и сохранения не
  смешиваются и живут после перезапуска; данные одной игры можно стереть в настройках.
- Фоновая вкладка снимается с окна (пауза, кадры не идут) и молчит.
- У страниц игр нет Node и мостов, нет сети и доступа к файлам вне своей папки; ссылки
  наружу открываются в системном браузере только после вопроса.
- Клавиши: Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+1..9, F11, F5 / Ctrl+R / Ctrl+F5 и
  меню вкладки для перезапуска; игра может забрать F-клавиши себе («Кубический мир»: F1-F3, F5).
- Окно помнит размер, место, развёрнутость и открытые вкладки.
- Настройки: открывать вкладки прошлого раза, глушить фоновые вкладки, громкость и «без
  звука», тёмная и светлая тема, очистка данных одной игры, «О программе».
- Свой значок, нарисованный кодом (`app/assets/logo.svg` -> `icon.ico` 16-256 px).
- Сборки для Windows: установщик NSIS (для одного пользователя, на русском) и portable.
- Проверки: 35 законов модулей, 60 проверок настоящего приложения; CI на Gitea и GitHub.

## 0.1.0

- Pages in `web/` and programs in `py/` fixed up and covered by tests (see `docs/audit/`).
- Страницы `web/` и программы `py/` приведены в порядок и закрыты проверками (см. `docs/audit/`).
