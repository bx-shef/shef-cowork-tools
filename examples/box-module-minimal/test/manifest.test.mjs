// node --test examples/box-module-minimal
// Получает манифест из PHP-кода модуля (на заглушках ядра) и проверяет его правилами сервера.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseManifest, pickArgs } from '../../../tools/manifest-check.mjs'

const dir = fileURLToPath(new URL('..', import.meta.url))
const php = (script, ...args) => execFileSync(process.env.PHP_BIN || 'php', [`${dir}bin/${script}`, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const manifest = JSON.parse(php('dump-manifest.php'))
const { tools, errors, warnings } = parseManifest(manifest, 'demo.mcp.tools')

test('манифест принят целиком', () => {
  assert.deepEqual(errors, [])
  assert.deepEqual(warnings, [])
  assert.equal(tools.length, 1)
  assert.equal(tools[0].name, 'notes_search')
  assert.equal(tools[0].kind, 'read')
})

test('служебные ключи методу не уходят', () => {
  const sent = pickArgs(tools[0].input, { query: 'релиз', limit: 5, auth: 'x', member_id: 'y', filter: { a: 1 }, _hidden: 1 })
  assert.deepEqual(sent, { query: 'релиз', limit: 5 })
})

test('метод отдаёт данные текущего сотрудника', () => {
  const res = JSON.parse(php('call.php', 'релиз'))
  assert.equal(res.total, 1)
  assert.equal(res.items[0].title, 'Планёрка')
})

test('пустой запрос — отказ 400 с понятным текстом', () => {
  assert.throws(() => php('call.php', ' '), /INVALID_ARG_VALUE|Нужен query/)
})
