export default function PerformanceKPIs({ energyValue, waterValue, airValue }) {
  const energy = Number.isFinite(energyValue) ? energyValue : 842.5
  const water = Number.isFinite(waterValue) ? waterValue : 78.4
  const aqi = Number.isFinite(airValue) ? Math.round(airValue) : 24

  const airQualityStatus =
    aqi <= 30 ? 'Excelente' : aqi <= 50 ? 'Bueno' : aqi <= 80 ? 'Moderado' : 'Alerta'

  return (
    <div className="kpis-compact-strip">
      {/* KPI 1: Energía */}
      <div className="kpi-compact-cell">
        <div className="kpi-compact-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div className="kpi-compact-data">
          <div className="kpi-compact-top">
            <span className="kpi-compact-lbl">ENERGÍA</span>
            <span className="kpi-compact-badge">94.2% Renovable</span>
          </div>
          <div className="kpi-compact-val-row">
            <span className="kpi-compact-num">
              {typeof energy === 'number' ? energy.toFixed(1) : energy}
            </span>
            <span className="kpi-compact-unit">kW/h</span>
            <span className="kpi-compact-sub">· Solar 44% / Eólica 36%</span>
          </div>
        </div>
      </div>

      {/* KPI 2: Agua */}
      <div className="kpi-compact-cell">
        <div className="kpi-compact-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
          >
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        </div>
        <div className="kpi-compact-data">
          <div className="kpi-compact-top">
            <span className="kpi-compact-lbl">AGUA</span>
            <span className="kpi-compact-badge">1.42M m³</span>
          </div>
          <div className="kpi-compact-val-row">
            <span className="kpi-compact-num">
              {typeof water === 'number' ? water.toFixed(1) : water}
            </span>
            <span className="kpi-compact-unit">%</span>
            <span className="kpi-compact-sub">· Presión 4.8 bar</span>
          </div>
        </div>
      </div>

      {/* KPI 3: Calidad del Aire */}
      <div className="kpi-compact-cell">
        <div className="kpi-compact-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
          >
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
          </svg>
        </div>
        <div className="kpi-compact-data">
          <div className="kpi-compact-top">
            <span className="kpi-compact-lbl">AIRE</span>
            <span className="kpi-compact-badge">{airQualityStatus}</span>
          </div>
          <div className="kpi-compact-val-row">
            <span className="kpi-compact-num">{aqi}</span>
            <span className="kpi-compact-unit">AQI</span>
            <span className="kpi-compact-sub">· PM2.5 8.2 µg</span>
          </div>
        </div>
      </div>
    </div>
  )
}
