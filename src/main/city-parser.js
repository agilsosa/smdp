/**
 * Parser del formato de telemetría enviado por el Arduino:
 *
 *   Energía: solar (48.2), eolica (26.1), residuos (14.3), voltaje_solar (4.20), voltaje_eolica (3.10)
 *   Semaforo: vertical (ocupado), horizontal (libre)
 *   Sol: norte (55), sur (38)
 *   Temperatura: ambiente (24.5), humedad (56)
 *   Agua: nivel (68)
 *
 * Las líneas pueden llegar con acentos, mayúsculas o espacios variables.
 */

const CATEGORY_ALIASES = {
  energia: 'energia',
  energias: 'energia',
  semaforo: 'semaforo',
  trafico: 'semaforo',
  sol: 'sol',
  temperatura: 'temperatura',
  temp: 'temperatura',
  agua: 'agua'
}

const KEY_ALIASES = {
  energia: {
    solar: 'solar',
    eolica: 'eolica',
    eolico: 'eolica',
    residuos: 'residuos',
    residuo: 'residuos',
    voltaje_solar: 'voltaje_solar',
    voltage_solar: 'voltaje_solar',
    voltaje_eolica: 'voltaje_eolica',
    voltage_eolica: 'voltaje_eolica'
  },
  semaforo: {
    vertical: 'vertical',
    horizontal: 'horizontal'
  },
  sol: {
    norte: 'norte',
    sur: 'sur'
  },
  temperatura: {
    ambiente: 'ambiente',
    humedad: 'humedad'
  },
  agua: {
    nivel: 'nivel'
  }
}

const REQUIRED_FIELDS = {
  energia: ['solar', 'eolica', 'residuos'],
  semaforo: ['vertical', 'horizontal'],
  sol: ['norte', 'sur'],
  temperatura: ['ambiente', 'humedad'],
  agua: ['nivel']
}

const PAIR_RE = /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ_]+)\s*\(\s*([^)]*?)\s*\)/g

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function parseNumber(value) {
  const match = String(value ?? '')
    .replace(',', '.')
    .match(/-?\d+(?:\.\d+)?/)
  if (!match) return null

  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function parseOccupancy(value) {
  const normalized = normalizeText(value)

  if (['ocupada', 'ocupado', 'lleno', 'llena', '1', 'true', 'on'].includes(normalized)) {
    return 'ocupado'
  }

  if (['libre', 'vacio', 'vacia', '0', 'false', 'off'].includes(normalized)) {
    return 'libre'
  }

  return null
}

export function parseCityLine(line) {
  const text = String(line ?? '').trim()
  const colonIndex = text.indexOf(':')
  if (colonIndex < 0) return null

  const category = CATEGORY_ALIASES[normalizeText(text.slice(0, colonIndex))]
  if (!category) return null

  const values = {}
  const aliases = KEY_ALIASES[category]

  for (const match of text.slice(colonIndex + 1).matchAll(PAIR_RE)) {
    const key = aliases[normalizeText(match[1])]
    if (!key) continue

    if (category === 'semaforo') {
      const occupancy = parseOccupancy(match[2])
      if (occupancy) values[key] = occupancy
      continue
    }

    const number = parseNumber(match[2])
    if (number !== null) values[key] = number
  }

  return Object.keys(values).length > 0 ? { [category]: values } : null
}

export function isCompleteFrame(data) {
  return Object.entries(REQUIRED_FIELDS).every(([category, fields]) =>
    fields.every((field) => data?.[category]?.[field] !== undefined)
  )
}

export function formatCityFrame(data) {
  const energy = data?.energia ?? {}
  const traffic = data?.semaforo ?? {}
  const sun = data?.sol ?? {}
  const temperature = data?.temperatura ?? {}
  const water = data?.agua ?? {}
  const number = (value, decimals = 1) =>
    Number.isFinite(value) ? value.toFixed(decimals).replace(/\.0$/, '') : '—'

  const energyParts = [
    `solar (${number(energy.solar)})`,
    `eolica (${number(energy.eolica)})`,
    `residuos (${number(energy.residuos)})`
  ]

  if (Number.isFinite(energy.voltaje_solar)) {
    energyParts.push(`voltaje_solar (${number(energy.voltaje_solar, 2)})`)
  }

  if (Number.isFinite(energy.voltaje_eolica)) {
    energyParts.push(`voltaje_eolica (${number(energy.voltaje_eolica, 2)})`)
  }

  return [
    `Energía: ${energyParts.join(', ')}`,
    `Semaforo: vertical (${traffic.vertical ?? '—'}), horizontal (${traffic.horizontal ?? '—'})`,
    `Sol: norte (${number(sun.norte, 0)}), sur (${number(sun.sur, 0)})`,
    `Temperatura: ambiente (${number(temperature.ambiente)}), humedad (${number(temperature.humedad)})`,
    `Agua: nivel (${number(water.nivel)})`
  ].join('\n')
}

export class CityFrameAssembler {
  constructor({ onFrame, idleMs = 2500 } = {}) {
    this.onFrame = onFrame
    this.idleMs = idleMs
    this.data = {}
    this.rawLines = []
    this.timer = null
  }

  push(line) {
    const parsed = parseCityLine(line)
    if (!parsed) return

    for (const [category, values] of Object.entries(parsed)) {
      this.data[category] = { ...(this.data[category] ?? {}), ...values }
    }

    this.rawLines.push(String(line).trim())
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), this.idleMs)

    if (isCompleteFrame(this.data)) this.flush()
  }

  flush() {
    clearTimeout(this.timer)
    this.timer = null

    const hasData = Object.keys(this.data).length > 0
    const frame = { data: this.data, raw: this.rawLines.join('\n') }
    this.data = {}
    this.rawLines = []

    if (hasData) this.onFrame?.(frame)
  }

  reset() {
    clearTimeout(this.timer)
    this.timer = null
    this.data = {}
    this.rawLines = []
  }
}
