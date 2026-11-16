/**
 * Modelo compartido de la simulación urbana.
 * Se usa tanto en el proceso principal (decisiones locales / prompt de Gemini)
 * como en el renderer (etiquetas, payload y cálculos de la interfaz).
 */

export const DECISION_VALUES = {
  energia: ['solar', 'eolica', 'residuos'],
  semaforo: ['rojo', 'amarillo', 'verde'],
  sol: ['cubrir', 'libre'],
  temperatura: ['frio', 'caliente'],
  agua: ['bajo', 'full', 'normal'],
  poste: ['encender', 'apagar']
}

export const DECISION_ORDER = ['energia', 'semaforo', 'sol', 'temperatura', 'agua', 'poste']

export const DECISION_TITLES = {
  energia: 'Energía',
  semaforo: 'Semáforo',
  sol: 'Sol',
  temperatura: 'Temperatura',
  agua: 'Agua',
  poste: 'Poste'
}

export const DECISION_LABELS = {
  energia: { solar: 'Solar', eolica: 'Eólica', residuos: 'Residuos' },
  semaforo: { rojo: 'Rojo', amarillo: 'Amarillo', verde: 'Verde' },
  sol: { cubrir: 'Cubrir', libre: 'Descubrir' },
  temperatura: { frio: 'Frío', caliente: 'Caliente' },
  agua: { bajo: 'Bajo', full: 'Full', normal: 'Normal' },
  poste: { encender: 'Encender', apagar: 'Apagar' }
}

export const ENERGY_SOURCES = [
  { key: 'solar', label: 'Solar', color: '#fbbf24' },
  { key: 'eolica', label: 'Eólica', color: '#38bdf8' },
  { key: 'residuos', label: 'Residuos', color: '#34d399' }
]

export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function isOccupied(value) {
  return String(value ?? '')
    .toLowerCase()
    .startsWith('ocup')
}

export function positionLabel(value) {
  return isOccupied(value) ? 'Ocupado' : 'Libre'
}

export function energyBreakdown(data) {
  const sources = ENERGY_SOURCES.map((source) => ({
    ...source,
    value: toNumber(data?.energia?.[source.key]),
    voltage: toNumber(data?.energia?.[`voltaje_${source.key}`])
  }))

  const total = sources.reduce(
    (sum, source) => sum + (Number.isFinite(source.value) ? source.value : 0),
    0
  )

  let highest = sources[0]
  for (const source of sources) {
    if (!Number.isFinite(source.value)) continue
    if (!Number.isFinite(highest.value) || source.value > highest.value) highest = source
  }

  const percentages = Object.fromEntries(
    sources.map((source) => [
      source.key,
      total > 0 && Number.isFinite(source.value) ? (source.value / total) * 100 : 0
    ])
  )

  return { sources, total, highest, percentages }
}

export function sunSummary(data) {
  const north = toNumber(data?.sol?.norte)
  const south = toNumber(data?.sol?.sur)
  const max = Math.max(Number.isFinite(north) ? north : 0, Number.isFinite(south) ? south : 0)

  let position = 'Sin datos'
  if (Number.isFinite(north) && Number.isFinite(south)) {
    if (Math.abs(north - south) < 8) position = 'Cenital'
    else position = north > south ? 'Norte' : 'Sur'
  }

  return {
    north,
    south,
    max,
    position,
    isCloudy: max < 35,
    needsProtection: max >= 60
  }
}

export function trafficSummary(data) {
  const vertical = data?.semaforo?.vertical ?? null
  const horizontal = data?.semaforo?.horizontal ?? null
  const verticalOccupied = isOccupied(vertical)
  const horizontalOccupied = isOccupied(horizontal)

  return {
    vertical,
    horizontal,
    verticalOccupied,
    horizontalOccupied,
    bothOccupied: verticalOccupied && horizontalOccupied,
    occupiedCount: Number(verticalOccupied) + Number(horizontalOccupied)
  }
}

