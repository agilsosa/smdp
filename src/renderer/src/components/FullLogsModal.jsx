import { useState } from 'react'

export default function FullLogsModal({ isOpen, onClose, logs = [], samples = [] }) {
  const [tab, setTab] = useState('events') // 'events' | 'raw'
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopyLogs = () => {
    const text =
      tab === 'events'
        ? logs.map((l) => `[${l.time}] [${l.type}] ${l.message}`).join('\n')
        : samples
            .slice(-100)
            .map((s) => `[${new Date(s.t).toISOString()}] ${s.raw || JSON.stringify(s.data)}`)
            .join('\n')

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ logs, samples: samples.slice(-200) }, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `citynexus_logs_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-dialog--logs" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 className="modal-title">Historial de Operaciones</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-tabs-bar">
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab ${tab === 'events' ? 'modal-tab--active' : ''}`}
              onClick={() => setTab('events')}
            >
              Eventos ({logs.length})
            </button>
            <button
              type="button"
              className={`modal-tab ${tab === 'raw' ? 'modal-tab--active' : ''}`}
              onClick={() => setTab('raw')}
            >
              Tramas serie ({samples.length})
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="ctrl-btn ctrl-btn--secondary" onClick={handleCopyLogs}>
              {copied ? 'Copiado' : 'Copiar al portapapeles'}
            </button>
            <button type="button" className="ctrl-btn ctrl-btn--primary" onClick={handleDownload}>
              Descargar JSON
            </button>
          </div>
        </div>

        <div className="modal-body-scroll">
          {tab === 'events' ? (
            <div className="modal-log-list">
              {logs.length === 0 ? (
                <div className="modal-empty">Sin eventos registrados</div>
              ) : (
                logs
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div key={entry.id} className="modal-log-row">
                      <span className="modal-log-time">{entry.time}</span>
                      <span className={`modal-log-tag modal-log-tag--${entry.type}`}>
                        {entry.type}
                      </span>
                      <span className="modal-log-msg">{entry.message}</span>
                    </div>
                  ))
              )}
            </div>
          ) : (
            <div className="modal-log-list">
              {samples.length === 0 ? (
                <div className="modal-empty">Esperando datos serie del Arduino…</div>
              ) : (
                samples
                  .slice(-100)
                  .reverse()
                  .map((sample, idx) => (
                    <div key={idx} className="modal-log-row">
                      <span className="modal-log-time">
                        {new Date(sample.t).toLocaleTimeString('es-ES', { hour12: false })}
                      </span>
                      <span className="modal-log-tag modal-log-tag--raw">SERIE</span>
                      <pre className="modal-log-raw">
                        {sample.raw || JSON.stringify(sample.data)}
                      </pre>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
