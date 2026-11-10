<?php
// Регистрация обработчика при установке модуля (фрагмент install/index.php, DoInstall).
// Запуск отдельно не нужен: показан как образец.

\Bitrix\Main\EventManager::getInstance()->registerEventHandler(
    'rest',
    'OnRestServiceBuildDescription',
    'demo.notes',                          // id вашего модуля
    \Demo\Notes\Rest::class,
    'onRestServiceBuildDescription'
);
// При удалении модуля — unRegisterEventHandler с теми же параметрами.
