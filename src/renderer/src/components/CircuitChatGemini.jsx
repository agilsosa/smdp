import { useEffect, useRef, useState } from 'react'

function MarkdownLite({ text }) {
  if (!text) return null
  const lines = String(text).split('\n')
  const blocks = []
  let codeBlock = null

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (codeBlock) {
        blocks.push(
          <pre key={`code-${idx}`} className="chat-code-block">
            <code>{codeBlock.join('\n')}</code>
          </pre>
        )
        codeBlock = null
      } else {
        codeBlock = []
      }
      return
    }

    if (codeBlock) {
      codeBlock.push(line)
      return
    }

    if (!trimmed) {
      blocks.push(<div key={`sp-${idx}`} className="chat-spacer" />)
      return
    }

    if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
      blocks.push(
        <h5 key={`h-${idx}`} className="chat-heading">
          {trimmed.replace(/^#+\s*/, '')}
        </h5>
      )
      return
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push(
        <div key={`b-${idx}`} className="chat-bullet">
          <span className="chat-bullet-dot">▪</span>
          <span>{trimmed.slice(2)}</span>
        </div>
      )
      return
    }

    blocks.push(
      <p key={`p-${idx}`} className="chat-text">
        {line}
      </p>
    )
  })

  if (codeBlock) {
    blocks.push(
      <pre key="code-unclosed" className="chat-code-block">
        <code>{codeBlock.join('\n')}</code>
      </pre>
    )
  }

  return <div className="chat-markdown-body">{blocks}</div>
}

