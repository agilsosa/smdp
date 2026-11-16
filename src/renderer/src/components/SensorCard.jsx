import Sparkline from './Sparkline'
import { formatValue } from '../lib/sensors'

export default function SensorCard({ meta, stats }) {
  const hasData = stats.count > 0

  return (
    <article className="sensor-card" style={{ '--accent': meta.color }}>
      <div className="sensor-card__head">
        <span className="sensor-card__label">{meta.label}</span>
        {meta.unit ? <span className="sensor-card__unit">{meta.unit}</span> : null}
      </div>

      <div className="sensor-card__value">
        {formatValue(stats.latest)}
        {meta.unit ? <span className="sensor-card__value-unit">{meta.unit}</span> : null}
      </div>

      <Sparkline values={stats.series.slice(-70)} color={meta.color} />

      <div className="sensor-card__footer">
        <span>
          mín <b>{formatValue(stats.min)}</b>
        </span>
        <span>
          máx <b>{formatValue(stats.max)}</b>
        </span>
        <span>
          med <b>{formatValue(stats.avg)}</b>
        </span>
      </div>

      {!hasData ? <p className="sensor-card__hint">Esperando lecturas…</p> : null}
    </article>
  )
}
