<?php
// ЗАГЛУШКА проверки прав модуля. В настоящем модуле — ваши права (группы, роли, настройки).
// Здесь: сотрудник 1 может читать и менять выписки, сотрудник 2 — только читать, сотрудник 3 — ничего.

namespace DemoBank;

class Access
{
    public static function canRead(int $userId): bool
    {
        return in_array($userId, [1, 2], true);
    }

    public static function canWrite(int $userId): bool
    {
        return $userId === 1;
    }
}
