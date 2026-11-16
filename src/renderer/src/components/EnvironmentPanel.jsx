import { formatNumber, toNumber } from '../../../shared/city.js'

function Metric({ label, value, unit, tone, advice, text }) {
  return (
    <div className={`sc-metric sc-metric--${tone}`}>
      <span className="sc-metric__label">{label}</span>
      <span className="sc-metric__value">
        {text ?? (
          <>
            {formatNumber(value)}
            <em>{unit}</em>
          </>
        )}
      </span>
      <span className="sc-metric__advice">{advice}</span>
    </div>
  )
}

export default function EnvironmentPanel({ data, decision }) {
  const ambient = toNumber(data?.temperatura?.ambiente)
  const humidity = toNumber(data?.temperatura?.humedad)
  const water = toNumber(data?.agua?.nivel)

  const tempDecision = decision?.decisions?.temperatura
  const waterDecision = decision?.decisions?.agua
  const coverDecision = decision?.decisions?.sol

  const tempTone =
    tempDecision === 'caliente' ? 'hot' : tempDecision === 'frio' ? 'cold' : 'neutral'
  const waterTone = waterDecision === 'bajo' ? 'low' : waterDecision === 'full' ? 'full' : 'normal'

  const tempAdvice = !Number.isFinite(ambient)
    ? 'Sin datos'
    : tempDecision === 'caliente'
      ? 'Hidratación recomendada'
      : tempDecision === 'frio'
        ? 'Prenda ligera'
        : 'Confort estable'

  const humidityAdvice = !Number.isFinite(humidity)
    ? 'Sin datos'
    : humidity > 70
      ? 'Humedad alta'
      : 'Humedad normal'

  const waterAdvice = !Number.isFinite(water)
    ? 'Sin datos'
    : waterDecision === 'bajo'
      ? 'Reserva baja'
      : waterDecision === 'full'
        ? 'Depósito lleno'
        : 'Nivel óptimo'

  const coverText = !coverDecision ? '—' : coverDecision === 'cubrir' ? 'Desplegada' : 'Retirada'
  const coverAdvice = !coverDecision
    ? 'Sin datos'
    : coverDecision === 'cubrir'
      ? 'Motor D13 activo'
      : 'Edificios descubiertos'

  return (
    <section className="sc-panel sc-panel--environment">
      <header className="sc-panel__head">
        <div className="sc-panel__title">
          <div>
            <h3>Entorno</h3>
            <p>Temperatura A1, humedad A1, agua A5 y cubierta</p>
          </div>
        </div>
        <span className="sc-chip">4 variables</span>
      </header>

      <div className="sc-metrics-grid">
        <Metric label="Temperatura" value={ambient} unit="°C" tone={tempTone} advice={tempAdvice} />
        <Metric label="Humedad" value={humidity} unit="%" tone="neutral" advice={humidityAdvice} />
        <Metric
          label="Nivel de agua"
          value={water}
          unit="%"
          tone={waterTone}
          advice={waterAdvice}
        />
        <Metric
          label="Cubierta"
          text={coverText}
          tone={coverDecision === 'cubrir' ? 'hot' : 'wet'}
          advice={coverAdvice}
        />
      </div>

      <div className="sc-water-track" aria-hidden="true">
        <span
          className="sc-water-track__fill"
          style={{ width: `${Number.isFinite(water) ? Math.min(100, Math.max(0, water)) : 0}%` }}
        />
      </div>

      <p className="sc-panel__hint">
        {!Number.isFinite(water)
          ? 'Sin lecturas de agua: conecta el Arduino o activa el modo demo.'
          : waterDecision === 'bajo'
            ? 'Nivel de agua bajo: reducir consumos prescindibles.'
            : waterDecision === 'full'
              ? 'Depósito al 100%: capacidad completa.'
              : 'Nivel de reserva dentro del rango de operación.'}{' '}
        {!coverDecision
          ? 'Sin datos de la cubierta de edificios.'
          : coverDecision === 'cubrir'
            ? 'Cubierta desplegada para proteger los edificios de la radiación.'
            : 'Cubierta retirada: los edificios reciben la luz solar.'}
      </p>
    </section>
  )
}
