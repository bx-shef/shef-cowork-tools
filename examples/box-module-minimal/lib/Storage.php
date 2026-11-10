<?php
// Заглушка хранилища: в настоящем модуле здесь ORM-таблица. Данные выдуманы для примера.

namespace Demo\Notes;

class Storage
{
    /** @return list<array{id:int,title:string,text:string,date:string}> */
    public static function notesFor(int $userId): array
    {
        $all = [
            1 => [['id' => 1, 'title' => 'Планёрка', 'text' => 'Обсудили сроки релиза', 'date' => '2026-11-03']],
            2 => [['id' => 2, 'title' => 'Идеи', 'text' => 'Релиз раз в неделю', 'date' => '2026-11-05']],
        ];
        return $all[$userId] ?? [];
    }
}
