#!/usr/bin/env node
// Проверка манифеста инструментов по тем же правилам, что применяет сервер shef.cowork при разборе.
// Использование:  node tools/manifest-check.mjs <файл.json | -> <метод-манифест>
//                 php bin/dump-manifest.php | node tools/manifest-check.mjs - demo.mcp.tools
// Код выхода 0 — все инструменты приняты, 1 — есть отклонённые записи.
// Не проверяется одно: разбор схемы библиотекой JSON Schema на сервере — схему храните простой
// (type, properties, required, enum, minimum/maximum, minLength/maxLength, items, maxItems).
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const MAX_TOOLS = 50
export const MIN_DESCRIPTION = 20
export const MAX_SCHEMA = 8000
const MAX_DEPTH = 6

/** Параметры «кто я / какой портал / от имени»: их у инструмента быть не может. */
export const FORBIDDEN_ARGS = /^(auth|access_token|refresh_token|member_?id|portal|domain|client_endpoint|server_endpoint|application_token|session|token|as_?user(_?id)?|run_?as(_?user)?|act_?as|on_?behalf(_?of)?|impersonate|sudo)$/i
/** Параметры «о ком»: разрешены как фильтр, манифест принимается с предупреждением. */
export const WHO_ARGS = /^(user_?id|user|employee_?id|employee|staff_?id|person_?id|for_?user(_?id)?)$/i

/** Имена встроенных инструментов сервера: инструмент модуля их не перекрывает (список на момент выпуска). */
export const BUILTIN_TOOLS = new Set([
  'user_current', 'crm_activity_list', 'crm_item_get', 'crm_item_list', 'crm_fields', 'crm_stages', 'crm_find', 'task_get', 'task_list',
  'calendar_events', 'calendar_busy', 'task_checklist', 'task_elapsed', 'task_results', 'task_comments',
  'note_bases', 'note_tree', 'note_search', 'note_get', 'im_chats', 'worktime_status', 'disk_storages', 'disk_folder', 'disk_search',
  'catalog_list', 'catalog_products', 'catalog_product_get', 'crm_doc_templates', 'calls_stats',
  'crm_funnel', 'crm_aggregate', 'staff_birthdays', 'booking_list', 'crm_openlines', 'crm_product_rows', 'crm_my_company', 'booking_get',
  'booking_resources', 'booking_free_slots', 'booking_waitlist', 'file_read',
  'im_messages', 'im_unread', 'im_messages_search', 'task_counters', 'task_reminders', 'crm_comments', 'bizproc_tasks', 'departments',
  'staff_search', 'crm_documents', 'worktime_report',
  'crm_import', 'bizproc_task_complete', 'crm_item_add', 'crm_item_update', 'crm_item_delete', 'crm_comment_add', 'crm_activity_add',
  'crm_activity_done', 'task_create', 'task_update', 'task_status', 'task_delete', 'task_checklist_add', 'task_checklist_done',
  'task_checklist_delete', 'task_reminder_add', 'task_reminder_delete', 'task_comment_add', 'task_result_add', 'task_time_add',
  'calendar_event_add', 'calendar_event_update', 'calendar_event_delete', 'note_add', 'note_update', 'im_message_send', 'im_chat_user_add',
  'worktime_action', 'disk_folder_add', 'disk_move', 'disk_file_trash', 'disk_doc_build', 'catalog_product_update', 'catalog_price_set',
  'crm_doc_create', 'crm_file_attach', 'booking_add', 'booking_cancel',
])

// Невидимые, управляющие и bidi-символы: ими прячут текст от человека, а модель его читает.
// Оставлены табуляция, переводы строк, ZWNJ/ZWJ (U+200C/U+200D) и VS16 (U+FE0F).
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0E\uFEFF\uFFA0\uFFF9-\uFFFC\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu

export function dropInvisible(s) {
  return s.replace(INVISIBLE, '').replace(/[\u2028\u2029]/g, '\n')
}

