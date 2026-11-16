import StatusBadge from './StatusBadge'

const BAUD_RATES = [9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000]

export default function ConnectionPanel({
  ports,
  selectedPort,
  baudRate,
  status,
  busy,
  onSelectPort,
  onBaudRate,
  onRefresh,
  onConnect,
  onDisconnect,
  onToggleDemo
}) {
  const connected = status.state === 'connected'
  const demo = status.state === 'demo'
  const active = connected || demo

  return (
    <section className="panel connection-panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Conexión Arduino</h2>
          <p className="panel__subtitle">Puerto serie y velocidad</p>
        </div>
        <StatusBadge state={status.state} />
      </header>

      <div className="field">
        <label htmlFor="serial-port">Puerto serie</label>
        <div className="field__row">
          <select
            id="serial-port"
            className="select"
            value={selectedPort}
            onChange={(event) => onSelectPort(event.target.value)}
            disabled={busy || active}
          >
            {ports.length === 0 ? <option value="">No hay puertos detectados</option> : null}
            {ports.map((port) => (
              <option key={port.path} value={port.path}>
                {port.path}
                {port.manufacturer ? ` · ${port.manufacturer}` : ''}
              </option>
            ))}
            {selectedPort && !ports.some((port) => port.path === selectedPort) ? (
              <option value={selectedPort}>{selectedPort} (manual)</option>
            ) : null}
          </select>

          <button
            type="button"
            className="btn btn--icon"
            onClick={onRefresh}
            disabled={busy}
            title="Actualizar puertos"
            aria-label="Actualizar puertos"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="baud-rate">Baudios</label>
        <select
          id="baud-rate"
          className="select"
          value={baudRate}
          onChange={(event) => onBaudRate(Number(event.target.value))}
          disabled={busy || active}
        >
          {BAUD_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate.toLocaleString('es-ES')}
            </option>
          ))}
        </select>
      </div>

      <div className="connection-panel__actions">
        {connected ? (
          <button type="button" className="btn btn--danger" onClick={onDisconnect} disabled={busy}>
            Desconectar
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={onConnect}
            disabled={busy || !selectedPort || demo}
          >
            {busy ? 'Conectando…' : 'Conectar'}
          </button>
        )}

        <button
          type="button"
          className={`btn ${demo ? 'btn--danger' : 'btn--demo'}`}
          onClick={onToggleDemo}
          disabled={busy}
        >
          {demo ? 'Detener demo' : 'Modo demo'}
        </button>
      </div>

      <p className="connection-panel__message">{status.message}</p>

      {ports.length === 0 && !active ? (
        <p className="hint hint--warning">
          No se detectaron puertos. Revisa el cable USB, los permisos del puerto (grupo{' '}
          <code>dialout</code> en Linux) o usa el modo demo.
        </p>
      ) : null}

      <details className="hint-box">
        <summary>Formato de datos esperado</summary>
        <p>Una lectura por línea, en JSON o pares clave=valor:</p>
        <pre>
          {'{"temperature":24.5,"humidity":52,"soil":38,"light":64}\ntemperature=24.5,humidity=52'}
        </pre>
        <p>La app detecta los sensores automáticamente en cada línea.</p>
      </details>
    </section>
  )
}
