<?php
// Вызывает метод инструмента на заглушках: php bin/call.php "релиз"
// Показывает, что метод читает данные только текущего сотрудника (заглушка: id 1).
require __DIR__ . '/../../../tools/bitrix-stubs.php';
require __DIR__ . '/../lib/Storage.php';
require __DIR__ . '/../lib/Rest.php';

$query = ['query' => $argv[1] ?? 'релиз'];
try {
    echo json_encode(\Demo\Notes\Rest::search($query, null, new CRestServer()), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), "\n";
} catch (\Bitrix\Rest\RestException $e) {
    fwrite(STDERR, $e->status . ' ' . $e->restCode . ': ' . $e->getMessage() . "\n");
    exit(1);
}
