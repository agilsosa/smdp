import { useState } from 'react'
import { DECISION_ORDER, DECISION_TITLES, decisionLabel } from '../../../shared/city.js'

export default function AiReportDrawer({ decision, deciding, onAnalyze }) {
  const [copied, setCopied] = useState(false)

  const decisions = decision?.decisions
  const source = decision?.source
  const isGemini = source === 'gemini'

  const handleCopy = async () => {
    try {
      const text = [
        `INFORME GEMINI IA · ${new Date(decision?.ts || Date.now()).toLocaleTimeString('es-ES')}`,
        `Explicación: ${decision?.explanation || 'Sin explicación'}`,
        'Recomendaciones:',
        ...(decision?.recommendations || []).map((r, i) => `${i + 1}. ${r}`)
      ].join('\n')

      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="drawer-ai-report">
      <div className="drawer-ai-report__header">
        <div className="sc-decision-explain__meta">
          <span
            className={`sc-source-badge ${
              !decision ? 'is-empty' : isGemini ? 'is-gemini' : 'is-local'
            }`}
          >
            {!decision ? 'SIN DATOS' : isGemini ? 'GEMINI IA' : 'REGLAS LOCALES'}
          </span>
          <span className="sc-decision-model">
            {isGemini ? decision?.model : 'Lógica determinista'}
          </span>
          {deciding ? <span className="sc-live-dot">Procesando…</span> : null}
        </div>

        <div className="drawer-ai-report__actions">
          {onAnalyze && (
            <button
              type="button"
              className="sc-analyze-btn"
              onClick={onAnalyze}
              disabled={deciding}
            >
              {deciding ? 'Analizando…' : 'Analizar'}
            </button>
          )}
          <button type="button" className="sc-mini-btn" onClick={handleCopy}>
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Decisions Summary Cards */}
      <div className="drawer-ai-decisions-grid">
        {DECISION_ORDER.map((k) => {
          const val = decisions?.[k]
          return (
            <div key={k} className="drawer-ai-decision-card">
              <span className="drawer-ai-decision-card__label">{DECISION_TITLES[k]}</span>
              <strong className="drawer-ai-decision-card__val">
                {val ? decisionLabel(k, val) : '—'}
              </strong>
            </div>
          )
        })}
      </div>

      {/* Urban Diagnostic */}
      <div className="drawer-ai-card">
        <span className="drawer-ai-card__title">Diagnóstico y Razonamiento Urbano</span>
        <p className="drawer-ai-card__text">
          {decision?.explanation ||
            'Esperando recepción de datos del Arduino para elaborar un diagnóstico completo.'}
        </p>
        {decision?.note ? <span className="sc-decision-note">{decision.note}</span> : null}
      </div>

      {/* Citizen Recommendations */}
      <div className="drawer-ai-card">
        <span className="drawer-ai-card__title">Recomendaciones para la Ciudadanía</span>
        {decision?.recommendations?.length ? (
          <ul className="drawer-ai-list">
            {decision.recommendations.map((item, idx) => (
              <li key={idx} className="drawer-ai-list__item">
                <span className="drawer-ai-list__num">{idx + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="drawer-ai-card__empty">
            Sin recomendaciones generadas en este momento. Se actualizarán con nuevas lecturas.
          </p>
        )}
      </div>
    </div>
  )
}
