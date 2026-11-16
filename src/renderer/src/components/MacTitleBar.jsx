import { useEffect, useState } from 'react'

export default function MacTitleBar({
  arduinoStatus,
  aiActive,
  manualOverride,
  activeDrawer,
  onToggleDrawer,
  onOpenSettings,
  onToggleFullscreen
}) {
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimeStr(
        now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      )
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const isArduinoOnline = arduinoStatus?.state === 'connected' || arduinoStatus?.state === 'demo'

  return (
    <header className="mac-titlebar">
      {/* Brand */}
      <div className="city-brand">
        <span className="city-brand__symbol" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18M6 21V7l7-4v18M13 10h4v11M10 8h.01M10 12h.01M10 16h.01M16 13h.01M16 17h.01" />
          </svg>
        </span>
        <div className="city-brand__titles">
          <span className="city-brand__main">CityNexus</span>
          <span className="city-brand__sub">Operaciones Urbanas</span>
        </div>
      </div>

      {/* Status Badges & Drawer Trigger Buttons */}
      <div className="mac-titlebar__right">
        {manualOverride && (
          <span className="status-pill status-pill--override" title="Control manual habilitado">
            <span className="status-dot status-dot--warn" />
            Manual
          </span>
        )}

        <span
          className={`status-pill ${isArduinoOnline ? 'status-pill--online' : 'status-pill--offline'}`}
          title={arduinoStatus?.message || 'Estado Arduino'}
        >
          <span
            className={`status-dot ${isArduinoOnline ? 'status-dot--ok' : 'status-dot--offline'}`}
          />
          {isArduinoOnline
            ? arduinoStatus.state === 'demo'
              ? 'Arduino (Demo)'
              : 'Arduino conectado'
            : 'Arduino desconectado'}
        </span>

        <span
          className={`status-pill ${aiActive ? 'status-pill--ai-active' : 'status-pill--ai-inactive'}`}
          title="Estado del servicio de IA Gemini"
        >
          <span className={`status-dot ${aiActive ? 'status-dot--ok' : 'status-dot--offline'}`} />
          {aiActive ? 'Gemini activo' : 'Gemini pausado'}
        </span>

        <span className="status-pill status-pill--clock" title="Hora local del sistema">
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: 6 }}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {timeStr || '--:--:--'}
        </span>

        {/* Sliding Panel Actions */}
        <div className="titlebar-drawer-actions">
          <button
            type="button"
            className={`titlebar-btn ${activeDrawer === 'chat' ? 'is-active' : ''}`}
            onClick={() => onToggleDrawer('chat')}
            title="Abrir asistente de operaciones Gemini"
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Asistente IA</span>
          </button>

          <button
            type="button"
            className={`titlebar-btn ${activeDrawer === 'controls' ? 'is-active' : ''}`}
            onClick={() => onToggleDrawer('controls')}
            title="Abrir panel de control de hardware y registros"
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <span>Control & Logs</span>
          </button>

          <button
            type="button"
            className="titlebar-btn titlebar-btn--icon"
            onClick={onOpenSettings}
            title="Configuración de Gemini IA"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            type="button"
            className="titlebar-btn titlebar-btn--icon"
            onClick={onToggleFullscreen}
            title="Alternar pantalla completa"
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
