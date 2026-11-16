import { useEffect, useRef, useState } from 'react'
import { getSensorMeta } from '../lib/sensors'

function inline(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>
      }
      return <span key={index}>{part}</span>
    })
}

function MarkdownLite({ text }) {
  const lines = String(text).split('\n')
  const blocks = []
  let list = null
  let code = null

  const flushList = () => {
    if (list) {
      blocks.push(list)
      list = null
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      flushList()
      if (code) {
        blocks.push(
          <pre key={`code-${index}`} className="md-code">
            {code.join('\n')}
          </pre>
        )
        code = null
      } else {
        code = []
      }
      return
    }

    if (code) {
      code.push(line)
      return
    }

    if (!trimmed) {
      flushList()
      blocks.push(<div key={`space-${index}`} className="md-spacer" />)
      return
    }

    const heading = trimmed.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      flushList()
      blocks.push(
        <h4 key={`h-${index}`} className="md-heading">
          {inline(heading[1])}
        </h4>
      )
      return
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      if (!list || list.type !== 'ul') {
        flushList()
        list = { type: 'ul', items: [] }
      }
      list.items.push(<li key={`li-${index}`}>{inline(bullet[1])}</li>)
      return
    }

    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/)
    if (numbered) {
      if (!list || list.type !== 'ol') {
        flushList()
        list = { type: 'ol', items: [] }
      }
      list.items.push(<li key={`li-${index}`}>{inline(numbered[1])}</li>)
      return
    }

    flushList()
    blocks.push(
      <p key={`p-${index}`} className="md-paragraph">
        {inline(line)}
      </p>
    )
  })

  flushList()
  if (code) {
    blocks.push(
      <pre key="code-open" className="md-code">
        {code.join('\n')}
      </pre>
    )
  }

  return <div className="md">{blocks}</div>
}

