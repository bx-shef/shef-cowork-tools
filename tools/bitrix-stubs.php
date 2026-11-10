<?php
// Заглушки классов Битрикс24, которые нужны примерам, чтобы запускать их без портала.
// Это НЕ ядро Битрикс24: только сигнатуры, которыми пользуются примеры (CurrentUser, RestException, CRestServer).

namespace Bitrix\Main\Engine {
    class CurrentUser
    {
        public static int $stubUserId = 1;

        public static function get(): self
        {
            return new self();
        }

        public function getId(): int
        {
            return self::$stubUserId;
        }
    }
}

namespace Bitrix\Rest {
    class RestException extends \Exception
    {
        public function __construct(string $message, public string $restCode = '', public int $status = 400)
        {
            parent::__construct($message);
        }
    }
}

namespace {
    class CRestServer
    {
        public const STATUS_WRONG_REQUEST = 400;
        public const STATUS_FORBIDDEN = 403;
        public const STATUS_NOT_FOUND = 404;
    }
}