export function cleanText(s, max, oneLine = false) {
  let t = dropInvisible(s).replace(/\r/g, '')
  if (oneLine) t = t.replace(/\s+/g, ' ')
  return Array.from(t.trim()).slice(0, max).join('')
}

export function isForbiddenArg(name) {
  const n = dropInvisible(name).normalize('NFKC').trim().replace(/^\^|\$$/g, '').replace(/[-.\s]+/g, '_')
  return FORBIDDEN_ARGS.test(n) || FORBIDDEN_ARGS.test(n.replace(/_/g, ''))
}

/** Запрещённые имена параметров на любой глубине схемы. */
export function forbiddenKeys(schema, depth = 0, out = []) {
  if (depth > MAX_DEPTH * 2 || !schema || typeof schema !== 'object') return out
  if (Array.isArray(schema)) { for (const x of schema) forbiddenKeys(x, depth + 1, out); return out }
  for (const key of ['properties', 'patternProperties', 'dependentSchemas', 'dependentRequired']) {
    const props = schema[key]
    if (props && typeof props === 'object' && !Array.isArray(props)) {
      for (const [k, v] of Object.entries(props)) {
        if (isForbiddenArg(k)) out.push(k)
        forbiddenKeys(v, depth + 1, out)
      }
    }
  }
  if (Array.isArray(schema.required)) for (const k of schema.required) if (typeof k === 'string' && isForbiddenArg(k)) out.push(k)
  for (const [k, v] of Object.entries(schema)) {
    if (['properties', 'patternProperties', 'dependentSchemas', 'dependentRequired', 'required', 'enum', 'const', 'default', 'examples'].includes(k)) continue
    if (v && typeof v === 'object') forbiddenKeys(v, depth + 1, out)
  }
  return [...new Set(out)]
}

/** Параметры «о ком» на любой глубине. */
export function whoKeys(schema, depth = 0, out = []) {
  if (depth > MAX_DEPTH * 2 || !schema || typeof schema !== 'object') return out
  if (Array.isArray(schema)) { for (const x of schema) whoKeys(x, depth + 1, out); return out }
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'properties' && v && typeof v === 'object') {
      for (const name of Object.keys(v)) if (WHO_ARGS.test(dropInvisible(name).replace(/[-.\s]+/g, '_'))) out.push(name)
    }
    if (v && typeof v === 'object') whoKeys(v, depth + 1, out)
  }
  return [...new Set(out)]
}

function plainSchema(v, depth = 0) {
  if (depth > MAX_DEPTH * 2) return false
  if (Array.isArray(v)) return v.every(x => plainSchema(x, depth + 1))
  if (!v || typeof v !== 'object') return true
  for (const [k, x] of Object.entries(v)) {
    if (['$ref', '$defs', 'definitions', '$id', '$anchor', '$dynamicRef', '$recursiveRef'].includes(k)) return false
    if (!plainSchema(x, depth + 1)) return false
  }
  return true
}

/** «demo.mcp.tools» -> «demo.» */
export function vendorPrefix(manifestMethod) {
  return `${manifestMethod.split('.')[0]}.`
}

