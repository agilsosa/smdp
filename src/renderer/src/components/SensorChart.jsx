import { useId, useMemo } from 'react'
import { formatValue, getSensorMeta, relativeTime } from '../lib/sensors'

const WIDTH = 760
const HEIGHT = 250
const PADDING = { top: 18, right: 20, bottom: 32, left: 56 }

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-ES', { hour12: false })
}

function formatAxis(value, span) {
  const decimals = span >= 10 ? 0 : span >= 1 ? 1 : 2
  return value.toFixed(decimals)
}

export default function SensorChart({ samples, sensorKeys, activeKey, onSelect }) {
  const rawId = useId()
  const gradientId = `chart-gradient-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const meta = useMemo(
    () => getSensorMeta(activeKey || sensorKeys[0] || 'sensor', sensorKeys.indexOf(activeKey)),
    [activeKey, sensorKeys]
  )

  const points = useMemo(
    () =>
      samples
        .map((sample) => ({ t: sample.t, value: sample.values?.[activeKey] }))
        .filter((point) => Number.isFinite(point.value)),
    [samples, activeKey]
  )

  const chart = useMemo(() => {
    if (points.length === 0) return null

    const values = points.map((point) => point.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || Math.max(Math.abs(max), 1) * 0.1
    const low = min - span * 0.08
    const high = max + span * 0.08

    const plotWidth = WIDTH - PADDING.left - PADDING.right
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom

    const x = (index) =>
      PADDING.left +
      (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth)
    const y = (value) => PADDING.top + (1 - (value - low) / (high - low)) * plotHeight

    const line = points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(point.value).toFixed(2)}`
      )
      .join(' ')

    const baseline = PADDING.top + plotHeight
    const area = `${line} L ${x(points.length - 1).toFixed(2)} ${baseline} L ${x(0).toFixed(
      2
    )} ${baseline} Z`

    const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const value = high - ratio * (high - low)
      return {
        y: PADDING.top + ratio * plotHeight,
        label: formatAxis(value, high - low)
      }
    })

    return { line, area, grid, baseline, last: points[points.length - 1], x, y }
  }, [points])

  const hasData = points.length > 0

  return (
    <section className="panel chart-panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Histórico de sensores</h2>
          <p className="panel__subtitle">
            {hasData
              ? `${points.length} lecturas · última ${relativeTime(points[points.length - 1].t)}`
              : 'Sin lecturas todavía'}
          </p>
        </div>

        <div className="chart-panel__controls">
          {hasData ? (
            <div className="chart-panel__current" style={{ color: meta.color }}>
              <span className="chart-panel__current-value">{formatValue(chart.last.value)}</span>
              <span className="chart-panel__current-unit">{meta.unit}</span>
            </div>
          ) : null}

          <select
            className="select select--compact"
            value={activeKey || ''}
            onChange={(event) => onSelect(event.target.value)}
            disabled={sensorKeys.length === 0}
            aria-label="Sensor a visualizar"
          >
            {sensorKeys.length === 0 ? <option value="">Sin sensores</option> : null}
            {sensorKeys.map((key, index) => {
              const info = getSensorMeta(key, index)
              return (
                <option key={key} value={key}>
                  {info.label}
                </option>
              )
            })}
          </select>
        </div>
      </header>

      {hasData ? (
        <svg
          className="chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`Histórico del sensor ${meta.label}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={meta.color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {chart.grid.map((line) => (
            <g key={line.y}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={line.y}
                y2={line.y}
                className="chart__grid"
              />
              <text
                x={PADDING.left - 10}
                y={line.y + 4}
                className="chart__axis-label"
                textAnchor="end"
              >
                {line.label}
              </text>
            </g>
          ))}

          <path d={chart.area} fill={`url(#${gradientId})`} />
          <path
            d={chart.line}
            fill="none"
            stroke={meta.color}
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <circle
            cx={chart.x(points.length - 1)}
            cy={chart.y(chart.last.value)}
            r="4"
            fill={meta.color}
            stroke="#0f172a"
            strokeWidth="2"
          />

          <text x={PADDING.left} y={HEIGHT - 8} className="chart__axis-label" textAnchor="start">
            {formatTime(points[0].t)}
          </text>
          <text
            x={WIDTH - PADDING.right}
            y={HEIGHT - 8}
            className="chart__axis-label"
            textAnchor="end"
          >
            {formatTime(points[points.length - 1].t)}
          </text>
        </svg>
      ) : (
        <div className="chart-empty">
          <div className="chart-empty__pulse" />
          <p>Conecta un Arduino o inicia el modo demo para ver la gráfica.</p>
        </div>
      )}
    </section>
  )
}
