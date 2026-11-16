import { useMemo, useState } from 'react'

export default function SystemActivityLog({ logs = [], onClear, onOpenFullLogs }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const filteredLogs = useMemo(() => {
    return logs
      .filter((entry) => {
        if (filter === 'all') return true
        if (filter === 'arduino') return entry.type === 'arduino' || entry.type === 'serial'
        if (filter === 'gemini')
          return entry.type === 'gemini' || entry.type === 'ai' || entry.type === 'local'
        if (filter === 'control') return entry.type === 'control' || entry.type === 'override'
        if (filter === 'error') return entry.type === 'error'
        return true
      })
      .filter((entry) => {
        if (!query.trim()) return true
        return entry.message.toLowerCase().includes(query.toLowerCase())
      })
  }, [logs, filter, query])

  const getBadgeClass = (type) => {
    switch (type) {
      case 'arduino':
      case 'serial':
        return 'log-badge log-badge--arduino'
      case 'gemini':
      case 'ai':
        return 'log-badge log-badge--gemini'
      case 'local':
        return 'log-badge log-badge--local'
      case 'control':
      case 'override':
        return 'log-badge log-badge--control'
      case 'error':
        return 'log-badge log-badge--error'
      case 'success':
        return 'log-badge log-badge--success'
      default:
        return 'log-badge log-badge--info'
    }
  }

  const getSourceLabel = (type) => {
    switch (type) {
      case 'arduino':
      case 'serial':
        return 'Arduino'
      case 'gemini':
      case 'ai':
        return 'Gemini'
      case 'local':
        return 'Local'
      case 'control':
      case 'override':
        return 'Control'
      case 'error':
        return 'Alerta'
      default:
        return 'Sistema'
    }
  }

  return (
    <div className="system-log-panel">
      <div className="system-log-header">
        <div className="log-title-block">
          <h4 className="system-log-title">Registro de Actividad</h4>
        </div>

        {/* Filter Controls & Search */}
        <div className="system-log-actions">
          <div className="log-filter-chips">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'arduino', label: 'Arduino' },
              { id: 'gemini', label: 'Gemini' },
              { id: 'control', label: 'Control' },
              { id: 'error', label: 'Alertas' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`log-chip ${filter === f.id ? 'log-chip--active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="log-search-wrap">
            <input
              type="text"
              className="log-search-input"
              placeholder="Buscar en el registro…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="log-btn log-btn--ghost"
            onClick={onClear}
            title="Limpiar registro actual"
          >
            Limpiar
          </button>

          <button
            type="button"
            className="log-btn log-btn--secondary"
            onClick={onOpenFullLogs}
            title="Abrir historial completo"
          >
            Historial
          </button>
        </div>
      </div>

      {/* Log Entries Container */}
      <div className="system-log-scroll">
        {filteredLogs.length === 0 ? (
          <div className="log-empty-state">
            <span className="log-empty-text">
              No hay eventos registrados para el filtro seleccionado
            </span>
          </div>
        ) : (
          <div className="log-entries-list">
            {filteredLogs
              .slice(-100)
              .reverse()
              .map((entry) => (
                <div key={entry.id} className="log-entry-row">
                  <span className="log-entry-time">{entry.time}</span>
                  <span className={getBadgeClass(entry.type)}>{getSourceLabel(entry.type)}</span>
                  <span className="log-entry-message">{entry.message}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
