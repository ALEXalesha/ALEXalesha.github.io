# Файловый менеджер / FilesManager - ход работы

Код: `web/files-manager/index.html` (одна страница, около 245 КБ), оболочка `web/files-manager/electron/`
(`main.js` - диск через IPC, `preload.js` - мост `window.fmNative`, `window-state.js`, значок `icon.svg` -> `icon.ico/png`).
Ветка `files-manager` в worktree `Programms/wip/files-manager`, всё сделанное уже в `main` GameRoom (Gitea).

## Сделано (11.10)
- Страница: дерево, плитки/список/таблица, вкладки, две панели, поиск по маске, просмотр (картинки, текст, код, аудио, видео, PDF),
  горячие клавиши Проводника, пять тем, RU/EN. В браузере - File System Access API или демо-диск в IndexedDB.
- Починено: `</script>` в строке примера index.html закрывал тег скрипта - страница не запускалась вовсе (теперь `<\/script>`).
- Electron: все операции в главном процессе; удаление только `shell.trashItem`; перенос между дисками = копия + исходник в Корзину;
  безвозвратного удаления в мосте нет (это проверяет закон). Ошибки через contextBridge - простым объектом `{code, message}`
  (Error теряет `code`).
- Законы: `tests/web/files-manager.spec.js` (2, демо-диск), `tests-app/files-manager-app.spec.js` (1, настоящая программа на временной папке,
  окно скрыто, FM_TEST=1 + FM_START=папка). Все зелёные.
- Хаб: карточка в «Программы» (`web/_shared/games-data.js`), картинка `app/assets/thumbs/files-manager.jpg`, страница в сборке Хаба.
- Сборка: `npm run fm:dist` -> `web/files-manager/electron/dist/FilesManager-1.0.0-Setup.exe` и `-Portable.exe` (около 100 МБ, 37 с),
  собранная программа проверена скрыто на временной папке и установлена у Алексея (Setup /S).
- Gitea: репозиторий уже переименован `Files` -> `FilesManager` (пустой), описание было битым (знаки вопроса) - исправлено в UTF-8.

## Выпуск 1.0.0 (11.10, вечер)
- publish-web f0c5658 (publish/FilesManager: config.sh, overlay - README EN/RU, CHANGELOG, package.json, законы страницы и программы,
  .gitea/workflows/ci.yml runs-on: windows - только законы страницы, ELECTRON_SKIP_BINARY_DOWNLOAD; tools/screenshots.js, 4 кадра).
- GitHub ALEXalesha/FilesManager main 4f47aed (заглушка «Initial commit» заменена), описание, темы, Pages
  https://alexalesha.github.io/FilesManager/ (200), выпуск v1.0.0 (Setup + Portable). Зеркало с GitHub проверено: личного нет.
- Gitea ALEXaloysha/FilesManager: тот же опубликованный main + выпуск v1.0.0 (id 67, Setup + Portable).
- Законы страницы на выделенной копии: 2/2 зелёные. InstallAll 988cba0 (169 проверок), профиль fe5ac42, каталог проектов (mem e180fa1),
  строка в README GameRoom (EN/RU).

## Не сделано (точка продолжения)
1. CI Gitea FilesManager на первом пуше не дожидался - посмотреть итог.
2. Больше законов: горячие клавиши (F2, Ctrl+C/V, Alt+стрелки, Ctrl+Shift+N), вкладки и две панели в Electron, мутации
   (как writing-speed-mutate.js), потом sync_tests.sh FilesManager и перевыкладка publish_web.sh FilesManager.
3. Выпуск следующей версии: VERSION в index.html и electron/package.json, CHANGELOG в overlay, npm run fm:dist, Gitea+GitHub.

## Грабли
- `tests-app/programs.spec.js` «compiler» падал и до этих правок (`__compiler is not defined`) - не наш.
- `sed -i` в Git Bash по этому файлу молча ничего не менял, а сам файл уменьшился на 2,5 КБ (похоже, срезал CR) - правки только через node.
