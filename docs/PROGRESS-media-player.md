# Медиаплеер / MediaPlayer - ход работы

Код: `web/media-player/index.html` (одна страница), оболочка `web/media-player/electron/`.
Законы: `tests/web/media-player.spec.js` (38 штук, `npx playwright test tests/web/media-player.spec.js --workers=1`, около 1,5 мин).

## Сделано

- Страница: 12 своих мелодий (генератор песен + синтез Web Audio, обложки), свои файлы (кнопка и перетаскивание, wav/mp3/webm, видео вместо визуализации), плейлист (порядок, перетаскивание, Alt+стрелки), перемешивание, повтор, скорость, громкость, эквалайзер 10 полос с пресетами и предусилителем, визуализация 3 вида, мини-режим, Media Session, горячие клавиши, память настроек и позиции, 5 тем как в Paint, RU/EN.
- Генератор мелодий (11.10): не больше двух одинаковых нот подряд (`breakRuns` в `generate`). Причина повторов - отражение у краёв диапазона (`keep`), притяжение к аккорду и шаг 0. Было: garage - 10 одинаковых нот подряд, pixel - 21 серия из 3+. Закон: серия не длиннее 3, доля повторов соседних нот не больше 0,25.
- Electron (11.10): `main.js`, `window-state.js` (копия из WritingSpeed), `package.json` 1.0.0, значок `icon.svg` -> `icon.ico/png` (`node web/media-player/electron/make-icon.js`). Сборку ещё не делали.
- Мутации (11.10): `node tests/web/media-player-mutate.js` - 11 из 11 убиты (около 4 мин). Закон «испорченные записи» теперь проверяет и тему.

- Законы оболочки (11.10): `npx playwright test --config=playwright.app.config.js tests-app/media-player-app.spec.js` - 2 зелёных; в MP_TEST окно скрыто, без фокуса и без звука (`setAudioMuted`).
- Хаб (11.10): карточка в «Программах» (`PROGRAMS` в web/_shared/games-data.js, картинка `npm run thumbs -- media-player`), закон во вкладке (tests-app/programs.spec.js, плеер сначала «без звука»), в сборке Хаба `web/media-player/index.html`, команды `npm run mp:*`, README и CHANGELOG.

- Сборка (11.10): `npm run mp:dist` - `web/media-player/electron/dist/MediaPlayer-1.0.0-Setup.exe` и `-Portable.exe` (по 98 МБ, в worktree wip/media-player, в git не идут). Собранный exe проверен скрыто: окно «Медиаплеер / MediaPlayer 1.0.0», мелодия играет, звук выключен. У Алексея ещё не установлен.

- Выпуск 1.0.0 (11.10): publish-web 9c88efa (publish/MediaPlayer: config.sh, overlay README EN/RU, кадры tools/screenshots.js), GitHub ALEXalesha/MediaPlayer main 34d2ba0 (заглушку «Initial commit» от 10.10 заменил; publish_web.sh упал на push HTTP 408 - допушил тот же pub/MediaPlayer с http.postBuffer), Pages https://alexalesha.github.io/MediaPlayer/, выпуск v1.0.0 (Setup+Portable, заметки electron/release-notes/v1.0.0.md). Законы в собранном репо: 38 зелёных. InstallAll 8d53757 (25 программ, 168 проверок), установлен у Алексея («MediaPlayer 1.0.0» в реестре), профиль ALEXalesha 057d350.

- 1.0.1 (11.10): полоса прокрутки плейлиста заходила на кнопку «играть» строк. Причина: полоса поверх содержимого (overlay - Chrome в Windows 11, macOS) места не занимает, рисуется над правыми 14 px списка, а кнопка стояла в 7 px от края - перекрытие 7 px; классическая полоса (Electron здесь, 15 px) оставляла зазор 7 px. Исправление: замер вида полосы (`overlayScrollbars`), класс `overlay-sb` на <html> и отступ списка справа 14 px. Закон в двух запусках Chromium (классическая и `--enable-features=OverlayScrollbar,FluentOverlayScrollbar`, ширина overlay-полосы меряется по кадрам), 12 размеров окна x 5 тем, зазор >= 4 px; мутантов 14 из 14. FilesManager и WritingSpeed в начальном виде таких мест не имеют. Выпуск 1.0.1: сборка Setup+Portable (dist), установлен у Алексея, 1.0.0 в Корзине; publish-web 2b2afbf, GitHub MediaPlayer 534988f, выпуск v1.0.1, Pages 1.0.1; InstallAll 44343f2.
- 1.0.2 (12.10): перенос исправления WritingSpeed 1.1.1 - при наведении на кнопку стеклянная панель (шапка, плеер) могла светлеть полосой на половину высоты во всю ширину. Причина: backdrop-filter у .glass, на видеокарте Chromium пересчитывал размытие подложки в полосе панели вокруг кнопки и захватывал саму панель; headless это не показывает. Исправление: у .glass нет backdrop-filter, ::before - копия фона темы (background-attachment: fixed, filter: saturate(--glass-sat)), ::after - тон и рамка стекла; всплывающие .panel непрозрачные - без подложки; в узком окне .side position: relative; top: auto (было static). Кадры старый/новый во всех 5 темах: средняя разница 0,2-1,5 уровня. Законы «наведение на кнопки»: нет backdrop-filter у элементов с кнопками (и ::before/::after) во всех темах - красный на 1.0.1; наведение на кнопку шапки или плеера меняет только кнопку (маска на холсте и на «играть» - она перерисовывается каждые 100 мс). Мутантов 3 новых.

## Осталось

- GameRoom на GitHub (Хаб с карточкой Медиаплеера) не перевыложен: publish_web.sh GameRoom идёт больше 1,5 ч.
- CI Gitea на этих пушах не дожидался (один раннер, очередь других агентов).
