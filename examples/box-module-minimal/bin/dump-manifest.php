<?php
// Печатает ответ метода-манифеста в JSON. Запуск: php bin/dump-manifest.php
// Подключаются заглушки ядра и код модуля; портал не нужен.
require __DIR__ . '/../../../tools/bitrix-stubs.php';
require __DIR__ . '/../lib/Storage.php';
require __DIR__ . '/../lib/Rest.php';

$description = \Demo\Notes\Rest::onRestServiceBuildDescription();
$callback = $description['demo_notes'][\Demo\Notes\Rest::MANIFEST]['callback'];
$tools = $callback([], null, new CRestServer());
echo json_encode($tools, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), "\n";
