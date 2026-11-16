/**
 * Parser tolerante para líneas enviadas por el Arduino.
 *
 * Formatos soportados:
 *   {"temperature":24.5,"humidity":52}
 *   temperature=24.5,humidity=52
 *   temperature: 24.5; humidity: 52
 *   24.5            -> se guarda como { value: 24.5 }
 */

const MAX_KEYS = 24
const NUMBER_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/
const PAIR_GLOBAL = /([A-Za-z][A-Za-z0-9_. -]*?)\s*[=:]\s*(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed && NUMBER_RE.test(trimmed)) {
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? parsed : null
    }
  }

  return null
}

function normalizeKey(key) {
  return String(key)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '')
    .slice(0, 40)
}

function addValue(values, key, rawValue) {
  if (Object.keys(values).length >= MAX_KEYS) return

  const normalizedKey = normalizeKey(key)
  const value = toNumber(rawValue)

  if (!normalizedKey || value === null) return
  values[normalizedKey] = value
}

function parseJsonObject(parsed, values) {
  for (const [key, rawValue] of Object.entries(parsed)) {
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      // Aplana un nivel: {"sensor": {"temp": 24.5}} -> sensor_temp
      for (const [childKey, childValue] of Object.entries(rawValue)) {
        addValue(values, `${key}_${childKey}`, childValue)
      }
      continue
    }

    addValue(values, key, rawValue)
  }
}

export function parseSensorLine(line) {
  const text = String(line ?? '').trim()
  if (!text) return null

  const values = {}

  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)

      if (Array.isArray(parsed)) {
        parsed.forEach((item, index) => addValue(values, `ch${index + 1}`, item))
      } else if (parsed && typeof parsed === 'object') {
        parseJsonObject(parsed, values)
      } else {
        addValue(values, 'value', parsed)
      }
    } catch {
      return null
    }
  } else if (NUMBER_RE.test(text)) {
    addValue(values, 'value', text)
  } else {
    for (const match of text.matchAll(PAIR_GLOBAL)) {
      addValue(values, match[1], match[2])
    }
  }

  return Object.keys(values).length > 0 ? values : null
}
