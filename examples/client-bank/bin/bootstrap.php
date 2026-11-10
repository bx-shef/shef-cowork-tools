<?php
// Общая загрузка для скриптов примера: заглушки ядра + код модуля.
require __DIR__ . '/../../../tools/bitrix-stubs.php';
require __DIR__ . '/../lib/Storage.php';
require __DIR__ . '/../lib/Access.php';
require __DIR__ . '/../lib/Rest.php';

\DemoBank\Storage::reset();

/** Вызвать зарегистрированный метод от имени сотрудника (заглушка CurrentUser). */
function callMethod(int $userId, string $method, array $query = []): array
{
    \Bitrix\Main\Engine\CurrentUser::$stubUserId = $userId;
    foreach (\DemoBank\Rest::onRestServiceBuildDescription() as $methods) {
        if (isset($methods[$method])) {
            return ($methods[$method]['callback'])($query, null, new CRestServer());
        }
    }
    throw new RuntimeException("Нет метода $method");
}