export default function CircuitChatGemini({
  aiActive = true,
  settings,
  samples = [],
  addLog,
  onOpenSettings
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'gemini',
      time: 'Ahora',
      text: '¡Hola! Soy tu asistente de ingeniería CityNexus. Puedo ayudarte a resolver problemas con tu circuito electrónico, pines del Arduino, ruido en señales o calibración de sensores.\n\n¿Qué problema o duda tienes con tu circuito?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const currentReqIdRef = useRef(null)
  const scrollRef = useRef(null)

  const hasApiKey = Boolean(settings?.gemini?.hasApiKey)

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Subscribe to Gemini streaming events
  useEffect(() => {
    if (!window.api?.gemini) return

    const offChunk = window.api.gemini.onChunk((payload) => {
      if (payload?.requestId !== currentReqIdRef.current) return
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.id === payload.requestId) {
          return [...prev.slice(0, -1), { ...last, text: last.text + payload.text }]
        }
        return [
          ...prev,
          {
            id: payload.requestId,
            sender: 'gemini',
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            text: payload.text
          }
        ]
      })
    })

    const offDone = window.api.gemini.onDone((payload) => {
      if (payload?.requestId !== currentReqIdRef.current) return
      setLoading(false)
      if (addLog) addLog('gemini', 'Respuesta de diagnóstico completada por Gemini')
    })

    const offError = window.api.gemini.onError((payload) => {
      if (payload?.requestId !== currentReqIdRef.current) return
      setLoading(false)
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'gemini',
          time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ **Aviso de Gemini**: ${payload.message}`
        }
      ])
      if (addLog) addLog('error', `Error en Gemini: ${payload.message}`)
    })

    return () => {
      offChunk()
      offDone()
      offError()
    }
  }, [addLog])

  const handleSend = async (customText) => {
    const textToSend = String(customText || input).trim()
    if (!textToSend || loading) return

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      text: textToSend
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const reqId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    currentReqIdRef.current = reqId

    if (addLog) addLog('gemini', `Consulta de circuito enviada: "${textToSend.slice(0, 45)}…"`)

    if (hasApiKey && window.api?.gemini?.analyze) {
      try {
        await window.api.gemini.analyze({
          requestId: reqId,
          samples: samples.slice(-60),
          meta: [
            { key: 'energia', label: 'Energía', unit: 'kW' },
            { key: 'agua', label: 'Agua', unit: '%' },
            { key: 'aire', label: 'Aire', unit: 'AQI' },
            { key: 'trafico', label: 'Tráfico', unit: '%' },
            { key: 'residuos', label: 'Residuos', unit: '%' }
          ],
          prompt: textToSend
        })
      } catch (err) {
        setLoading(false)
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'gemini',
            time: 'Ahora',
            text: `⚠️ Error de comunicación: ${err.message}`
          }
        ])
      }
    } else {
      // Intelligent circuit diagnosis simulation
      setTimeout(() => {
        let answer = ''
        const lower = textToSend.toLowerCase()

        if (lower.includes('ruido') || lower.includes('fluctua') || lower.includes('inestable')) {
          answer =
            '### 📉 Diagnóstico: Ruido en Señal Analógica\n\n' +
            'Las lecturas inestables o con fluctuaciones bruscas en pines analógicos de Arduino suelen deberse a:\n' +
            '1. **Falta de capacitor de desacoplo**: Conecta un condensador cerámico de **100 nF (0.1 µF)** entre el pin analógico del sensor y GND.\n' +
            '2. **Masa (GND) no compartida**: Asegúrate de que el GND del sensor y el GND del Arduino estén conectados en el mismo riel.\n' +
            '3. **Líneas largas sin apantallar**: Si los cables son largos, inducen ruido electromagnético. Usa par trenzado.\n' +
            '4. **Filtro por software**: Puedes promediar 10 lecturas consecutivas en tu sketch:' +
            '\n```cpp\nint leerFiltrado(int pin) {\n  long suma = 0;\n  for(int i = 0; i < 10; i++) {\n    suma += analogRead(pin);\n    delay(5);\n  }\n  return suma / 10;\n}\n```'
        } else if (lower.includes('agua') || lower.includes('humedad') || lower.includes('nivel')) {
          answer =
            '### 💧 Conexión y Calibración de Sensores de Agua y Humedad\n\n' +
            '- **Nivel de agua (A5)**: VCC a 5V, GND común y señal AO a **A5**.\n' +
            '- **Temperatura/humedad (A1)**: si usas un DHT11/DHT22, conecta DATA a **A1** con una resistencia pull-up de 10 kΩ a 5V.\n\n' +
            '**Recomendación de calibración**:\n' +
            '- Nivel de agua: ajusta `WATER_EMPTY_RAW` y `WATER_FULL_RAW` en el sketch según tu sensor.\n' +
            '- Humedad: el sketch intenta DHT en A1 y, si no responde, usa un TMP36 analógico.\n' +
            '- Evita sumergir la electrónica; usa solo la sonda impermeable.'
        } else if (lower.includes('pin') || lower.includes('conexion') || lower.includes('gnd')) {
          answer =
            '### 🔌 Verificación de Pines y Alimentación\n\n' +
            '- **Pines Analógicos (A0 - A5, y A6/A7 en Nano)**: Solo toleran de **0V a 5V**. No apliques voltajes mayores o quemarás el canal ADC del ATmega328P.\n' +
            '- **Pin Flotante**: Si un pin analógico no tiene conexión fija, flotará y marcará números aleatorios. Agrega una resistencia pull-down de 10kΩ a GND si es necesario.\n' +
            '- **Alimentación**: Si usas varios sensores a 5V, verifica con multímetro que el rail no caiga por debajo de 4.7V.'
        } else {
          answer =
            '### 🔍 Análisis de Circuito Arduino\n\n' +
            `He revisado tu consulta sobre "${textToSend}". Para diagnosticar la falla:\n\n` +
            '1. **Comprueba voltajes**: Con un multímetro verifica que VCC entregue 5.0V estables entre sensor y GND.\n' +
            '2. **Revisa el Monitor Serie**: Comprueba que el baudrate en el sketch (`Serial.begin(9600)`) coincida con el configurado en CityNexus.\n' +
            '3. **Formato de trama**: El Arduino emite cinco líneas de texto, por ejemplo: `Energía: solar (420.0), eolica (310.0), residuos (240.0)`, `Semaforo: vertical (libre), horizontal (ocupado)`, `Sol: norte (55), sur (48)`, `Temperatura: ambiente (24.5), humedad (55)` y `Agua: nivel (64)`.\n\n' +
            '¿Qué sensor o pin específico te está causando problemas?'
        }

        setMessages((prev) => [
          ...prev,
          {
            id: reqId,
            sender: 'gemini',
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            text: answer
          }
        ])
        setLoading(false)
        if (addLog) addLog('gemini', 'Diagnóstico de circuito completado')
      }, 750)
    }
  }

  return (
    <div className="circuit-chat-card">
      {/* Header */}
      <div className="circuit-chat-header">
        <div className="circuit-chat-title-group">
          <div className="circuit-icon-wrap">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="13"
              height="13"
            >
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <h3 className="circuit-chat-title">ASISTENTE DE CIRCUITOS</h3>
            <span className="circuit-chat-sub">Gemini Hardware Diagnostic</span>
          </div>
        </div>

        <div className="circuit-chat-header-actions">
          <button
            type="button"
            className="chat-tiny-btn"
            onClick={() =>
              setMessages([
                {
                  id: 'welcome-reset',
                  sender: 'gemini',
                  time: 'Ahora',
                  text: 'Conversación reiniciada. ¿Qué problema o consulta tienes con tu circuito?'
                }
              ])
            }
            title="Limpiar conversación"
          >
            Limpiar
          </button>

          {onOpenSettings && (
            <button
              type="button"
              className="chat-tiny-btn"
              onClick={onOpenSettings}
              title="Configurar clave Gemini"
            >
              ⚙
            </button>
          )}
        </div>
      </div>

      {/* Diagnostic Quick Action Pills */}
      <div className="circuit-quick-pills">
        {[
          {
            label: '⚡ Ruido en señal',
            query: 'Tengo ruido y lecturas inestables en los sensores'
          },
          { label: '💧 Sensor agua', query: '¿Cómo conectar y calibrar el sensor de agua?' },
          { label: '🔌 Pines y GND', query: 'Verificar conexiones de pines analógicos y masa' },
          {
            label: '💻 Código Arduino',
            query: 'Ejemplo de sketch Arduino para enviar datos a CityNexus'
          }
        ].map((pill, idx) => (
          <button
            key={idx}
            type="button"
            className="circuit-pill-btn"
            onClick={() => handleSend(pill.query)}
            disabled={loading || !aiActive}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="circuit-messages-viewport" ref={scrollRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble-row ${msg.sender === 'user' ? 'chat-bubble-row--user' : 'chat-bubble-row--gemini'}`}
          >
            <div className="chat-bubble">
              <div className="chat-bubble-meta">
                <span className="chat-sender-name">
                  {msg.sender === 'user' ? 'Operador' : 'Gemini'}
                </span>
                <span className="chat-timestamp">{msg.time}</span>
              </div>
              <div className="chat-bubble-content">
                <MarkdownLite text={msg.text} />
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-row chat-bubble-row--gemini">
            <div className="chat-bubble chat-bubble--loading">
              <span className="pulse-dot pulse-dot--cyan" />
              <span className="chat-loading-text">Gemini diagnosticando circuito…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        className="circuit-input-bar"
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <input
          type="text"
          className="circuit-chat-input"
          placeholder="Escribe tu consulta sobre el circuito…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || !aiActive}
        />
        <button
          type="submit"
          className="circuit-chat-send"
          disabled={!input.trim() || loading || !aiActive}
        >
          Enviar ↗
        </button>
      </form>
    </div>
  )
}
