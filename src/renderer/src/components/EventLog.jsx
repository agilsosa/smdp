import { useEffect, useRef } from 'react'

const LABELS = {
  info: 'INFO',
  success: 'OK',
  error: 'ERR',
  gemini: 'IA'
}

export default function EventLog({ logs, onClear }) {
  const listRef = useRef(null)

  useEffect(() => {
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [logs])

  return (
    <section className="panel log-panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Registro</h2>
          <p className="panel__subtitle">Eventos de la aplicación</p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={onClear}
          disabled={logs.length === 0}
        >
          Limpiar
        </button>
      </header>

      <ol className="log-list" ref={listRef}>
        {logs.length === 0 ? (
          <li className="log-list__empty">Todavía no hay eventos.</li>
        ) : (
          logs.map((entry) => (
            <li key={entry.id} className={`log-entry log-entry--${entry.type}`}>
              <span className="log-entry__time">{entry.time}</span>
              <span className="log-entry__type">{LABELS[entry.type] ?? 'LOG'}</span>
              <span className="log-entry__message">{entry.message}</span>
            </li>
          ))
        )}
      </ol>
    </section>
  )
}
