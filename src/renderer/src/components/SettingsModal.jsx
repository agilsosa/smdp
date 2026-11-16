import { useState } from 'react'

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(settings?.gemini?.model || 'gemini-3.8-flash')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const patch = {
        gemini: {
          model
        }
      }
      if (apiKey.trim()) {
        patch.gemini.apiKey = apiKey.trim()
      }

      const next = await window.api.settings.save(patch)
      if (onSaveSettings) onSaveSettings(next)
      setMessage('Ajustes guardados correctamente.')
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-dialog--settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 className="modal-title">Configuración de Gemini IA</h3>
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

        <form onSubmit={handleSave} className="modal-form">
          <div className="modal-field">
            <label className="modal-label">Clave API de Google Gemini</label>
            <input
              type="password"
              className="ctrl-select"
              placeholder={
                settings?.gemini?.hasApiKey ? '•••••••••••••••• (clave configurada)' : 'AIzaSy…'
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <span className="modal-hint">
              {settings?.gemini?.hasApiKey
                ? 'Ya existe una clave configurada. Déjala en blanco para mantener la actual.'
                : 'Introduce tu API key de Google AI Studio para habilitar el análisis de decisiones.'}
            </span>
          </div>

          <div className="modal-field">
            <label className="modal-label">Modelo de lenguaje</label>
            <select
              className="ctrl-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="gemini-3.8-flash">
                gemini-3.8-flash (Recomendado para telemetría)
              </option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Razonamiento extendido)</option>
            </select>
          </div>

          {message && <div className="modal-msg">{message}</div>}

          <div className="modal-footer-btns">
            <button type="button" className="ctrl-btn ctrl-btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="ctrl-btn ctrl-btn--primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar ajustes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
