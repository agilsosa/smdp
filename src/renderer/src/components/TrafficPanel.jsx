import { trafficSummary } from '../../../shared/city.js'

function OccupancyRow({ label, value, occupied }) {
  const missing = !value

  return (
    <div
      className={`sc-lane ${
        missing ? 'sc-lane--unknown' : occupied ? 'sc-lane--busy' : 'sc-lane--free'
      }`}
    >
      <span className="sc-lane__label">{label}</span>
      <span className={`sc-lane__dot ${missing ? '' : occupied ? 'is-busy' : 'is-free'}`} />
      <span className="sc-lane__value">
        {missing ? 'Sin datos' : occupied ? 'Ocupado' : 'Libre'}
      </span>
      <span className="sc-lane__raw">({value ?? '—'})</span>
    </div>
  )
}

export default function TrafficPanel({ data, decision }) {
  const traffic = trafficSummary(data)
  const hasData = Boolean(traffic.vertical || traffic.horizontal)
  const light =
    decision?.decisions?.semaforo ??
    (traffic.bothOccupied ? 'rojo' : traffic.occupiedCount === 1 ? 'amarillo' : 'verde')

  const statusText = !hasData
    ? 'Esperando sensores de ocupación'
    : traffic.bothOccupied
      ? 'Tráfico excesivo en ambos ejes'
      : traffic.occupiedCount === 1
        ? 'Tráfico moderado · un eje ocupado'
        : 'Circulación fluida'

  return (
    <section className="sc-panel sc-panel--traffic">
      <header className="sc-panel__head">
        <div className="sc-panel__title">
          <div>
            <h3>Semáforo</h3>
            <p>Luces D3/D4/D5 · sensores D2 y D6</p>
          </div>
        </div>
        <span
          className={`sc-chip ${
            !hasData
              ? ''
              : traffic.bothOccupied
                ? 'sc-chip--danger'
                : traffic.occupiedCount === 1
                  ? 'sc-chip--warn'
                  : 'sc-chip--ok'
          }`}
        >
          {!hasData
            ? 'Sin datos'
            : traffic.bothOccupied
              ? 'Congestión'
              : traffic.occupiedCount === 1
                ? 'Precaución'
                : 'Normal'}
        </span>
      </header>

      <div className="sc-traffic-main">
        <div className="sc-signal" aria-label={`Semáforo en ${light}`}>
          <span
            className={`sc-signal__bulb sc-signal__bulb--red ${light === 'rojo' ? 'is-on' : ''}`}
          />
          <span
            className={`sc-signal__bulb sc-signal__bulb--amber ${
              light === 'amarillo' ? 'is-on' : ''
            }`}
          />
          <span
            className={`sc-signal__bulb sc-signal__bulb--green ${light === 'verde' ? 'is-on' : ''}`}
          />
        </div>

        <div className="sc-lanes">
          <OccupancyRow
            label="Eje vertical"
            value={traffic.vertical}
            occupied={traffic.verticalOccupied}
          />
          <OccupancyRow
            label="Eje horizontal"
            value={traffic.horizontal}
            occupied={traffic.horizontalOccupied}
          />
        </div>
      </div>

      <div
        className={`sc-traffic-status ${
          !hasData
            ? 'sc-traffic-status--unknown'
            : traffic.bothOccupied
              ? 'sc-traffic-status--danger'
              : traffic.occupiedCount === 1
                ? 'sc-traffic-status--warn'
                : 'sc-traffic-status--ok'
        }`}
      >
        <span className="sc-traffic-status__mark">
          {!hasData ? '—' : traffic.bothOccupied ? '!' : traffic.occupiedCount === 1 ? '⚠' : '✓'}
        </span>
        <span>{statusText}</span>
      </div>

      <p className="sc-panel__hint">
        {!hasData
          ? 'Conecta el Arduino o activa el modo demo para recibir la ocupación de los dos ejes.'
          : traffic.bothOccupied
            ? 'Ambos ejes ocupados: luz roja. Evita la intersección o utiliza transporte público.'
            : traffic.occupiedCount === 1
              ? 'Un eje ocupado: luz amarilla de precaución. Reduce la velocidad al cruzar.'
              : 'Ambos ejes libres: luz verde. Circulación regular por la intersección.'}
      </p>
    </section>
  )
}
