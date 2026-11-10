<?php
// Печатает ответ метода-манифеста для сотрудника: php bin/dump-manifest.php [id сотрудника, по умолчанию 1]
// Сотрудник 1 видит чтение, запись и удаление; 2 — только чтение; 3 — ничего.
require __DIR__ . '/bootstrap.php';

$userId = (int)($argv[1] ?? 1);
echo json_encode(callMethod($userId, \DemoBank\Rest::MANIFEST), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), "\n";
