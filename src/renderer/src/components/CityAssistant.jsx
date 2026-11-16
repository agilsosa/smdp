import { useEffect, useRef, useState } from 'react'

const SUGGESTIONS = [
  '¿Cuál es la fuente de energía predominante?',
  '¿Es seguro realizar actividades al aire libre?',
  '¿Se requiere activar el riego urbano?',
  '¿Cuál es el estado del tráfico en los dos ejes?'
]

function renderInline(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part !== '')
    .map((part, index) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={index}>{part}</span>
      )
    )
}

function MessageText({ text }) {
  if (!text) {
    return (
      <span className="sc-chat-typing">
        <span />
        <span />
        <span />
      </span>
    )
  }

  return String(text)
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim()

      if (!trimmed) return <div key={index} className="sc-chat-gap" />

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <div key={index} className="sc-chat-bullet">
            <span>•</span>
            <p>{renderInline(trimmed.slice(2))}</p>
          </div>
        )
      }

      if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
        return (
          <h5 key={index} className="sc-chat-heading">
            {renderInline(trimmed.replace(/^#+\s*/, ''))}
          </h5>
        )
      }

      return (
        <p key={index} className="sc-chat-line">
          {renderInline(trimmed)}
        </p>
      )
    })
}

export default function CityAssistant({ messages = [], busy, hasApiKey, onSend, onStop, onClear }) {
  const [draft, setDraft] = useState('')
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, busy])

  const submit = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    onSend(text)
  }

  const pickSuggestion = (suggestion) => {
    if (busy) return
    setDraft('')
    onSend(suggestion)
  }

  return (
    <section className="sc-panel sc-assistant">
      <header className="sc-panel__head">
        <div className="sc-panel__title">
          <div>
            <h3>Asistente de Operaciones</h3>
            <p>Consultas en lenguaje natural con contexto de telemetría</p>
          </div>
        </div>
        <div className="sc-assistant-head__right">
          <span className={`sc-chip ${hasApiKey ? 'sc-chip--ok' : 'sc-chip--warn'}`}>
            {hasApiKey ? 'Gemini conectado' : 'Sin clave API'}
          </span>
          <button type="button" className="sc-mini-btn" onClick={onClear} disabled={busy}>
            Limpiar
          </button>
        </div>
      </header>

      <div className="sc-chat-scroll">
        {messages.length === 0 ? (
          <div className="sc-chat-empty">
            <p className="sc-chat-empty__desc">
              Asistente de operaciones urbanas. Formula preguntas sobre las lecturas de sensores,
              generación de energía, tráfico o recomendaciones ciudadanas.
            </p>
            <div className="sc-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="sc-suggestion"
                  onClick={() => pickSuggestion(suggestion)}
                  disabled={busy}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`sc-chat-msg sc-chat-msg--${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <span className="sc-chat-msg__role">
                  {message.role === 'user' ? 'Operador' : 'Gemini'}
                </span>
                <div className="sc-chat-msg__body">
                  <MessageText text={message.text} />
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </>
        )}
      </div>

      <form className="sc-chat-form" onSubmit={submit}>
        <input
          ref={inputRef}
          type="text"
          className="sc-chat-input"
          placeholder={
            hasApiKey
              ? 'Escribe una consulta sobre la telemetría…'
              : 'Configura una API key para conversar'
          }
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={busy}
        />
        {busy ? (
          <button type="button" className="sc-chat-btn sc-chat-btn--stop" onClick={onStop}>
            Detener
          </button>
        ) : (
          <button type="submit" className="sc-chat-btn" disabled={!draft.trim()}>
            Enviar
          </button>
        )}
      </form>
    </section>
  )
}