export function deriveDecisions(data) {
  const energy = energyBreakdown(data)
  const traffic = trafficSummary(data)
  const sun = sunSummary(data)
  const ambient = toNumber(data?.temperatura?.ambiente)
  const water = toNumber(data?.agua?.nivel)

  return {
    energia: energy.highest.key,
    semaforo: traffic.bothOccupied ? 'rojo' : traffic.occupiedCount === 1 ? 'amarillo' : 'verde',
    sol: sun.needsProtection ? 'cubrir' : 'libre',
    temperatura: Number.isFinite(ambient) && ambient >= 26 ? 'caliente' : 'frio',
    agua:
      Number.isFinite(water) && water < 25
        ? 'bajo'
        : Number.isFinite(water) && water >= 85
          ? 'full'
          : 'normal',
    poste: sun.isCloudy ? 'encender' : 'apagar'
  }
}

export function buildDecisionPayload(decisions) {
  return DECISION_ORDER.map((key) => `${key}: ${decisions?.[key] ?? ''}`).join('\n')
}

export function decisionLabel(key, value) {
  return DECISION_LABELS[key]?.[value] ?? '—'
}

export function formatNumber(value, decimals = 1) {
  if (!Number.isFinite(value)) return '—'
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(decimals)
}

export function localDecisionResult(data) {
  const decisions = deriveDecisions(data)
  const energy = energyBreakdown(data)
  const traffic = trafficSummary(data)
  const sun = sunSummary(data)
  const ambient = toNumber(data?.temperatura?.ambiente)
  const humidity = toNumber(data?.temperatura?.humedad)
  const water = toNumber(data?.agua?.nivel)

  const recommendations = []

  const sourcePin =
    energy.highest.key === 'solar' ? 'A4' : energy.highest.key === 'eolica' ? 'A6' : null
  const voltage =
    Number.isFinite(energy.highest.voltage) && sourcePin
      ? ` · ${formatNumber(energy.highest.voltage, 2)} V en ${sourcePin}`
      : ''

  recommendations.push(
    `Fuente principal: ${energy.highest.label} con ${formatNumber(
      energy.highest.value
    )} kW${voltage} (${formatNumber(energy.total)} kW totales en la red).`
  )

  if (traffic.bothOccupied) {
    recommendations.push(
      'Tráfico congestionado en ambos ejes: el semáforo se pone en rojo; evita la zona o usa transporte público.'
    )
  } else if (traffic.occupiedCount === 1) {
    recommendations.push(
      'Un eje presenta ocupación: el semáforo queda en amarillo; circula con precaución por la intersección.'
    )
  } else {
    recommendations.push('Ambos ejes libres: semáforo en verde y circulación fluida.')
  }

  recommendations.push(
    sun.needsProtection
      ? `Radiación solar alta (${formatNumber(sun.max, 0)}%): se despliega la cubierta de los edificios para protegerlos.`
      : `Radiación solar baja (${formatNumber(sun.max, 0)}%): la cubierta de los edificios permanece retirada.`
  )

  if (Number.isFinite(ambient)) {
    recommendations.push(
      ambient >= 26
        ? `Temperatura alta (${formatNumber(ambient)} °C): hidrátate y busca sombra.`
        : `Temperatura fresca (${formatNumber(ambient)} °C): lleva una prenda ligera si vas a salir.`
    )
  }

  if (Number.isFinite(humidity)) {
    recommendations.push(`Humedad ambiental: ${formatNumber(humidity)}%.`)
  }

  if (Number.isFinite(water)) {
    recommendations.push(
      water < 25
        ? `Nivel de agua bajo (${formatNumber(water)}%): restringe el consumo no esencial.`
        : water >= 85
          ? `Depósito lleno (${formatNumber(water)}%): mantén el consumo normal.`
          : `Nivel de agua normal (${formatNumber(water)}%).`
    )
  }

  recommendations.push(
    decisions.poste === 'encender'
      ? 'Radiación baja: se encienden los postes norte y sur (D11 y D12).'
      : 'Hay luz suficiente: los postes norte y sur permanecen apagados.'
  )

  return {
    source: 'local',
    model: null,
    decisions,
    explanation:
      'Decisiones calculadas con reglas locales a partir de las últimas lecturas. Activa Gemini para obtener un análisis más contextual y recomendaciones ciudadanas.',
    recommendations
  }
}
