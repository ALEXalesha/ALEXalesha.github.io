# Медиаплеер / MediaPlayer - ход работы

Код: `web/media-player/index.html` (одна страница), оболочка `web/media-player/electron/`.
Законы: `tests/web/media-player.spec.js` (36 штук, `npx playwright test tests/web/media-player.spec.js --workers=1`, около 1,5 мин).

## Сделано

- Страница: 12 своих мелодий (генератор песен + синтез Web Audio, обложки), свои файлы (кнопка и перетаскивание, wav/mp3/webm, видео вместо визуализации), плейлист (порядок, перетаскивание, Alt+стрелки), перемешивание, повтор, скорость, громкость, эквалайзер 10 полос с пресетами и предусилителем, визуализация 3 вида, мини-режим, Media Session, горячие клавиши, память настроек и позиции, 5 тем как в Paint, RU/EN.
- Генератор мелодий (11.10): не больше двух одинаковых нот подряд (`breakRuns` в `generate`). Причина повторов - отражение у краёв диапазона (`keep`), притяжение к аккорду и шаг 0. Было: garage - 10 одинаковых нот подряд, pixel - 21 серия из 3+. Закон: серия не длиннее 3, доля повторов соседних нот не больше 0,25.
- Electron (11.10): `main.js`, `window-state.js` (копия из WritingSpeed), `package.json` 1.0.0, значок `icon.svg` -> `icon.ico/png` (`node web/media-player/electron/make-icon.js`). Сборку ещё не делали.
- Мутации (11.10): `node tests/web/media-player-mutate.js` - 11 из 11 убиты (около 4 мин). Закон «испорченные записи» теперь проверяет и тему.

## Осталось (по порядку)

1. `tests-app/media-player-app.spec.js` - закон оболочки (по образцу `writing-speed-app.spec.js`, MP_TEST=1, окно скрыто). `npm i` и `npx electron-builder` в `web/media-player/electron`.
2. Карточка в Хабе, раздел «Программы» (как Скорость печати и Компилятор).
3. Репозиторий MediaPlayer на Gitea и GitHub (publish-скрипт), Pages, выпуск 1.0.0, InstallAll, профиль.
