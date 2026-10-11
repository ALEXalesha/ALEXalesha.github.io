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
  собранная программа проверена скрыто на временной папке.
- Gitea: репозиторий уже переименован `Files` -> `FilesManager` (пустой), описание было битым (знаки вопроса) - исправлено в UTF-8.

## Не сделано (точка продолжения)
1. Наполнить репозиторий FilesManager (как у WritingSpeed/MediaPlayer: страница, electron/, README RU/EN, CHANGELOG, LICENSE, CI).
2. Выпуск 1.0.0 на Gitea (Setup + Portable), потом GitHub через publish-скрипт и Pages.
3. InstallAll: строка FilesManager; поставить у себя.
4. Профиль (README профиля), каталог проектов.
5. Больше законов: горячие клавиши, вкладки/две панели в Electron, мутации.

## Грабли
- `tests-app/programs.spec.js` «compiler» падал и до этих правок (`__compiler is not defined`) - не наш.
- `sed -i` в Git Bash по этому файлу молча ничего не менял, а сам файл уменьшился на 2,5 КБ (похоже, срезал CR) - правки только через node.