export default function GeminiPanel({ settings, onSettingsChange, samples, sensorKeys, addLog }) {
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [modelDraft, setModelDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const requestIdRef = useRef(null)

  const geminiSettings = settings?.gemini
  const hasKey = Boolean(geminiSettings?.hasApiKey)
  const model = geminiSettings?.model || 'gemini-3.8-flash'
  const modelDraftValue = modelDraft || model

  useEffect(() => {
    const isCurrent = (payload) => payload?.requestId === requestIdRef.current

    const unsubscribe = [
      window.api.gemini.onChunk((payload) => {
        if (!isCurrent(payload)) return
        setOutput((previous) => previous + payload.text)
      }),
      window.api.gemini.onDone((payload) => {
        if (!isCurrent(payload)) return
        setOutput(payload.text || '')
        setAnalyzing(false)
        addLog('gemini', 'Análisis de Gemini completado')
      }),
      window.api.gemini.onError((payload) => {
        if (!isCurrent(payload)) return
        setError(payload.message)
        setAnalyzing(false)
        addLog('error', `Gemini: ${payload.message}`)
      }),
      window.api.gemini.onCancelled((payload) => {
        if (!isCurrent(payload)) return
        if (payload.text) setOutput(payload.text)
        setAnalyzing(false)
        setNotice('Análisis cancelado.')
        addLog('gemini', 'Análisis cancelado por el usuario')
      })
    ]

    return () => unsubscribe.forEach((off) => off())
  }, [addLog])

  const handleAnalyze = async () => {
    if (analyzing) return

    if (samples.length === 0) {
      setError('Todavía no hay lecturas. Conecta el Arduino o inicia el modo demo.')
      return
    }

    if (!hasKey) {
      setShowConfig(true)
      setError('Configura tu API key de Gemini para poder analizar los datos.')
      return
    }

    setError(null)
    setNotice(null)
    setOutput('')
    setAnalyzing(true)

    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    requestIdRef.current = requestId

    try {
      await window.api.gemini.analyze({
        requestId,
        samples: samples.slice(-120),
        meta: sensorKeys.map((key, index) => {
          const info = getSensorMeta(key, index)
          return { key, label: info.label, unit: info.unit }
        }),
        prompt
      })
      addLog('gemini', `Análisis solicitado a ${model}`)
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar el análisis.')
      setAnalyzing(false)
    }
  }

  const handleCancel = async () => {
    if (!requestIdRef.current) return
    await window.api.gemini.cancel(requestIdRef.current)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const patch = { gemini: { model: modelDraftValue.trim() || model } }
      if (keyDraft.trim()) patch.gemini.apiKey = keyDraft.trim()

      const next = await window.api.settings.save(patch)
      onSettingsChange(next)
      setKeyDraft('')
      setNotice('Ajustes de Gemini guardados.')
      addLog('success', 'Ajustes de Gemini guardados')
    } catch (err) {
      setError(err?.message || 'No se pudieron guardar los ajustes.')
    } finally {
      setSaving(false)
    }
  }

  const handleClearKey = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const next = await window.api.settings.save({ gemini: { apiKey: '' } })
      onSettingsChange(next)
      setKeyDraft('')
      setNotice('API key eliminada del equipo.')
      addLog('info', 'API key de Gemini eliminada')
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar la API key.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel gemini-panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Análisis con Gemini</h2>
          <p className="panel__subtitle">Diagnóstico asistido por IA de las últimas lecturas</p>
        </div>

        <div className="gemini-panel__head-actions">
          <span className={`key-badge ${hasKey ? 'key-badge--ok' : 'key-badge--missing'}`}>
            {hasKey ? 'API key lista' : 'Falta API key'}
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setShowConfig((value) => !value)}
          >
            {showConfig ? 'Ocultar ajustes' : 'Ajustes'}
          </button>
        </div>
      </header>

      {showConfig ? (
        <div className="gemini-config">
          <div className="field">
            <label htmlFor="gemini-key">API key de Google AI Studio</label>
            <input
              id="gemini-key"
              type="password"
              className="input"
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
              placeholder={hasKey ? '•••••••••••• (ya configurada)' : 'Pega aquí tu API key'}
              autoComplete="off"
              spellCheck="false"
            />
            <p className="hint">
              Se guarda solo en este equipo (archivo local con permisos restringidos). También
              puedes definir <code>GEMINI_API_KEY</code> en el archivo <code>.env</code>.
              {geminiSettings?.hasEnvApiKey ? ' Se detectó una clave en el entorno.' : ''}
            </p>
          </div>

          <div className="field">
            <label htmlFor="gemini-model">Modelo</label>
            <input
              id="gemini-model"
              type="text"
              className="input"
              value={modelDraftValue}
              onChange={(event) => setModelDraft(event.target.value)}
              placeholder="gemini-3.8-flash"
              spellCheck="false"
            />
          </div>

          <div className="gemini-config__actions">
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar ajustes'}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={handleClearKey}
              disabled={saving || !geminiSettings?.hasApiKey || geminiSettings?.hasEnvApiKey}
              title={
                geminiSettings?.hasEnvApiKey
                  ? 'La clave proviene de una variable de entorno'
                  : 'Eliminar la clave guardada'
              }
            >
              Borrar clave guardada
            </button>
          </div>
        </div>
      ) : null}

      <div className="gemini-panel__body">
        <div className="gemini-panel__ask">
          <div className="field">
            <label htmlFor="gemini-prompt">Petición adicional (opcional)</label>
            <textarea
              id="gemini-prompt"
              className="textarea"
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ej.: ¿hay riesgo de sequía? ¿qué sensor muestra un comportamiento extraño?"
              disabled={analyzing}
            />
          </div>

          <div className="gemini-panel__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleAnalyze}
              disabled={analyzing || !hasKey || samples.length === 0}
            >
              {analyzing ? 'Analizando…' : 'Analizar lecturas'}
            </button>

            {analyzing ? (
              <button type="button" className="btn btn--danger btn--small" onClick={handleCancel}>
                Cancelar
              </button>
            ) : null}

            <span className="gemini-panel__meta">
              {samples.length > 0
                ? `${Math.min(samples.length, 120)} lecturas · ${model}`
                : 'Sin lecturas todavía'}
            </span>
          </div>

          {error ? <p className="alert alert--error">{error}</p> : null}
          {notice ? <p className="alert alert--info">{notice}</p> : null}

          {!hasKey ? (
            <p className="hint">
              Consigue una API key gratuita en{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                Google AI Studio
              </a>{' '}
              y pégala en los ajustes. La clave nunca se envía al renderer.
            </p>
          ) : null}
        </div>

        <div className="gemini-panel__result">
          <div className="gemini-panel__result-head">
            <span>Respuesta</span>
            {analyzing ? <span className="streaming">Generando…</span> : null}
          </div>

          <div className="gemini-output">
            {output ? (
              <MarkdownLite text={output} />
            ) : (
              <p className="gemini-output__empty">
                La respuesta de Gemini aparecerá aquí. Se envía un resumen estadístico de las
                últimas lecturas, no los datos en bruto del puerto.
              </p>
            )}
            {analyzing ? <span className="streaming-cursor" aria-hidden="true" /> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
