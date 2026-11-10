# Пример: импорт банковских выписок

Пример на общей модели «модуль импорта банковских выписок»: агент читает выписки, загружает новую и удаляет
ненужную. **Это пример на заглушках**: хранилище (`lib/Storage.php`) и права (`lib/Access.php`) — выдуманный код в
памяти процесса, данные придуманы. Кода настоящего модуля клиент-банка здесь нет; перенесите в свой модуль образец
манифеста и методов, а на месте заглушек поставьте свои таблицы и проверку прав.

Вендор — `demobank`, манифест — `demobank.mcp.tools`, область — `demobank_statements`.

## Инструменты

| инструмент | `kind` | метод | кому виден |
|---|---|---|---|
| `bank_statement_list` | `read` | `demobank.statement.list` | всем с правом чтения |
| `bank_statement_get` | `read` | `demobank.statement.get` | всем с правом чтения |
| `bank_statement_import` | `write` | `demobank.statement.import` | тем, кому открыта запись |
| `bank_statement_delete` | `delete` | `demobank.statement.delete`, `confirmRead` → `demobank.statement.get` | тем, кому открыта запись |

На что смотреть в коде (`lib/Rest.php`):

- манифест зависит от сотрудника: без права чтения он пуст, без права записи в нём нет `write` и `delete`
  (сотрудники заглушки: 1 — всё, 2 — только чтение, 3 — ничего);
- каждый метод проверяет право сам, а не полагается на манифест;
- номер счёта в ответах замаскирован;
- у удаления есть `confirmRead`: сервер перечитает выписку методом `get`, покажет сотруднику и сверит после «да»;
- ошибки: 400 с текстом «что исправить», 403 без деталей, 404 `Not found`;
- список — страницами: `limit` до 50, `next`, `total`.

## Запуск

Из корня репозитория:

```bash
php examples/client-bank/bin/dump-manifest.php 1 | node tools/manifest-check.mjs - demobank.mcp.tools
php examples/client-bank/bin/dump-manifest.php 2          # манифест сотрудника только с чтением
php examples/client-bank/bin/scenario.php                  # список, загрузка, чтение, удаление, отказы
node --test examples/client-bank/test/manifest.test.mjs
```
