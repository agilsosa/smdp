import { useState } from 'react'

export default function RightControlColumn({
  arduinoStatus,
  ports = [],
  selectedPort,
  baudRate,
  busy,
  onSelectPort,
  onBaudRate,
  onRefreshPorts,
  onConnect,
  onDisconnect,
  onToggleDemo,
  aiActive,
  onToggleAi,
  settings,
  onOpenSettings,
  manualOverride,
  onToggleManualOverride,
  onResetSystem,
  onOpenLogs
}) {
  const isOnline = arduinoStatus?.state === 'connected' || arduinoStatus?.state === 'demo'
  const isDemo = arduinoStatus?.state === 'demo'
  const isConnected = arduinoStatus?.state === 'connected'
  const hasApiKey = Boolean(settings?.gemini?.hasApiKey)

  const [confirmReset, setConfirmReset] = useState(false)

  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
    } else {
      setConfirmReset(false)
      onResetSystem()
    }
  }

  return (
    <div className="right-ctrl-column">
      {/* 1. Hardware Connection Card */}
      <div className="ctrl-card ctrl-card--arduino">
        <div className="ctrl-card__head">
          <div className="ctrl-card__title-group">
            <h4 className="ctrl-card__title">Puerto Serie</h4>
          </div>

          <span
            className={`status-chip ${isOnline ? 'status-chip--online' : 'status-chip--offline'}`}
          >
            <span className={`status-dot ${isOnline ? 'status-dot--ok' : 'status-dot--offline'}`} />
            {isOnline ? (isDemo ? 'Modo Demo' : 'En línea') : 'Sin conexión'}
          </span>
        </div>

        {/* Status text */}
        <div className="serial-status-banner">
          <span className="serial-status-text">
            {isOnline
              ? isDemo
                ? 'Generación simulada de telemetría activa'
                : `Conectado a ${selectedPort || 'puerto'} (${baudRate} baud)`
              : 'Selecciona un puerto para iniciar la lectura'}
          </span>
        </div>

        {/* Serial Port & Baud controls */}
        <div className="ctrl-compact-row">
          <select
            id="port-select"
            className="ctrl-select ctrl-select--port"
            value={selectedPort}
            onChange={(e) => onSelectPort(e.target.value)}
            disabled={busy || isConnected || isDemo}
          >
            {ports.length === 0 ? <option value="">Sin puertos</option> : null}
            {ports.map((p) => (
              <option key={p.path} value={p.path}>
                {p.path}
              </option>
            ))}
            {selectedPort && !ports.some((p) => p.path === selectedPort) ? (
              <option value={selectedPort}>{selectedPort}</option>
            ) : null}
          </select>

          <select
            id="baud-select"
            className="ctrl-select ctrl-select--baud"
            value={baudRate}
            onChange={(e) => onBaudRate(Number(e.target.value))}
            disabled={busy || isConnected || isDemo}
          >
            {[9600, 19200, 57600, 115200].map((rate) => (
              <option key={rate} value={rate}>
                {rate} baud
              </option>
            ))}
          </select>

          <button
            type="button"
            className="ctrl-btn-icon-tiny"
            onClick={onRefreshPorts}
            disabled={busy}
            title="Refrescar lista de puertos"
          >
            ↻
          </button>
        </div>

        {/* Connect & Demo Actions */}
        <div className="ctrl-btn-row">
          {isConnected ? (
            <button
              type="button"
              className="ctrl-btn ctrl-btn--danger"
              onClick={onDisconnect}
              disabled={busy}
            >
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              className="ctrl-btn ctrl-btn--primary"
              onClick={onConnect}
              disabled={busy || !selectedPort || isDemo}
            >
              {busy ? 'Conectando…' : 'Conectar'}
            </button>
          )}

          <button
            type="button"
            className={`ctrl-btn ${isDemo ? 'ctrl-btn--active-demo' : 'ctrl-btn--secondary'}`}
            onClick={onToggleDemo}
            disabled={busy || isConnected}
          >
            {isDemo ? 'Detener Demo' : 'Modo Demo'}
          </button>
        </div>
      </div>

      {/* 2. AI Model Status Card */}
      <div className="ctrl-card ctrl-card--ai">
        <div className="ctrl-card__head">
          <div className="ctrl-card__title-group">
            <h4 className="ctrl-card__title">Servicio Gemini</h4>
          </div>

          <span
            className={`status-chip ${aiActive ? 'status-chip--ai-on' : 'status-chip--ai-off'}`}
          >
            <span className={`status-dot ${aiActive ? 'status-dot--ok' : 'status-dot--offline'}`} />
            {aiActive ? 'Activo' : 'En pausa'}
          </span>
        </div>

        <div className="ai-status-compact-row">
          <span className="ai-badge-model">{settings?.gemini?.model || 'gemini-3.8-flash'}</span>
          <span className={`ai-key-pill ${hasApiKey ? 'ai-key-pill--ok' : 'ai-key-pill--warn'}`}>
            {hasApiKey ? 'API Key configurada' : 'Sin clave API'}
          </span>
        </div>

        <div className="ctrl-btn-row">
          <button
            type="button"
            className={`ctrl-btn ${aiActive ? 'ctrl-btn--secondary' : 'ctrl-btn--primary'}`}
            onClick={onToggleAi}
          >
            {aiActive ? 'Pausar IA' : 'Activar IA'}
          </button>
          <button type="button" className="ctrl-btn ctrl-btn--secondary" onClick={onOpenSettings}>
            Configuración
          </button>
        </div>
      </div>

      {/* 3. Quick Control Actions */}
      <div className="ctrl-card ctrl-card--actions">
        <div className="ctrl-card__head">
          <h4 className="ctrl-card__title">Acciones de Control</h4>
        </div>

        <div className="quick-actions-compact">
          {/* Action 1: Manual Override */}
          <button
            type="button"
            className={`quick-compact-btn ${manualOverride ? 'quick-compact-btn--override-on' : ''}`}
            onClick={onToggleManualOverride}
          >
            <div className="quick-compact-info">
              <span className="quick-compact-name">Control manual</span>
              <span className="quick-compact-desc">
                {manualOverride ? 'Operador asigna decisiones' : 'Decisiones automáticas por IA'}
              </span>
            </div>
            <span className="quick-compact-pill">{manualOverride ? 'Activo' : 'Inactivo'}</span>
          </button>

          {/* Action 2: Reset */}
          <button
            type="button"
            className={`quick-compact-btn ${confirmReset ? 'quick-compact-btn--confirm' : ''}`}
            onClick={handleResetClick}
          >
            <div className="quick-compact-info">
              <span className="quick-compact-name">Reiniciar lecturas</span>
              <span className="quick-compact-desc">
                {confirmReset
                  ? 'Pulsa de nuevo para confirmar'
                  : 'Borrar tramas y decisiones actuales'}
              </span>
            </div>
            <span className="quick-compact-pill">{confirmReset ? 'Confirmar' : 'Limpiar'}</span>
          </button>

          {/* Action 3: Logs */}
          <button type="button" className="quick-compact-btn" onClick={onOpenLogs}>
            <div className="quick-compact-info">
              <span className="quick-compact-name">Registro de tramas</span>
              <span className="quick-compact-desc">Inspección de tramas serie y eventos</span>
            </div>
            <span className="quick-compact-pill">Abrir</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="grid-health-compact">
        <span>Estado del enlace</span>
        <span className="grid-health-stat">{isOnline ? 'En línea' : 'Desconectado'}</span>
      </div>
    </div>
  )
}
