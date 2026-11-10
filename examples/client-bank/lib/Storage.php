<?php
// ЗАГЛУШКА. Это не код настоящего модуля импорта клиент-банка: внутренностей чужого модуля здесь нет.
// Хранилище выписок в памяти процесса с выдуманными данными, чтобы пример запускался без портала.
// В вашем модуле на месте Storage и Access стоят таблицы ORM и ваша проверка прав.

namespace DemoBank;

class Storage
{
    /** @var array<int, array{id:int,account:string,date:string,rows:list<array>}> */
    private static array $statements = [];
    private static int $seq = 0;

    public static function reset(): void
    {
        self::$statements = [];
        self::$seq = 0;
        self::add('BY00DEMO0000000000000000001', '2026-11-01', [
            ['amount' => '1200.00', 'currency' => 'BYN', 'counterparty' => 'ООО «Заказчик»', 'purpose' => 'Оплата по счёту 15'],
            ['amount' => '-300.50', 'currency' => 'BYN', 'counterparty' => 'ИП Поставщик', 'purpose' => 'Закупка материалов'],
        ]);
        self::add('BY00DEMO0000000000000000002', '2026-11-02', [
            ['amount' => '90.00', 'currency' => 'USD', 'counterparty' => 'Demo Ltd', 'purpose' => 'Invoice 7'],
        ]);
    }

    public static function add(string $account, string $date, array $rows): int
    {
        $id = ++self::$seq;
        self::$statements[$id] = ['id' => $id, 'account' => $account, 'date' => $date, 'rows' => $rows];
        return $id;
    }

    /** @return list<array> все выписки, отсортированные по id */
    public static function all(): array
    {
        return array_values(self::$statements);
    }

    public static function find(int $id): ?array
    {
        return self::$statements[$id] ?? null;
    }

    public static function delete(int $id): bool
    {
        $had = isset(self::$statements[$id]);
        unset(self::$statements[$id]);
        return $had;
    }
}
