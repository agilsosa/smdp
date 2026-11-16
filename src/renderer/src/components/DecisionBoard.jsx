import { DECISION_ORDER, DECISION_TITLES, decisionLabel } from '../../../shared/city.js'

const SUBTITLES = {
  energia: 'Mayor producción',
  semaforo: 'Tres luces',
  sol: 'Cubierta de edificios',
  temperatura: 'Sensación térmica',
  agua: 'Reserva hídrica',
  poste: 'Alumbrado público'
}

function formatTime(ts) {
  if (!ts) return 'Sin registros'
  return new Date(ts).toLocaleTimeString('es-ES', { hour12: false })
}

export default function DecisionBoard({
  decision,
  deciding,
  autoAnalyze,
  onToggleAuto,
  onAnalyze,
  onOpenAiModal,
  onOpenAiDrawer
}) {
  const decisions = decision?.decisions
  const source = decision?.source
  const isGemini = source === 'gemini'

  return (
    <section className="sc-panel sc-decision-board">
      <header className="sc-decision-head">
        <div className="sc-panel__title">
          <div>
            <h3>Decisiones Operativas</h3>
            <p>Estado del sistema y directivas para la ciudad</p>
          </div>
        </div>

        <div className="sc-decision-actions">
          <span className="sc-decision-time">{formatTime(decision?.ts)}</span>
          <button
            type="button"
            className={`sc-toggle ${autoAnalyze ? 'is-on' : ''}`}
            onClick={onToggleAuto}
            title="Analizar automáticamente al recibir tramas"
          >
            <span className="sc-toggle__knob" />
            Auto-análisis: {autoAnalyze ? 'Activo' : 'Manual'}
          </button>
          <button type="button" className="sc-analyze-btn" onClick={onAnalyze} disabled={deciding}>
            {deciding ? 'Analizando…' : 'Analizar ahora'}
          </button>
        </div>
      </header>

      <div className="sc-decision-grid">
        {DECISION_ORDER.map((key) => {
          const value = decisions?.[key]
          return (
            <div
              key={key}
              className={`sc-decision-card sc-decision-card--${key} ${
                value ? `is-${value}` : 'is-empty'
              }`}
            >
              <div className="sc-decision-card__top">
                <span className="sc-decision-card__title">{DECISION_TITLES[key]}</span>
              </div>
              <strong className="sc-decision-card__value">
                {value ? decisionLabel(key, value) : '—'}
              </strong>
              <span className="sc-decision-card__sub">{SUBTITLES[key]}</span>
            </div>
          )
        })}
      </div>

      {/* Reserved AI Response Container with Independent Scroll & Modal Trigger */}
      <div className="sc-ai-response-box">
        <div className="sc-ai-response-meta">
          <div className="sc-ai-meta-left">
            <span
              className={`sc-source-badge ${
                !decision ? 'is-empty' : isGemini ? 'is-gemini' : 'is-local'
              }`}
            >
              {!decision ? 'SIN DATOS' : isGemini ? 'GEMINI IA' : 'REGLAS LOCALES'}
            </span>
            <span className="sc-decision-model">
              {!decision ? '' : isGemini ? decision.model : 'Lógica determinista'}
            </span>
            {deciding ? <span className="sc-live-dot">Procesando…</span> : null}
          </div>

          <div className="sc-ai-meta-actions">
            {onOpenAiDrawer && (
              <button
                type="button"
                className="sc-expand-btn"
                onClick={onOpenAiDrawer}
                title="Ver recomendaciones en el panel lateral deslizante"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
                <span>Panel lateral</span>
              </button>
            )}

            {onOpenAiModal && (
              <button
                type="button"
                className="sc-expand-btn sc-expand-btn--primary"
                onClick={onOpenAiModal}
                title="Abrir análisis y recomendaciones completas en ventana emergente separada"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                <span>Ventana separada</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Container with Reserved Dimensions */}
        <div className="sc-ai-scroll-content">
          <div className="sc-decision-explain">
            <span className="sc-ai-section-label">Directiva Operativa</span>
            <p>
              {decision?.explanation || 'Esperando lecturas del Arduino para procesar decisiones.'}
            </p>
            {decision?.note ? <span className="sc-decision-note">{decision.note}</span> : null}
          </div>

          <div className="sc-recommendations">
            <span className="sc-recommendations__title">Recomendaciones para la ciudadanía</span>
            {decision?.recommendations?.length ? (
              <ul>
                {decision.recommendations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="sc-recommendations__empty">
                Las recomendaciones se generarán automáticamente al recibir lecturas completas.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
