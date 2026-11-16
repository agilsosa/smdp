import { useEffect, useState } from 'react'

export default function ArduinoOutputPanel({
  decision,
  sendInfo,
  autoSend,
  onToggleAutoSend,
  onSend,
  connected
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])

  const payload = decision?.payload || 'Esperando decisiones para formatear salida…'
  const status = sendInfo
    ? sendInfo.sent
      ? sendInfo.simulated
        ? `Simulado (${new Date(sendInfo.at).toLocaleTimeString('es-ES', { hour12: false })})`
        : `Transmitido (${new Date(sendInfo.at).toLocaleTimeString('es-ES', { hour12: false })})`
      : `No enviado: ${sendInfo.reason || 'sin conexión'}`
    : 'Pendiente de envío'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="sc-panel sc-output">
      <header className="sc-panel__head">
        <div className="sc-panel__title">
          <div>
            <h3>Salida hacia Arduino</h3>
            <p>Comandos serie según decisiones</p>
          </div>
        </div>
        <span className={`sc-chip ${connected ? 'sc-chip--ok' : 'sc-chip--warn'}`}>
          {connected ? 'Canal serie listo' : 'Enlace desconectado'}
        </span>
      </header>

      <pre className="sc-output-code">{payload}</pre>

      <div className="sc-output-foot">
        <span
          className={`sc-output-status ${sendInfo?.sent ? 'is-sent' : sendInfo ? 'is-error' : ''}`}
        >
          {status}
        </span>

        <label className="sc-output-auto">
          <input type="checkbox" checked={autoSend} onChange={onToggleAutoSend} />
          <span>Auto-enviar</span>
        </label>

        <button type="button" className="sc-mini-btn" onClick={copy}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>

        <button
          type="button"
          className="ctrl-btn ctrl-btn--primary ctrl-btn--compact"
          onClick={onSend}
          disabled={!decision?.payload}
        >
          Enviar ahora
        </button>
      </div>
    </section>
  )
}
