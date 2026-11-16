const PALETTE = [
  '#38bdf8', // Light sky blue
  '#0ea5e9', // Ocean blue
  '#60a5fa', // Blue 400
  '#2563eb', // Royal blue
  '#00f0ff', // Cyber cyan
  '#3b82f6', // Electric blue
  '#93c5fd', // Ice blue
  '#1d4ed8', // Deep cobalt
  '#7dd3fc', // Baby blue
  '#0284c7' // Deep sky
]

const KNOWN_SENSORS = {
  energia: { label: 'Energía Eléctrica', unit: 'kW', color: '#38bdf8', icon: 'energy' },
  energy: { label: 'Energía Eléctrica', unit: 'kW', color: '#38bdf8', icon: 'energy' },
  potencia: { label: 'Potencia Eléctrica', unit: 'kW', color: '#38bdf8', icon: 'energy' },
  power: { label: 'Potencia Eléctrica', unit: 'kW', color: '#38bdf8', icon: 'energy' },
  grid: { label: 'Red Eléctrica', unit: 'kW', color: '#38bdf8', icon: 'energy' },

  agua: { label: 'Red Hídrica', unit: 'm³/s', color: '#0ea5e9', icon: 'water' },
  water: { label: 'Red Hídrica', unit: 'm³/s', color: '#0ea5e9', icon: 'water' },
  hidrico: { label: 'Caudal Hídrico', unit: 'm³/s', color: '#0ea5e9', icon: 'water' },
  flow: { label: 'Flujo Hídrico', unit: 'm³/h', color: '#0ea5e9', icon: 'water' },

  aire: { label: 'Calidad del Aire', unit: 'AQI', color: '#60a5fa', icon: 'air' },
  air: { label: 'Calidad del Aire', unit: 'AQI', color: '#60a5fa', icon: 'air' },
  aqi: { label: 'Índice Calidad Aire', unit: 'AQI', color: '#60a5fa', icon: 'air' },
  co2: { label: 'Dióxido de Carbono', unit: 'ppm', color: '#60a5fa', icon: 'air' },
  pm25: { label: 'Partículas PM2.5', unit: 'µg/m³', color: '#60a5fa', icon: 'air' },

  trafico: { label: 'Flujo de Tráfico', unit: 'veh/min', color: '#2563eb', icon: 'traffic' },
  traffic: { label: 'Flujo de Tráfico', unit: 'veh/min', color: '#2563eb', icon: 'traffic' },
  congestion: { label: 'Congestión Vial', unit: '%', color: '#2563eb', icon: 'traffic' },
  mobility: { label: 'Movilidad Urbana', unit: 'km/h', color: '#2563eb', icon: 'traffic' },

  residuos: { label: 'Gestión de Residuos', unit: '% cap', color: '#93c5fd', icon: 'waste' },
  waste: { label: 'Gestión de Residuos', unit: '% cap', color: '#93c5fd', icon: 'waste' },
  trash: { label: 'Contenedores IoT', unit: '%', color: '#93c5fd', icon: 'waste' },
  reciclaje: { label: 'Tasa Reciclaje', unit: '%', color: '#93c5fd', icon: 'waste' },

  temperature: { label: 'Temperatura Urbana', unit: '°C', color: '#38bdf8', icon: 'temp' },
  temp: { label: 'Temperatura Urbana', unit: '°C', color: '#38bdf8', icon: 'temp' },
  temperatura: { label: 'Temperatura Urbana', unit: '°C', color: '#38bdf8', icon: 'temp' },
  humidity: { label: 'Humedad Relativa', unit: '%', color: '#0ea5e9', icon: 'humidity' },
  hum: { label: 'Humedad Relativa', unit: '%', color: '#0ea5e9', icon: 'humidity' },
  humedad: { label: 'Humedad Relativa', unit: '%', color: '#0ea5e9', icon: 'humidity' },
  soil: { label: 'Humedad del Suelo', unit: '%', color: '#0284c7', icon: 'soil' },
  light: { label: 'Radiación Solar', unit: '%', color: '#7dd3fc', icon: 'light' },
  pressure: { label: 'Presión Atmosférica', unit: 'hPa', color: '#3b82f6', icon: 'pressure' }
}

function humanize(key) {
  const text = String(key).replace(/[_-]+/g, ' ').trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Sensor'
}

export function getSensorMeta(key, index = 0) {
  const known = KNOWN_SENSORS[String(key).toLowerCase()]

  if (known) {
    return { key, ...known }
  }

  return {
    key,
    label: humanize(key),
    unit: '',
    color: PALETTE[Math.abs(Number(index) || 0) % PALETTE.length]
  }
}

export function formatValue(value) {
  if (!Number.isFinite(value)) return '—'
  if (Number.isInteger(value)) return String(value)
  if (Math.abs(value) >= 1000) return value.toFixed(0)
  return value.toFixed(1)
}

export function computeStats(samples, key) {
  const numbers = samples
    .map((sample) => sample?.values?.[key])
    .filter((value) => Number.isFinite(value))

  if (numbers.length === 0) {
    return { latest: null, min: null, max: null, avg: null, count: 0, series: [] }
  }

  const sum = numbers.reduce((total, value) => total + value, 0)

  return {
    latest: numbers[numbers.length - 1],
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    avg: sum / numbers.length,
    count: numbers.length,
    series: numbers
  }
}

export function relativeTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '—'

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))

  if (seconds < 2) return 'ahora'
  if (seconds < 60) return `hace ${seconds} s`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`

  return `hace ${Math.floor(minutes / 60)} h`
}

export function collectSensorKeys(samples) {
  const keys = []

  for (const sample of samples) {
    for (const key of Object.keys(sample?.values ?? {})) {
      if (!keys.includes(key)) keys.push(key)
    }
  }

  return keys
}
