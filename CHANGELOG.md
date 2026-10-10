# Changelog / Журнал изменений

## Unreleased

**EN**

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
  `tests-app/writing-speed.spec.js`.
- New section "Programs" in the app and the browser page, below the games: WritingSpeed
  opens in a tab like a game (button "Открыть"), with its own session; only its
  `index.html` goes into the app build.

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
  `tests-app/unit/writing-speed.test.js` и `tests-app/writing-speed.spec.js`.
- Новый раздел «Программы» в приложении и на браузерной странице, под играми: «Скорость
  печати» открывается во вкладке, как игра (кнопка «Открыть»), со своим сеансом; в сборку
  приложения попадает только её `index.html`.

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