/** Разбор ответа манифеста: { tools, errors, warnings }. Плохая запись пропускается, остальные работают. */
export function parseManifest(raw, manifestMethod, reserved = BUILTIN_TOOLS) {
  const warnings = []
  const tools = []
  const errors = []
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && Array.isArray(raw.tools) ? raw.tools : null)
  if (!list) return { tools, errors: ['манифест — не массив и не {tools: [...]}'], warnings }
  const prefix = vendorPrefix(manifestMethod)
  const seen = new Set()
  for (const [i, t] of list.entries()) {
    const at = `#${i}`
    if (tools.length >= MAX_TOOLS) { errors.push(`больше ${MAX_TOOLS} инструментов — лишние пропущены`); break }
    if (!t || typeof t !== 'object') { errors.push(`${at}: не объект`); continue }
    const name = String(t.name ?? '')
    if (!/^[a-z][a-z0-9_]{1,47}$/.test(name)) { errors.push(`${at}: имя "${name.slice(0, 50)}" — латиница, цифры, _ (2–48)`); continue }
    if (reserved.has(name) || seen.has(name)) { errors.push(`${name}: имя уже занято`); continue }
    const method = String(t.method ?? '')
    if (!/^[a-z0-9_.]+$/i.test(method) || !method.toLowerCase().startsWith(prefix.toLowerCase()) || method === manifestMethod) {
      errors.push(`${name}: метод "${method.slice(0, 80)}" — только ${prefix}*`); continue
    }
    const kind = t.kind ?? 'read'
    if (!['read', 'write', 'delete'].includes(kind)) { errors.push(`${name}: kind — read, write или delete`); continue }
    const description = typeof t.description === 'string' ? cleanText(t.description, 1000) : ''
    if (description.length < MIN_DESCRIPTION) { errors.push(`${name}: нужно description от ${MIN_DESCRIPTION} знаков`); continue }
    const input = t.input ?? { type: 'object', properties: {} }
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.type !== 'object' || JSON.stringify(input).length > MAX_SCHEMA || !plainSchema(input)) {
      errors.push(`${name}: input — JSON Schema с type: object, до ${MAX_SCHEMA} символов, без $ref`); continue
    }
    const banned = forbiddenKeys(input)
    if (banned.length) { errors.push(`${name}: параметры ${banned.join(', ')} запрещены — кто вызывает и портал берутся из входа сотрудника`); continue }
    let confirmRead
    if (t.confirmRead !== undefined) {
      const cr = t.confirmRead
      const rm = String(cr?.method ?? '')
      const idArg = String(cr?.idArg ?? '')
      const props = input.properties ?? {}
      if (kind !== 'delete') { errors.push(`${name}: confirmRead — только у kind: delete`); continue }
      if (!/^[a-z0-9_.]+$/i.test(rm) || !rm.toLowerCase().startsWith(prefix.toLowerCase()) || rm === manifestMethod) {
        errors.push(`${name}: confirmRead.method "${rm.slice(0, 80)}" — только ${prefix}*`); continue
      }
      if (!Object.hasOwn(props, idArg)) { errors.push(`${name}: confirmRead.idArg "${idArg.slice(0, 50)}" — нет такого параметра в input`); continue }
      confirmRead = { method: rm, idArg }
    }
    const who = whoKeys(input)
    if (who.length) warnings.push(`${name}: параметр ${who.join(', ')} — «о ком»: метод должен отдавать только данные, доступные вызывающему сотруднику`)
    seen.add(name)
    const title = typeof t.title === 'string' ? cleanText(t.title, 100, true) : ''
    tools.push({ name, method, kind, description, input, ...(title ? { title } : {}), ...(confirmRead ? { confirmRead } : {}) })
  }
  return { tools, errors, warnings }
}

/** Какие ключи уйдут методу: только объявленные в input.properties, без запрещённых и без ключей на «_». */
export function pickArgs(input, args) {
  const allowed = new Set(Object.keys(input.properties ?? {}))
  const out = {}
  for (const [k, v] of Object.entries(args ?? {})) {
    if (!allowed.has(k) || isForbiddenArg(k) || k.startsWith('_') || k === 'constructor' || k === 'prototype') continue
    out[k] = v
  }
  return out
}

// Командная строка
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [file, manifestMethod] = process.argv.slice(2)
  if (!file || !manifestMethod) {
    console.error('Использование: node tools/manifest-check.mjs <файл.json | -> <метод-манифест, например demo.mcp.tools>')
    process.exit(2)
  }
  const text = readFileSync(file === '-' ? 0 : file, 'utf8')
  const { tools, errors, warnings } = parseManifest(JSON.parse(text), manifestMethod)
  for (const t of tools) console.log(`ok   ${t.name} (${t.kind}) -> ${t.method}`)
  for (const w of warnings) console.log(`warn ${w}`)
  for (const e of errors) console.log(`FAIL ${e}`)
  process.exit(errors.length ? 1 : 0)
}
