import { useState } from 'react'

export default function ManualOverrideModal({ isOpen, onClose, addLog }) {
  const [powerPriority, setPowerPriority] = useState('grid')
  const [trafficOverride, setTrafficOverride] = useState(false)
  const [waterPumpBoost, setWaterPumpBoost] = useState(false)
  const [lightingOverride, setLightingOverride] = useState(100)

  if (!isOpen) return null

  const handleApplyOverrides = () => {
    if (addLog) {
      addLog('control', 'MANUAL OVERRIDE: Parámetros municipales actualizados por el operador')
      if (trafficOverride)
        addLog('control', 'MANUAL: Onda verde de emergencia forzada en Corredor Metropolitano')
      if (waterPumpBoost)
        addLog('control', 'MANUAL: Presurización auxiliar de red hídrica activada (+0.6 bar)')
      addLog('control', `MANUAL: Nivel de iluminación pública fijado en ${lightingOverride}%`)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-dialog--override" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="pulse-dot pulse-dot--cyan" />
            <h3 className="modal-title">CONTROL MANUAL</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="override-content">
          <div className="override-warning-banner">
            <span className="override-warning-icon">⚠️</span>
            <div>
              <strong>Control Directo de Actuadores Urbanos</strong>
              <p>Las decisiones automáticas de la IA han sido subordinadas al operador humano.</p>
            </div>
          </div>

          <div className="override-grid">
            <div className="override-item">
              <label className="override-label">Prioridad de Red Eléctrica</label>
              <select
                className="ctrl-select"
                value={powerPriority}
                onChange={(e) => setPowerPriority(e.target.value)}
              >
                <option value="grid">Balance Automático Híbrido</option>
                <option value="solar">Máxima Inyección Fotovoltaica</option>
                <option value="reserve">Carga Forzada de Baterías Urbanas</option>
                <option value="critical">Priorizar Hospitales & Servicios Críticos</option>
              </select>
            </div>

            <div className="override-item">
              <label className="override-label">Onda Verde de Emergencia (Tráfico)</label>
              <button
                type="button"
                className={`ctrl-btn ${trafficOverride ? 'ctrl-btn--primary' : 'ctrl-btn--ghost'}`}
                onClick={() => setTrafficOverride(!trafficOverride)}
              >
                {trafficOverride
                  ? '✓ Onda Verde Activada (Eje Norte-Sur)'
                  : 'Desactivada (Gestión Normal)'}
              </button>
            </div>

            <div className="override-item">
              <label className="override-label">Presurización Auxiliar Bombeo Hídrico</label>
              <button
                type="button"
                className={`ctrl-btn ${waterPumpBoost ? 'ctrl-btn--primary' : 'ctrl-btn--ghost'}`}
                onClick={() => setWaterPumpBoost(!waterPumpBoost)}
              >
                {waterPumpBoost
                  ? '✓ Bombas Auxiliares Conectadas (+0.6 bar)'
                  : 'Bombas en Espera Nominal'}
              </button>
            </div>

            <div className="override-item">
              <label className="override-label">
                Alumbrado Público Inteligente ({lightingOverride}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={lightingOverride}
                onChange={(e) => setLightingOverride(Number(e.target.value))}
                className="override-range"
              />
            </div>
          </div>

          <div className="modal-footer-btns">
            <button type="button" className="ctrl-btn ctrl-btn--secondary" onClick={onClose}>
              Cerrar
            </button>
            <button
              type="button"
              className="ctrl-btn ctrl-btn--primary"
              onClick={handleApplyOverrides}
            >
              Aplicar Parámetros Manuales
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
