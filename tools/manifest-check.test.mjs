// node --test tools — проверка самой проверки: плохие манифесты отклоняются по правилам сервера.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseManifest, pickArgs, isForbiddenArg } from './manifest-check.mjs'

const M = 'demo.mcp.tools'
const ok = { name: 'notes_search', description: 'Ищет заметки по словам и возвращает id и заголовок.', method: 'demo.notes.search', input: { type: 'object', properties: { query: { type: 'string' } } } }
const run = (patch, drop = []) => {
  const t = { ...ok, ...patch }
  for (const k of drop) delete t[k]
  return parseManifest([t], M)
}

test('хороший инструмент принят, kind по умолчанию read', () => {
  const r = run({})
  assert.deepEqual(r.errors, [])
  assert.equal(r.tools[0].kind, 'read')
})

test('принимается и {tools: [...]}', () => {
  assert.equal(parseManifest({ tools: [ok] }, M).tools.length, 1)
})

test('описание короче 20 знаков', () => assert.equal(run({ description: 'Ищет.' }).tools.length, 0))
test('чужой вендор метода', () => assert.equal(run({ method: 'crm.deal.delete' }).tools.length, 0))
test('метод — сам манифест', () => assert.equal(run({ method: M }).tools.length, 0))
test('имя встроенного инструмента', () => assert.equal(run({ name: 'task_list' }).tools.length, 0))
test('плохое имя', () => assert.equal(run({ name: 'Notes-Search' }).tools.length, 0))
test('плохой kind', () => assert.equal(run({ kind: 'admin' }).tools.length, 0))
test('$ref в схеме', () => assert.equal(run({ input: { type: 'object', properties: { a: { $ref: '#/x' } } } }).tools.length, 0))
test('схема не объект', () => assert.equal(run({ input: { type: 'array' } }).tools.length, 0))

test('запрещённые параметры на любой глубине и в любом написании', () => {
  for (const bad of ['auth', 'member_id', 'member-id', 'Portal', 'domain', 'token', 'asUser', 'runAs', 'onBehalfOf', 'impersonate']) {
    assert.equal(isForbiddenArg(bad), true, bad)
    const input = { type: 'object', properties: { filter: { type: 'object', properties: { [bad]: { type: 'string' } } } } }
    assert.equal(run({ input }).tools.length, 0, bad)
  }
})

test('«о ком» — принято с предупреждением', () => {
  const r = run({ input: { type: 'object', properties: { userId: { type: 'integer' } } } })
  assert.equal(r.tools.length, 1)
  assert.equal(r.warnings.length, 1)
})

test('confirmRead: только у delete, метод того же вендора, idArg есть в схеме', () => {
  const del = { kind: 'delete', input: { type: 'object', properties: { id: { type: 'integer' } } } }
  assert.equal(run({ ...del, confirmRead: { method: 'demo.notes.get', idArg: 'id' } }).tools.length, 1)
  assert.equal(run({ ...del, confirmRead: { method: 'crm.item.get', idArg: 'id' } }).tools.length, 0)
  assert.equal(run({ ...del, confirmRead: { method: 'demo.notes.get', idArg: 'noteId' } }).tools.length, 0)
  assert.equal(run({ kind: 'write', confirmRead: { method: 'demo.notes.get', idArg: 'query' } }).tools.length, 0)
})

test('повтор имени пропускается, остальные работают', () => {
  const r = parseManifest([ok, ok, { ...ok, name: 'notes_other' }], M)
  assert.equal(r.tools.length, 2)
  assert.equal(r.errors.length, 1)
})

test('pickArgs оставляет только ключи схемы', () => {
  const input = { type: 'object', properties: { query: {}, auth: {}, _x: {} } }
  assert.deepEqual(pickArgs(input, { query: 1, auth: 2, _x: 3, other: 4 }), { query: 1 })
})
