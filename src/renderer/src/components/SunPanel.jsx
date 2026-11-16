import { formatNumber, sunSummary } from '../../../shared/city.js'

function SunGauge({ label, value }) {
  const safe = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0

  return (
    <div className="sc-sun-gauge">
      <span className="sc-sun-gauge__label">{label}</span>
      <div className="sc-sun-gauge__track">
        <span className="sc-sun-gauge__fill" style={{ width: `${safe}%` }} />
      </div>
      <span className="sc-sun-gauge__value">
        {Number.isFinite(value) ? `${formatNumber(value, 0)}%` : '—'}
      </span>
    </div>
  )
}

export default function SunPanel({ data, decision }) {
  const sun = sunSummary(data)
  const hasData = Number.isFinite(sun.north) || Number.isFinite(sun.south)
  const advise = decision?.decisions?.sol ?? (sun.needsProtection ? 'cubrir' : 'libre')
  const sky = sun.isCloudy ? 'Nublado' : sun.needsProtection ? 'Sol intenso' : 'Despejado'

  return (
    <section className="sc-panel sc-panel--sun">
      <header className="sc-panel__head">
        <div className="sc-panel__title">
          <div>
            <h3>Radiación Solar</h3>
            <p>LDR sur A0 · LDR norte A2 · motor D13</p>
          </div>
        </div>
        <span className="sc-chip">{hasData ? `Posición: ${sun.position}` : 'Sin datos'}</span>
      </header>

      <div className="sc-sun-body">
        <div className="sc-sun-condition-card">
          <span className="sc-sun-condition-title">Estado del cielo</span>
          <span className="sc-sun-condition-val">{hasData ? sky : 'Sin lecturas'}</span>
        </div>

        <div className="sc-sun-meters">
          <SunGauge label="Sensor Norte" value={sun.north} />
          <SunGauge label="Sensor Sur" value={sun.south} />
        </div>
      </div>

      <div className="sc-sun-foot">
        <span className="sc-sun-foot__sky">
          {hasData
            ? advise === 'cubrir'
              ? 'Radiación solar elevada'
              : 'Radiación solar moderada'
            : 'Esperando datos'}
        </span>
        {hasData ? (
          <span className={`sc-chip ${advise === 'cubrir' ? 'sc-chip--warn' : 'sc-chip--ok'}`}>
            {advise === 'cubrir' ? 'Cubierta desplegada' : 'Edificios descubiertos'}
          </span>
        ) : (
          <span className="sc-chip">—</span>
        )}
      </div>

      <p className="sc-panel__hint">
        {!hasData
          ? 'Conecta el Arduino o activa el modo demo para conocer la radiación solar.'
          : advise === 'cubrir'
            ? 'Radiación alta: se activa el motor D13 y se despliega la cubierta de los edificios.'
            : 'Radiación baja: la cubierta permanece retirada y los edificios quedan descubiertos.'}
      </p>
    </section>
  )
}
