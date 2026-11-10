<?php
// Сценарий на заглушках: список -> загрузка -> чтение -> удаление, затем отказы. Печатает JSON-шаги.
// Запуск: php bin/scenario.php
require __DIR__ . '/bootstrap.php';

use Bitrix\Rest\RestException;

$steps = [];
$steps['list'] = callMethod(1, 'demobank.statement.list', ['dateFrom' => '2026-11-01']);
$steps['import'] = callMethod(1, 'demobank.statement.import', [
    'account' => 'BY00DEMO0000000000000000003',
    'content' => "2026-11-04;500.00;BYN;ООО «Клиент»;Оплата 20\n2026-11-04;-45.10;BYN;Банк;Комиссия",
]);
$steps['get'] = callMethod(1, 'demobank.statement.get', ['id' => $steps['import']['id']]);
$steps['delete'] = callMethod(1, 'demobank.statement.delete', ['id' => $steps['import']['id']]);

$errors = [];
$try = function (string $label, callable $fn) use (&$errors): void {
    try {
        $fn();
        $errors[$label] = 'без ошибки';
    } catch (RestException $e) {
        $errors[$label] = $e->status . ' ' . $e->restCode;
    }
};
$try('чужое чтение без права', fn() => callMethod(3, 'demobank.statement.list'));
$try('запись без права', fn() => callMethod(2, 'demobank.statement.import', ['account' => 'BY00DEMO1', 'content' => 'x']));
$try('удаление без права', fn() => callMethod(2, 'demobank.statement.delete', ['id' => 1]));
$try('не найдено', fn() => callMethod(1, 'demobank.statement.get', ['id' => 999]));
$try('плохая строка', fn() => callMethod(1, 'demobank.statement.import', ['account' => 'BY00DEMO1', 'content' => 'мусор']));

echo json_encode(['steps' => $steps, 'errors' => $errors], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), "\n";
