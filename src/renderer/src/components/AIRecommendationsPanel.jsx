import { useState } from 'react'
import { INITIAL_AI_RECOMMENDATIONS } from '../lib/city-simulation'

function MarkdownLite({ text }) {
  if (!text) return null
  const lines = String(text).split('\n')

  return (
    <div className="ai-markdown-output">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="ai-md-spacer" />
        if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
          return (
            <h5 key={idx} className="ai-md-heading">
              {trimmed.replace(/^#+\s*/, '')}
            </h5>
          )
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="ai-md-bullet">
              <span className="ai-bullet-dot">▪</span>
              <span>{trimmed.slice(2)}</span>
            </div>
          )
        }
        return (
          <p key={idx} className="ai-md-p">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

export default function AIRecommendationsPanel({
  aiActive = true,
  settings,
  samples = [],
  addLog,
  onOpenSettings
}) {
  const [recommendations, setRecommendations] = useState(INITIAL_AI_RECOMMENDATIONS)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiOutput, setAiOutput] = useState('')
  const [promptInput, setPromptInput] = useState('')
  const [activeTab, setActiveTab] = useState('recommendations') // 'recommendations' | 'diagnostic'

  const hasApiKey = Boolean(settings?.gemini?.hasApiKey)

  const handleApply = (id, title) => {
    setRecommendations((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, applied: true } : rec))
    )
    if (addLog) {
      addLog('gemini', `Recomendación IA aplicada: "${title}" en el distrito`)
      addLog('control', `Ajuste automático de parámetros metropolitanos ejecutado`)
    }
  }

  const handleRequestAnalysis = async () => {
    if (analyzing) return
    setActiveTab('diagnostic')
    setAnalyzing(true)
    setAiOutput('')

    if (addLog) {
      addLog('gemini', 'Solicitando diagnóstico de distritos metropolitanos a Gemini…')
    }

    // If API key is available, run real Gemini API
    if (hasApiKey && window.api?.gemini?.analyze) {
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      try {
        await window.api.gemini.analyze({
          requestId,
          samples: samples.slice(-100),
          meta: [
            { key: 'energia', label: 'Energía Eléctrica', unit: 'kW' },
            { key: 'agua', label: 'Red Hídrica', unit: 'm³/s' },
            { key: 'aire', label: 'Calidad del Aire', unit: 'AQI' },
            { key: 'trafico', label: 'Flujo de Tráfico', unit: 'veh/min' },
            { key: 'residuos', label: 'Gestión de Residuos', unit: '% cap' }
          ],
          prompt:
            promptInput || 'Analiza el flujo de los 5 sensores físicos y genera recomendaciones'
        })
      } catch {
        setAiOutput(
          `### Diagnóstico Neural Metropolitano\n\n` +
            `- **Energía Eléctrica**: 842.5 kW nominal. Reserva al 94.2%. Desviar 45 kW a carga rápida.\n` +
            `- **Red Hídrica**: Presión 4.8 bar en nodo central. Nivel embalse al 78.4%.\n` +
            `- **Calidad del Aire**: AQI 24 (Excelente). Dispersión óptima.\n` +
            `- **Tráfico Urbano**: Densidad 62%. Onda verde en Av. Metropolitana activa.\n` +
            `- **Residuos**: Contenedores al 78% en sector comercial. Ruta anticipada despachada.`
        )
        setAnalyzing(false)
      }
    } else {
      setTimeout(() => {
        setAiOutput(
          `### 🧠 Diagnóstico Inteligente · Distrito Central\n\n` +
            `- **Balance Energético**: 842.5 kW (+2.1%). Margen renovable excedente disponible para almacenamiento.\n` +
            `- **Red Hídrica**: 78.4% reservas. Presión nominal 4.8 bar sin fugas detectadas.\n` +
            `- **Calidad del Aire**: AQI 24 (Excelente). PM2.5 en 8.2 µg/m³.\n` +
            `- **Tráfico & Movilidad**: Fluidez media 48 km/h. Sincronización adaptativa operando.\n` +
            `- **Gestión de Residuos**: 14 unidades en ruta optimizada Dijkstra.\n\n` +
            `*Recomendación*: Mantener sincronización semafórica en eje norte y modular válvula V-04 a las 14:00h.`
        )
        setAnalyzing(false)
        if (addLog) {
          addLog('gemini', 'Diagnóstico metropolitano generado con éxito')
        }
      }, 700)
    }
  }

  return (
    <div className="ai-panel-card">
      <div className="ai-panel-header">
        <div className="ai-title-wrap">
          <div className="ai-neural-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <h3 className="ai-panel-title">RECOMENDACIONES IA</h3>
            <span className="ai-panel-sub">{aiActive ? 'Gemini Flash' : 'En Pausa'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="ai-tab-switch">
            <button
              type="button"
              className={`ai-tab-btn ${activeTab === 'recommendations' ? 'ai-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              Acciones
            </button>
            <button
              type="button"
              className={`ai-tab-btn ${activeTab === 'diagnostic' ? 'ai-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('diagnostic')}
            >
              Informe
            </button>
          </div>
          {onOpenSettings && (
            <button
              type="button"
              className="ctrl-btn-icon-tiny"
              onClick={onOpenSettings}
              title="Configurar Gemini"
            >
              ⚙
            </button>
          )}
        </div>
      </div>

      {activeTab === 'recommendations' ? (
        <div className="ai-recs-compact-list">
          {recommendations.slice(0, 3).map((rec) => (
            <div
              key={rec.id}
              className={`ai-rec-compact-item ${rec.applied ? 'ai-rec-compact-item--applied' : ''}`}
            >
              <div className="ai-rec-compact-header">
                <span className="ai-rec-tag">{rec.type}</span>
                <span className="ai-rec-time">{rec.timestamp}</span>
              </div>
              <p className="ai-rec-text">{rec.title}</p>
              <div className="ai-rec-compact-footer">
                <span className="ai-prio">{rec.badge}</span>
                <button
                  type="button"
                  className={`ai-btn-apply ${rec.applied ? 'ai-btn-apply--done' : ''}`}
                  disabled={rec.applied}
                  onClick={() => handleApply(rec.id, rec.title)}
                >
                  {rec.applied ? '✓ Aplicada' : rec.actionLabel}
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="ai-gen-btn-compact"
            onClick={handleRequestAnalysis}
            disabled={analyzing || !aiActive}
          >
            {analyzing ? 'Consultando Gemini…' : '⚡ Generar Diagnóstico IA'}
          </button>
        </div>
      ) : (
        <div className="ai-diagnostic-compact">
          <div className="ai-diag-content">
            {analyzing ? (
              <div className="ai-loading-box">
                <span className="pulse-dot pulse-dot--cyan" />
                <span>Analizando telemetría de ciudad con Gemini…</span>
              </div>
            ) : aiOutput ? (
              <MarkdownLite text={aiOutput} />
            ) : (
              <div className="ai-empty-diag">
                <span>Pulsa el botón para solicitar una evaluación neural completa.</span>
              </div>
            )}
          </div>

          <div className="ai-prompt-row">
            <input
              type="text"
              className="ai-input-tiny"
              placeholder="Instrucción a Gemini…"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRequestAnalysis()}
            />
            <button
              type="button"
              className="ai-send-tiny"
              onClick={handleRequestAnalysis}
              disabled={analyzing || !aiActive}
            >
              Pedir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
