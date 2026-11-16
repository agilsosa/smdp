import { useState } from 'react'
import { DECISION_ORDER, DECISION_TITLES, decisionLabel } from '../../../shared/city.js'

export default function AiReportModal({ isOpen, onClose, decision, deciding, onAnalyze }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const decisions = decision?.decisions
  const source = decision?.source
  const isGemini = source === 'gemini'

  const handleCopy = async () => {
    try {
      const lines = [
        `=== INFORME URBANO GEMINI IA (${new Date(decision?.ts || Date.now()).toLocaleString('es-ES')}) ===`,
        `Modelo: ${decision?.model || (isGemini ? 'Gemini IA' : 'Reglas locales')}`,
        '',
        '--- DIRECTIVAS OPERATIVAS ---',
        DECISION_ORDER.map(
          (k) => `${DECISION_TITLES[k]}: ${decisions?.[k] ? decisionLabel(k, decisions[k]) : '—'}`
        ).join('\n'),
        '',
        '--- DIAGNÓSTICO URBANO ---',
        decision?.explanation || 'Sin explicación registrada.',
        '',
        '--- RECOMENDACIONES PARA LA CIUDADANÍA ---',
        decision?.recommendations?.length
          ? decision.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')
          : 'Sin recomendaciones.'
      ].join('\n')

      await navigator.clipboard.writeText(lines)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog--ai-report"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-report-title"
      >
        <header className="modal-header">
          <div className="modal-title-group">
            <h3 id="ai-report-title" className="modal-title">
              Directivas & Recomendaciones Ciudadanas
            </h3>
            <span
              className={`sc-source-badge ${
                !decision ? 'is-empty' : isGemini ? 'is-gemini' : 'is-local'
              }`}
            >
              {!decision ? 'SIN DATOS' : isGemini ? 'GEMINI IA' : 'REGLAS LOCALES'}
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            ✕
          </button>
        </header>

        <div className="ai-report-modal-body">
          {/* Active Decisions Chips Row */}
          <section className="ai-report-section">
            <span className="ai-report-section__title">Decisiones Operativas Activas</span>
            <div className="ai-report-decisions-grid">
              {DECISION_ORDER.map((key) => {
                const val = decisions?.[key]
                return (
                  <div key={key} className="ai-report-pill">
                    <span className="ai-report-pill__label">{DECISION_TITLES[key]}</span>
                    <strong className="ai-report-pill__val">
                      {val ? decisionLabel(key, val) : '—'}
                    </strong>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Explanation Section */}
          <section className="ai-report-section">
            <div className="ai-report-section__head">
              <span className="ai-report-section__title">Diagnóstico y Razonamiento Urbano</span>
              <span className="sc-decision-model">
                {isGemini ? decision?.model : 'Lógica determinista'}
              </span>
            </div>
            <div className="ai-report-box">
              <p className="ai-report-text">
                {decision?.explanation ||
                  'No hay un diagnóstico registrado aún. Ejecuta un análisis para evaluar las lecturas de los sensores.'}
              </p>
              {decision?.note ? <p className="sc-decision-note">{decision.note}</p> : null}
            </div>
          </section>

          {/* Citizen Recommendations Section */}
          <section className="ai-report-section">
            <span className="ai-report-section__title">Recomendaciones para la Ciudadanía</span>
            {decision?.recommendations?.length ? (
              <div className="ai-report-cards-list">
                {decision.recommendations.map((item, index) => (
                  <div key={index} className="ai-recommendation-card">
                    <span className="ai-recommendation-card__idx">{index + 1}</span>
                    <p className="ai-recommendation-card__text">{item}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ai-report-box ai-report-box--empty">
                <p>
                  No se han generado recomendaciones ciudadanas todavía. El sistema las elaborará
                  automáticamente con las próximas tramas del Arduino.
                </p>
              </div>
            )}
          </section>
        </div>

        <footer className="modal-actions ai-report-actions">
          <div className="ai-report-actions__left">
            {onAnalyze && (
              <button
                type="button"
                className="sc-analyze-btn"
                onClick={onAnalyze}
                disabled={deciding}
              >
                {deciding ? 'Analizando…' : 'Reanalizar ahora'}
              </button>
            )}
            <button type="button" className="sc-mini-btn" onClick={handleCopy}>
              {copied ? 'Copiado al portapapeles' : 'Copiar informe'}
            </button>
          </div>
          <button type="button" className="titlebar-btn" onClick={onClose}>
            Cerrar ventana
          </button>
        </footer>
      </div>
    </div>
  )
}
