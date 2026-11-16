/**
 * Smart City Metropolitan OS - Simulación y Estructuras de Datos
 */

export const SMART_CITY_CATEGORIES = [
  {
    key: 'energia',
    label: 'Red Eléctrica',
    sublabel: 'Generación y consumo metropolitano',
    unit: 'kW',
    icon: 'energy',
    accent: '#38bdf8',
    nominal: 842.5,
    minNominal: 750,
    maxNominal: 920,
    statusText: 'Óptimo · 94.2% Renovable',
    district: 'Subestación Central Alpha'
  },
  {
    key: 'agua',
    label: 'Red Hídrica',
    sublabel: 'Reservas y presión de distribución',
    unit: '%',
    icon: 'water',
    accent: '#0ea5e9',
    nominal: 78.4,
    minNominal: 65,
    maxNominal: 90,
    statusText: 'Presión 4.8 bar · Normal',
    district: 'Embalse Metropolitano & Conducción'
  },
  {
    key: 'aire',
    label: 'Calidad del Aire',
    sublabel: 'Índice AQI & Partículas PM2.5',
    unit: 'AQI',
    icon: 'air',
    accent: '#60a5fa',
    nominal: 24,
    minNominal: 15,
    maxNominal: 45,
    statusText: 'Excelente · PM2.5: 8.2 µg/m³',
    district: 'Torre Atmosférica Distrito Centro'
  },
  {
    key: 'trafico',
    label: 'Flujo de Tráfico',
    sublabel: 'Densidad vial y velocidad media',
    unit: '%',
    icon: 'traffic',
    accent: '#2563eb',
    nominal: 62.0,
    minNominal: 40,
    maxNominal: 85,
    statusText: 'Fluidez 48 km/h · Onda Verde',
    district: 'Corredor Autopista Metropolitana'
  },
  {
    key: 'residuos',
    label: 'Gestión de Residuos',
    sublabel: 'Capacidad de contenedores IoT',
    unit: '% cap',
    icon: 'waste',
    accent: '#93c5fd',
    nominal: 38.5,
    minNominal: 25,
    maxNominal: 65,
    statusText: '14 Unidades en ruta activa',
    district: 'Distrito Este & Hub de Reciclaje'
  }
]

export const INITIAL_AI_RECOMMENDATIONS = [
  {
    id: 'rec-1',
    timestamp: 'Hace 2 min',
    category: 'energia',
    type: 'OPTIMIZACIÓN',
    title: 'Desvío de Excedente Solar a Micro-red B',
    desc: 'La subestación solar reporta un pico de +14% sobre la proyección. Se recomienda redirigir 85 kW hacia las estaciones de carga rápida de transporte público.',
    actionLabel: 'Aplicar desvío',
    badge: 'Prioridad Media',
    applied: false
  },
  {
    id: 'rec-2',
    timestamp: 'Hace 5 min',
    category: 'trafico',
    type: 'SINCRONIZACIÓN',
    title: 'Extensión de Onda Verde en Av. Metropolitana',
    desc: 'Flujo vehicular en ascenso en nodo N-12 (+18% veh/min). El modelo predictivo sugiere extender la fase semafórica verde en 16 segundos.',
    actionLabel: 'Sincronizar semáforos',
    badge: 'Recomendado',
    applied: true
  },
  {
    id: 'rec-3',
    timestamp: 'Hace 11 min',
    category: 'agua',
    type: 'PRESIÓN',
    title: 'Modulación de Válvula Hidráulica V-04',
    desc: 'Estabilidad de reserva al 78.4%. Se aconseja reducir gradualmente la presión en red secundaria sur a 4.2 bar para prevenir estrés hídrico nocturno.',
    actionLabel: 'Modular válvula',
    badge: 'Ahorro',
    applied: false
  },
  {
    id: 'rec-4',
    timestamp: 'Hace 18 min',
    category: 'residuos',
    type: 'ENRUTAMIENTO',
    title: 'Despacho Anticipado Camión Recolector #08',
    desc: 'Contenedores inteligentes en Sector Comercial alcanzaron el 78% de compactación. Algoritmo calculó ruta optimizada con 22 min de anticipación.',
    actionLabel: 'Despachar ruta',
    badge: 'Logística',
    applied: true
  }
]

export const ROUTE_NODES = [
  { id: 'HUB_CENTRAL', name: 'Hub Central', x: 180, y: 90, type: 'hub' },
  { id: 'DIST_NORTE', name: 'Nodo Norte', x: 80, y: 40, type: 'node' },
  { id: 'DIST_SUR', name: 'Nodo Sur', x: 280, y: 40, type: 'node' },
  { id: 'PARQ_IND', name: 'Eco-Planta', x: 290, y: 135, type: 'plant' },
  { id: 'SUB_EST', name: 'Subestación', x: 70, y: 135, type: 'energy' },
  { id: 'PUERTO', name: 'Puerto', x: 180, y: 150, type: 'port' }
]

export const ROUTE_LINKS = [
  { from: 'SUB_EST', to: 'DIST_NORTE', distance: '4.2 km', load: 'Baja', optimal: true },
  { from: 'DIST_NORTE', to: 'HUB_CENTRAL', distance: '3.1 km', load: 'Media', optimal: true },
  { from: 'HUB_CENTRAL', to: 'DIST_SUR', distance: '2.8 km', load: 'Fluida', optimal: true },
  { from: 'DIST_SUR', to: 'PARQ_IND', distance: '5.0 km', load: 'Baja', optimal: true },
  { from: 'HUB_CENTRAL', to: 'PUERTO', distance: '3.4 km', load: 'Fluida', optimal: false },
  { from: 'SUB_EST', to: 'PUERTO', distance: '6.1 km', load: 'Pesada', optimal: false }
]
