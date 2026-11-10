// node --test examples/client-bank
// Манифест из PHP-кода (заглушки) проверяется правилами сервера; сценарий проверяет права и ошибки.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseManifest, pickArgs } from '../../../tools/manifest-check.mjs'

const dir = fileURLToPath(new URL('..', import.meta.url))
const php = (script, ...args) => execFileSync(process.env.PHP_BIN || 'php', [`${dir}bin/${script}`, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const parse = userId => parseManifest(JSON.parse(php('dump-manifest.php', String(userId))), 'demobank.mcp.tools')

test('сотрудник с записью: четыре инструмента, манифест принят целиком', () => {
  const { tools, errors, warnings } = parse(1)
  assert.deepEqual(errors, [])
  assert.deepEqual(warnings, [])
  assert.deepEqual(tools.map(t => `${t.name}:${t.kind}`), [
    'bank_statement_list:read', 'bank_statement_get:read', 'bank_statement_import:write', 'bank_statement_delete:delete',
  ])
})

test('удаление названо с confirmRead на метод чтения того же вендора', () => {
  const del = parse(1).tools.find(t => t.kind === 'delete')
  assert.deepEqual(del.confirmRead, { method: 'demobank.statement.get', idArg: 'id' })
})

test('сотрудник только с чтением не видит запись и удаление; без права — пустой манифест', () => {
  assert.deepEqual(parse(2).tools.map(t => t.kind), ['read', 'read'])
  const none = parse(3)
  assert.deepEqual(none.tools, [])
  assert.equal(none.errors.length, 0)
})

test('служебные ключи методу не уходят', () => {
  const list = parse(1).tools[0]
  assert.deepEqual(pickArgs(list.input, { account: 'BY', auth: 'x', domain: 'y', userId: 5, start: 0 }), { account: 'BY', start: 0 })
})

test('сценарий: загрузка, чтение, удаление и отказы', () => {
  const { steps, errors } = JSON.parse(php('scenario.php'))
  assert.equal(steps.list.total, 2)
  assert.equal(steps.import.accepted, 2)
  assert.equal(steps.get.operations, 2)
  assert.equal(steps.get.total, '454.90')
  assert.match(steps.get.account, /…/)          // номер счёта в ответе замаскирован
  assert.equal(steps.delete.deleted, true)
  assert.deepEqual(errors, {
    'чужое чтение без права': '403 ACCESS_DENIED',
    'запись без права': '403 ACCESS_DENIED',
    'удаление без права': '403 ACCESS_DENIED',
    'не найдено': '404 NOT_FOUND',
    'плохая строка': '400 INVALID_ARG_VALUE',
  })
})
