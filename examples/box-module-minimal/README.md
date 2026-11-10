# Минимальный модуль: один инструмент чтения

Модуль `demo.notes` отдаёт агенту shef.cowork один инструмент `notes_search` — поиск по заметкам сотрудника.

| файл | что |
|---|---|
| `lib/Rest.php` | событие `OnRestServiceBuildDescription`, метод-манифест `demo.mcp.tools`, метод `demo.notes.search` |
| `lib/Storage.php` | заглушка хранилища (выдуманные данные) |
| `install.php` | как подписать обработчик при установке модуля |
| `bin/dump-manifest.php` | печатает ответ манифеста |
| `bin/call.php` | вызывает метод инструмента на заглушках |
| `test/manifest.test.mjs` | проверка манифеста правилами сервера |

## Запуск

Из корня репозитория:

```bash
php examples/box-module-minimal/bin/dump-manifest.php | node tools/manifest-check.mjs - demo.mcp.tools
php examples/box-module-minimal/bin/call.php "релиз"
node --test examples/box-module-minimal/test/manifest.test.mjs
```

Код ядра Битрикс24 (`CurrentUser`, `RestException`, `CRestServer`) заменён заглушками из
[tools/bitrix-stubs.php](../../tools/bitrix-stubs.php). Чтобы перенести пример в свой модуль, замените `Storage` на
свои таблицы, имена `demo` / `demo_notes` — на своего вендора и область, и пройдите [docs/enable.md](../../docs/enable.md).
