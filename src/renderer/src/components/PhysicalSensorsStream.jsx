import { SMART_CITY_CATEGORIES } from '../lib/city-simulation'

function MiniSparkline({ data = [], stroke = '#38bdf8' }) {
  if (!data || data.length < 2) {
    return <div className="mini-sparkline-placeholder" />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 60
  const height = 18
  const step = width / (data.length - 1)

  const points = data
    .map((val, idx) => {
      const x = (idx * step).toFixed(1)
      const y = (height - ((val - min) / range) * (height - 4) - 2).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="mini-sparkline-svg">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function getCategoryIcon(key) {
  switch (key) {
    case 'energia':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case 'agua':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      )
    case 'aire':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
      )
    case 'trafico':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      )
    case 'residuos':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
        </svg>
      )
  }
}

export default function PhysicalSensorsStream({ telemetryMap = {}, sensorHistory = {} }) {
  return (
    <div className="sensors-stream-card">
      <div className="stream-header">
        <div className="stream-title-group">
          <span className="pulse-dot pulse-dot--blue" />
          <h3 className="stream-title">SENSORES EN VIVO</h3>
        </div>
        <span className="stream-badge">5 Canales</span>
      </div>

      <div className="stream-list">
        {SMART_CITY_CATEGORIES.map((cat) => {
          const live = telemetryMap[cat.key] || {}
          const currentVal = Number.isFinite(live.value) ? live.value : cat.nominal
          const history = sensorHistory[cat.key] || [
            cat.nominal - 2,
            cat.nominal + 1,
            cat.nominal - 1,
            cat.nominal
          ]

          return (
            <div key={cat.key} className="sensor-compact-row">
              <div className="sensor-compact-icon" style={{ color: cat.accent }}>
                {getCategoryIcon(cat.key)}
              </div>

              <div className="sensor-compact-info">
                <span className="sensor-compact-name">{cat.label}</span>
                <span className="sensor-compact-district">{cat.district}</span>
              </div>

              <div className="sensor-compact-spark">
                <MiniSparkline data={history} stroke={cat.accent} />
              </div>

              <div className="sensor-compact-val">
                <span className="sensor-num">
                  {typeof currentVal === 'number'
                    ? Number.isInteger(currentVal)
                      ? currentVal
                      : currentVal.toFixed(1)
                    : currentVal}
                </span>
                <span className="sensor-unit">{cat.unit}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
