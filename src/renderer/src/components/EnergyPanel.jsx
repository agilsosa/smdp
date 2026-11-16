import { energyBreakdown, formatNumber } from '../../../shared/city.js'

export default function EnergyPanel({ data, decision }) {
  const breakdown = energyBreakdown(data)
  const chosen = decision?.decisions?.energia
  const active = breakdown.sources.find((source) => source.key === chosen) ?? breakdown.highest
  const activeValue = active?.value
  const hasData = Number.isFinite(breakdown.total) && breakdown.total > 0
  const activePercent =
    hasData && Number.isFinite(activeValue) ? (activeValue / breakdown.total) * 100 : 0

  return (
    <section className="sc-panel sc-panel--energy">
      <header className="sc-panel__head">
        <div className="sc-panel__title">
          <div>
            <h3>Energía</h3>
            <p>Indicadores D8/D9/D10, voltaje y consumo</p>
          </div>
        </div>
        <span className="sc-chip">3 fuentes</span>
      </header>

      <div className="sc-energy-total">
        <span className="sc-energy-total__label">Consumo actual</span>
        <strong className="sc-energy-total__value">
          {hasData ? formatNumber(breakdown.total) : '—'}
          <em>kW</em>
        </strong>
      </div>

      <div className="sc-source-list">
        {breakdown.sources.map((source) => {
          const percent = breakdown.percentages[source.key] ?? 0
          const isActive = source.key === active?.key

          return (
            <div key={source.key} className={`sc-source ${isActive ? 'sc-source--active' : ''}`}>
              <span className="sc-source__dot" style={{ background: source.color }} />
              <span className="sc-source__name">{source.label}</span>
              <div className="sc-source__track">
                <span
                  className="sc-source__fill"
                  style={{
                    width: `${Math.max(percent > 0 ? 3 : 0, percent)}%`,
                    background: source.color
                  }}
                />
              </div>
              <span className="sc-source__value">
                <span>{formatNumber(source.value)} kW</span>
                {Number.isFinite(source.voltage) ? (
                  <span className="sc-source__voltage">{formatNumber(source.voltage, 2)} V</span>
                ) : null}
              </span>
            </div>
          )
        })}
      </div>

      <div className="sc-energy-foot">
        {hasData ? (
          <>
            <span className="sc-chip sc-chip--active">En uso: {active?.label ?? '—'}</span>
            <span className="sc-energy-foot__pct">
              {formatNumber(activePercent, 0)}% ({formatNumber(activeValue)} kW
              {Number.isFinite(active?.voltage) ? ` · ${formatNumber(active.voltage, 2)} V` : ''})
            </span>
          </>
        ) : (
          <>
            <span className="sc-chip">Sin lecturas</span>
            <span className="sc-energy-foot__pct">— kW</span>
          </>
        )}
      </div>
    </section>
  )
}
