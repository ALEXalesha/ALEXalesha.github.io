# Медиаплеер / MediaPlayer - ход работы

Код: `web/media-player/index.html` (одна страница), оболочка `web/media-player/electron/`.
Законы: `tests/web/media-player.spec.js` (36 штук, `npx playwright test tests/web/media-player.spec.js --workers=1`, около 1,5 мин).

## Сделано

- Страница: 12 своих мелодий (генератор песен + синтез Web Audio, обложки), свои файлы (кнопка и перетаскивание, wav/mp3/webm, видео вместо визуализации), плейлист (порядок, перетаскивание, Alt+стрелки), перемешивание, повтор, скорость, громкость, эквалайзер 10 полос с пресетами и предусилителем, визуализация 3 вида, мини-режим, Media Session, горячие клавиши, память настроек и позиции, 5 тем как в Paint, RU/EN.
- Генератор мелодий (11.10): не больше двух одинаковых нот подряд (`breakRuns` в `generate`). Причина повторов - отражение у краёв диапазона (`keep`), притяжение к аккорду и шаг 0. Было: garage - 10 одинаковых нот подряд, pixel - 21 серия из 3+. Закон: серия не длиннее 3, доля повторов соседних нот не больше 0,25.
- Electron (11.10): `main.js`, `window-state.js` (копия из WritingSpeed), `package.json` 1.0.0, значок `icon.svg` -> `icon.ico/png` (`node web/media-player/electron/make-icon.js`). Сборку ещё не делали.
- Мутации (11.10): `node tests/web/media-player-mutate.js` - 11 из 11 убиты (около 4 мин). Закон «испорченные записи» теперь проверяет и тему.

- Законы оболочки (11.10): `npx playwright test --config=playwright.app.config.js tests-app/media-player-app.spec.js` - 2 зелёных; в MP_TEST окно скрыто, без фокуса и без звука (`setAudioMuted`).
- Хаб (11.10): карточка в «Программах» (`PROGRAMS` в web/_shared/games-data.js, картинка `npm run thumbs -- media-player`), закон во вкладке (tests-app/programs.spec.js, плеер сначала «без звука»), в сборке Хаба `web/media-player/index.html`, команды `npm run mp:*`, README и CHANGELOG.

- Сборка (11.10): `npm run mp:dist` - `web/media-player/electron/dist/MediaPlayer-1.0.0-Setup.exe` и `-Portable.exe` (по 98 МБ, в worktree wip/media-player, в git не идут). Собранный exe проверен скрыто: окно «Медиаплеер / MediaPlayer 1.0.0», мелодия играет, звук выключен. У Алексея ещё не установлен.

## Осталось (точка продолжения)

Выпуск 1.0.0 не начат (не хватило недельного лимита). Всё ниже - по образцу WritingSpeed (память writing-speed-project.md):
1. Ветка `publish-web` репо GameRoom: `publish/MediaPlayer/config.sh` (REPO=ALEXalesha/MediaPlayer, MAP `web/media-player/=`, TESTS: tests/web/media-player.spec.js, tests/web/media-player-mutate.js, tests-app/media-player-app.spec.js; TEST_SED как у WritingSpeed с заменой writing-speed -> media-player) и overlay: README.md/README.ru.md, package.json (electron, playwright), tests/pages.json, tools/screenshots.js, кадры docs/screens.
2. `publish/publish_web.sh MediaPlayer`, Pages (alexalesha.github.io/MediaPlayer/), `gh release create v1.0.0` с Setup и Portable. Gitea: отдельный репо MediaPlayer пустой, источник - GameRoom.
3. Строка в InstallAll, установить у себя (Setup /S через powershell.exe Start-Process), профиль GitHubProfile, проверка свежести GitHub.
4. GameRoom на GitHub с карточкой Медиаплеера не перевыложен (publish_web.sh GameRoom идёт больше 1,5 ч).
