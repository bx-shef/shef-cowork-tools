<?php
// Минимальный модуль: один инструмент чтения «заметки по словам».
// В коробке файл лежит в lib/ модуля (например /local/modules/demo.notes/lib/rest.php).

namespace Demo\Notes;

use Bitrix\Main\Engine\CurrentUser;
use Bitrix\Rest\RestException;

class Rest
{
    /** Имя метода-манифеста: «demo» — вендор, методы инструментов обязаны начинаться с «demo.». */
    public const MANIFEST = 'demo.mcp.tools';

    /** Обработчик события rest -> OnRestServiceBuildDescription: методы и своя область прав. */
    public static function onRestServiceBuildDescription(): array
    {
        return [
            'demo_notes' => [                       // область прав: её нужно выдать приложению shef.cowork
                self::MANIFEST => ['callback' => [__CLASS__, 'tools'], 'options' => []],
                'demo.notes.search' => ['callback' => [__CLASS__, 'search'], 'options' => []],
            ],
        ];
    }

    /** Манифест: список инструментов. Вызывается токеном сотрудника, можно отдавать разный набор. */
    public static function tools(array $query, $nav, \CRestServer $server): array
    {
        return [[
            'name' => 'notes_search',
            'title' => 'Поиск по заметкам',
            'description' => 'Ищет заметки по словам в тексте. Возвращает id, заголовок и дату, не больше 50 записей.',
            'method' => 'demo.notes.search',
            'kind' => 'read',
            'input' => [
                'type' => 'object',
                'required' => ['query'],
                'properties' => [
                    'query' => ['type' => 'string', 'description' => 'Слова для поиска', 'minLength' => 2, 'maxLength' => 200],
                    'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 50],
                ],
            ],
        ]];
    }

    /** Метод инструмента. Сотрудник — только CurrentUser; своих параметров «кто я» нет. */
    public static function search(array $query, $nav, \CRestServer $server): array
    {
        $text = trim((string)($query['query'] ?? ''));
        if ($text === '') {
            throw new RestException('Нужен query: слова для поиска', 'INVALID_ARG_VALUE', \CRestServer::STATUS_WRONG_REQUEST);
        }
        $limit = min(50, max(1, (int)($query['limit'] ?? 20)));
        $userId = (int)CurrentUser::get()->getId();

        $items = [];
        foreach (Storage::notesFor($userId) as $note) {      // только доступное этому сотруднику
            if (mb_stripos($note['title'] . ' ' . $note['text'], $text) !== false) {
                $items[] = ['id' => $note['id'], 'title' => $note['title'], 'date' => $note['date']];
            }
        }
        $total = count($items);
        return ['items' => array_slice($items, 0, $limit), 'total' => $total, 'next' => $total > $limit ? $limit : null];
    }
}
