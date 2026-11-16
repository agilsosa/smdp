import { useCallback, useEffect, useRef, useState } from 'react'
import MacTitleBar from './components/MacTitleBar'
import RightControlColumn from './components/RightControlColumn'
import SettingsModal from './components/SettingsModal'
import SystemActivityLog from './components/SystemActivityLog'
import FullLogsModal from './components/FullLogsModal'
import AiReportModal from './components/AiReportModal'
import AiReportDrawer from './components/AiReportDrawer'
import EnergyPanel from './components/EnergyPanel'
import TrafficPanel from './components/TrafficPanel'
import SunPanel from './components/SunPanel'
import EnvironmentPanel from './components/EnvironmentPanel'
import DecisionBoard from './components/DecisionBoard'
import CityAssistant from './components/CityAssistant'
import ArduinoOutputPanel from './components/ArduinoOutputPanel'
import { DECISION_ORDER, decisionLabel, deriveDecisions } from '../../shared/city.js'

const MAX_SAMPLES = 600
const MAX_LOGS = 300
const DECISION_INTERVAL = 12000
const DECISION_MIN_INTERVAL = 5000

function currentTime() {
  return new Date().toLocaleTimeString('es-ES', { hour12: false })
}

function decisionsSummary(decisions) {
  if (!decisions) return '—'
  return [
    `energía ${decisionLabel('energia', decisions.energia)}`,
    `semáforo ${decisionLabel('semaforo', decisions.semaforo)}`,
    `cubierta ${decisionLabel('sol', decisions.sol)}`,
    `temperatura ${decisionLabel('temperatura', decisions.temperatura)}`,
    `agua ${decisionLabel('agua', decisions.agua)}`,
    `poste ${decisionLabel('poste', decisions.poste)}`
  ].join(' · ')
}

// Firma de las decisiones locales: permite decidir de nuevo cuando cambia una categoría.
function decisionSignature(data) {
  const decisions = deriveDecisions(data)
  return DECISION_ORDER.map((key) => `${key}:${decisions[key]}`).join('|')
}

// Conserva la última lectura conocida de cada categoría si llega una trama parcial.
function mergeCityData(previous, incoming) {
  const result = { ...(previous ?? {}) }

  for (const [category, values] of Object.entries(incoming ?? {})) {
    result[category] = { ...(result[category] ?? {}), ...(values ?? {}) }
  }

  return result
}

export default function App() {
  const [ports, setPorts] = useState([])
  const [selectedPort, setSelectedPort] = useState('')
  const [baudRate, setBaudRate] = useState(9600)
  const [status, setStatus] = useState({
    state: 'disconnected',
    message: 'Sin conexión serie',
    port: null,
    baudRate: null
  })
  const [settings, setSettings] = useState(null)
  const [samples, setSamples] = useState([])
  const [latest, setLatest] = useState(null)
  const [decision, setDecision] = useState(null)
  const [deciding, setDeciding] = useState(false)
  const [sendInfo, setSendInfo] = useState(null)
  const [autoAnalyze, setAutoAnalyze] = useState(true)
  const [autoSend, setAutoSend] = useState(true)
  const [aiActive, setAiActive] = useState(true)
  const [manualOverride, setManualOverride] = useState(false)
  const [busy, setBusy] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatBusy, setChatBusy] = useState(false)
  const [activeDrawer, setActiveDrawer] = useState(null) // 'chat' | 'controls' | 'ai-report' | null

  const [showLogsModal, setShowLogsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)

  const [logs, setLogs] = useState([
    {
      id: 1,
      time: currentTime(),
      type: 'info',
      message: 'Sistema iniciado. Monitoreo de 5 categorías de sensores activo.'
    },
    {
      id: 2,
      time: currentTime(),
      type: 'ai',
      message: 'Motor Gemini listo para procesar telemetría y generar decisiones.'
    },
    {
      id: 3,
      time: currentTime(),
      type: 'arduino',
      message: 'Esperando tramas serie del Arduino (energía, semáforo, sol, temperatura y agua).'
    }
  ])

  const logId = useRef(3)
  const sampleCount = useRef(0)
  const latestRef = useRef(null)
  const lastDataRef = useRef(null)
  const decidingRef = useRef(false)
  const lastDecideAt = useRef(0)
  const lastDecisionSignature = useRef('')
  const autoSendRef = useRef(true)
  const aiActiveRef = useRef(true)
  const manualOverrideRef = useRef(false)
  const chatMessagesRef = useRef([])
  const chatRequestId = useRef('')
  const assistantMsgId = useRef('')

  const hasApiKey = Boolean(settings?.gemini?.hasApiKey)
  const connected = status.state === 'connected' || status.state === 'demo'
  const latestData = latest?.data ?? null

  const hasApiKeyRef = useRef(false)

  useEffect(() => {
    hasApiKeyRef.current = hasApiKey
  }, [hasApiKey])

  const addLog = useCallback((type, message) => {
    logId.current += 1
    const entry = {
      id: logId.current,
      time: currentTime(),
      type,
      message: String(message)
    }

    setLogs((prev) => {
      const next = [...prev, entry]
      return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
    })
  }, [])

  useEffect(() => {
    chatMessagesRef.current = chatMessages
  }, [chatMessages])

  useEffect(() => {
    autoSendRef.current = autoSend
  }, [autoSend])

  useEffect(() => {
    aiActiveRef.current = aiActive
  }, [aiActive])

  useEffect(() => {
    manualOverrideRef.current = manualOverride
  }, [manualOverride])

  const handleToggleDrawer = useCallback((type) => {
    setActiveDrawer((prev) => (prev === type ? null : type))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveDrawer(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const refreshPorts = useCallback(
    async (quiet = true) => {
      try {
        const next = await window.api.serial.listPorts()
        setPorts(next)
        if (!quiet) addLog('arduino', `${next.length} puerto(s) serie detectado(s)`)
        return next
      } catch (error) {
        if (!quiet) addLog('error', `Error al listar puertos: ${error.message}`)
        return []
      }
    },
    [addLog]
  )

  useEffect(() => {
    let cancelled = false

    window.api.app
      .info()
      .then((info) => {
        if (cancelled) return
        setStatus(info.serialStatus)
        setSettings(info.settings)
        if (info.settings?.serial?.path) setSelectedPort(info.settings.serial.path)
        if (info.settings?.serial?.baudRate) setBaudRate(info.settings.serial.baudRate)
      })
      .catch((error) => addLog('error', `Error inicializando el sistema: ${error.message}`))

    return () => {
      cancelled = true
    }
  }, [addLog])

  useEffect(() => {
    void refreshPorts(true)
    const timer = setInterval(() => void refreshPorts(true), 5000)
    return () => clearInterval(timer)
  }, [refreshPorts])

  // Telemetría: cada trama completa del Arduino se guarda y pasa a la interfaz.
  useEffect(() => {
    const offStatus = window.api.serial.onStatus((next) => {
      setStatus(next)
      const type =
        next.state === 'error' ? 'error' : next.state === 'connected' ? 'arduino' : 'info'
      addLog(type, `Arduino: ${next.message}`)
    })

    const offSample = window.api.serial.onSample((sample) => {
      sampleCount.current += 1
      const mergedData = mergeCityData(lastDataRef.current, sample.data)
      const mergedSample = { ...sample, data: mergedData }
      lastDataRef.current = mergedData
      latestRef.current = mergedSample
      setLatest(mergedSample)
      setSamples((prev) => {
        const next = [...prev, mergedSample]
        return next.length > MAX_SAMPLES ? next.slice(next.length - MAX_SAMPLES) : next
      })

      if (sampleCount.current === 1 || sampleCount.current % 8 === 0) {
        addLog(
          'arduino',
          `Trama completa #${sampleCount.current} recibida · ${String(sample.raw || '').split('\n').length} líneas`
        )
      }
    })

    return () => {
      offStatus()
      offSample()
    }
  }, [addLog])

  const sendDecisions = useCallback(
    async (result, manual = false) => {
      if (!result?.payload) return

      try {
        const info = await window.api.serial.send({ payload: result.payload })
        const withTime = { ...info, at: Date.now() }
        setSendInfo(withTime)

        if (info.sent) {
          addLog(
            'arduino',
            info.simulated
              ? `Salida simulada del bloque de decisiones (${info.bytes} bytes)`
              : `Bloque de decisiones enviado al Arduino (${info.bytes} bytes)`
          )
        } else if (manual) {
          addLog('error', `No se pudo enviar al Arduino: ${info.reason}`)
        }
      } catch (error) {
        addLog('error', `Error enviando al Arduino: ${error.message}`)
      }
    },
    [addLog]
  )

  const decideNow = useCallback(
    async (options = {}) => {
      const manual = options.manual === true
      const sample = latestRef.current

      if (!sample) {
        if (manual) addLog('error', 'Aún no hay una trama completa del Arduino para analizar.')
        return
      }

      if (decidingRef.current) return

      const signature = decisionSignature(sample.data)
      const now = Date.now()
      const changed = signature !== lastDecisionSignature.current
      const aiRequested = aiActiveRef.current && !manualOverrideRef.current
      const useGemini = aiRequested && hasApiKeyRef.current

      if (!manual) {
        if (!changed && now - lastDecideAt.current < DECISION_INTERVAL) return
        if (useGemini && now - lastDecideAt.current < DECISION_MIN_INTERVAL) return
      }

      lastDecideAt.current = now
      decidingRef.current = true
      setDeciding(true)

      try {
        const result = await window.api.gemini.decide({ sample, aiEnabled: aiRequested })
        setDecision(result)
        lastDecisionSignature.current = signature

        if (result.source === 'gemini') {
          addLog('gemini', `Decisiones Gemini · ${decisionsSummary(result.decisions)}`)
        } else {
          addLog('local', `Decisiones locales · ${decisionsSummary(result.decisions)}`)
        }

        if (result.error) addLog('error', `Gemini: ${result.error}`)
        if (autoSendRef.current) await sendDecisions(result, false)
      } catch (error) {
        addLog('error', `No se pudieron calcular decisiones: ${error.message}`)
      } finally {
        decidingRef.current = false
        setDeciding(false)
      }
    },
    [addLog, sendDecisions]
  )

  // Analiza cada nueva trama con un límite temporal para no saturar Gemini.
  useEffect(() => {
    if (!autoAnalyze || !latest) return
    void decideNow()
  }, [latest, autoAnalyze, decideNow])

  // Streaming del chat ciudadano.
  useEffect(() => {
    const isCurrent = (payload) => payload?.requestId === chatRequestId.current

    const updateAssistant = (updater) => {
      setChatMessages((prev) =>
        prev.map((message) => (message.id === assistantMsgId.current ? updater(message) : message))
      )
    }

    const offChunk = window.api.gemini.onChunk((payload) => {
      if (!isCurrent(payload) || !payload?.text) return
      updateAssistant((message) => ({ ...message, text: message.text + payload.text }))
    })

    const offDone = window.api.gemini.onDone((payload) => {
      if (!isCurrent(payload)) return
      setChatBusy(false)
    })

    const offError = window.api.gemini.onError((payload) => {
      if (!isCurrent(payload)) return
      const message = payload?.message || 'Error desconocido de Gemini.'
      updateAssistant((assistant) => ({
        ...assistant,
        text: assistant.text ? `${assistant.text}\n\n⚠ ${message}` : `⚠ ${message}`
      }))
      setChatBusy(false)
      addLog('error', `Asistente Gemini: ${message}`)
    })

    const offCancelled = window.api.gemini.onCancelled((payload) => {
      if (!isCurrent(payload)) return
      updateAssistant((assistant) => ({
        ...assistant,
        text: assistant.text || '_Respuesta cancelada._'
      }))
      setChatBusy(false)
    })

    return () => {
      offChunk()
      offDone()
      offError()
      offCancelled()
    }
  }, [addLog])

  const sendChat = useCallback(
    async (text) => {
      if (chatBusy) return

      const prompt = String(text || '').trim()
      if (!prompt) return
      if (!hasApiKey) {
        addLog('error', 'Añade una API key de Gemini en Ajustes para conversar con el asistente.')
        setShowSettingsModal(true)
        return
      }

      const history = chatMessagesRef.current
        .filter((message) => message.text)
        .slice(-10)
        .map((message) => ({ role: message.role, text: message.text }))

      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const assistantId = `assistant-${requestId}`
      chatRequestId.current = requestId
      assistantMsgId.current = assistantId

      setChatMessages((prev) => [
        ...prev,
        { id: `user-${requestId}`, role: 'user', text: prompt },
        { id: assistantId, role: 'assistant', text: '' }
      ])
      setChatBusy(true)

      try {
        await window.api.gemini.chat({
          requestId,
          prompt,
          sample: latestRef.current,
          messages: history
        })
      } catch (error) {
        setChatMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? { ...message, text: `⚠ ${error.message}` } : message
          )
        )
        setChatBusy(false)
        addLog('error', `Asistente Gemini: ${error.message}`)
      }
    },
    [addLog, chatBusy, hasApiKey]
  )

  const stopChat = useCallback(() => {
    if (chatRequestId.current) void window.api.gemini.cancel(chatRequestId.current)
    setChatBusy(false)
  }, [])

  const clearChat = useCallback(() => {
    if (chatBusy) stopChat()
    setChatMessages([])
  }, [chatBusy, stopChat])

  const handleConnect = async () => {
    const effectivePort = selectedPort || ports[0]?.path || ''
    if (!effectivePort) return

    setBusy(true)
    try {
      const next = await window.api.serial.connect({
        path: effectivePort,
        baudRate: Number(baudRate)
      })
      setStatus(next)
    } catch (error) {
      addLog('error', `Fallo al conectar: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleDisconnect = async () => {
    setBusy(true)
    try {
      await window.api.serial.disconnect()
      addLog('arduino', 'Enlace serie con el Arduino cerrado')
    } catch (error) {
      addLog('error', error.message)
    } finally {
      setBusy(false)
    }
  }

  const handleToggleDemo = async () => {
    setBusy(true)
    try {
      if (status.state === 'demo') {
        await window.api.serial.stopDemo()
        addLog('arduino', 'Simulación de sensores detenida')
      } else {
        await window.api.serial.startDemo()
        addLog('arduino', 'Simulación de sensores activada · cinco categorías a 1,2 s')
      }
    } catch (error) {
      addLog('error', error.message)
    } finally {
      setBusy(false)
    }
  }

  const handleToggleAi = () => {
    const next = !aiActive
    aiActiveRef.current = next
    setAiActive(next)

    if (next && manualOverrideRef.current) {
      manualOverrideRef.current = false
      setManualOverride(false)
      addLog('control', 'Modo manual desactivado · Gemini recupera el control')
    }

    addLog(
      'ai',
      next
        ? 'Motor Gemini activado · las próximas decisiones usan IA'
        : 'Motor Gemini en pausa · decisiones locales deterministas'
    )
    void decideNow({ manual: true })
  }

  const handleToggleManualOverride = () => {
    const next = !manualOverride
    manualOverrideRef.current = next
    setManualOverride(next)
    addLog(
      'control',
      next
        ? 'Modo manual activado · se fuerzan decisiones locales sin Gemini'
        : 'Modo automático restablecido · Gemini vuelve a decidir'
    )
    void decideNow({ manual: true })
  }

  const handleResetSystem = () => {
    setSamples([])
    setLatest(null)
    latestRef.current = null
    lastDataRef.current = null
    sampleCount.current = 0
    setDecision(null)
    setSendInfo(null)
    lastDecisionSignature.current = ''
    addLog('control', 'Telemetría y decisiones reiniciadas por el operador')
  }

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const effectivePort = selectedPort || ports[0]?.path || ''

  return (
    <div className="smart-city-app">
      <MacTitleBar
        arduinoStatus={status}
        aiActive={aiActive && !manualOverride}
        manualOverride={manualOverride}
        activeDrawer={activeDrawer}
        onToggleDrawer={handleToggleDrawer}
        onOpenSettings={() => setShowSettingsModal(true)}
        onToggleFullscreen={handleToggleFullscreen}
      />

      <div className="city-dashboard-body sc-layout-sliding">
        {/* Left Column: 2x2 Bento Matrix of the 4 Sensor Panels */}
        <section className="sensors-matrix-2x2">
          <EnergyPanel data={latestData} decision={decision} />
          <TrafficPanel data={latestData} decision={decision} />
          <SunPanel data={latestData} decision={decision} />
          <EnvironmentPanel data={latestData} decision={decision} />
        </section>

        {/* Right Column: Decisions & Arduino Output Payload */}
        <section className="decisions-main-column">
          <DecisionBoard
            decision={decision}
            deciding={deciding}
            autoAnalyze={autoAnalyze}
            onToggleAuto={() => {
              setAutoAnalyze((prev) => {
                addLog('control', `Análisis automático ${!prev ? 'activado' : 'desactivado'}`)
                return !prev
              })
            }}
            onAnalyze={() => void decideNow({ manual: true })}
            onOpenAiModal={() => setShowAiModal(true)}
            onOpenAiDrawer={() => setActiveDrawer('ai-report')}
          />

          <ArduinoOutputPanel
            decision={decision}
            sendInfo={sendInfo}
            autoSend={autoSend}
            connected={connected}
            onToggleAutoSend={() => {
              setAutoSend((prev) => {
                autoSendRef.current = !prev
                addLog(
                  'control',
                  `Envío automático al Arduino ${!prev ? 'activado' : 'desactivado'}`
                )
                return !prev
              })
            }}
            onSend={() => decision && void sendDecisions(decision, true)}
          />
        </section>
      </div>

      {/* Sliding Side Drawer for Assistant & System Controls */}
      <div
        className={`drawer-backdrop ${activeDrawer ? 'is-open' : ''}`}
        onClick={() => setActiveDrawer(null)}
      />

      <aside
        className={`sliding-drawer ${activeDrawer ? 'is-open' : ''}`}
        aria-label="Panel lateral deslizante"
      >
        <div className="sliding-drawer__header">
          <div className="drawer-tabs">
            <button
              type="button"
              className={`drawer-tab ${activeDrawer === 'chat' ? 'is-active' : ''}`}
              onClick={() => setActiveDrawer('chat')}
            >
              Asistente Gemini
            </button>
            <button
              type="button"
              className={`drawer-tab ${activeDrawer === 'ai-report' ? 'is-active' : ''}`}
              onClick={() => setActiveDrawer('ai-report')}
            >
              Directivas IA
            </button>
            <button
              type="button"
              className={`drawer-tab ${activeDrawer === 'controls' ? 'is-active' : ''}`}
              onClick={() => setActiveDrawer('controls')}
            >
              Control & Logs
            </button>
          </div>

          <button
            type="button"
            className="drawer-close-btn"
            onClick={() => setActiveDrawer(null)}
            title="Cerrar panel lateral (Esc)"
          >
            ✕
          </button>
        </div>

        <div className="sliding-drawer__body">
          {activeDrawer === 'chat' && (
            <CityAssistant
              messages={chatMessages}
              busy={chatBusy}
              hasApiKey={hasApiKey}
              onSend={sendChat}
              onStop={stopChat}
              onClear={clearChat}
            />
          )}

          {activeDrawer === 'ai-report' && (
            <AiReportDrawer
              decision={decision}
              deciding={deciding}
              onAnalyze={() => void decideNow({ manual: true })}
            />
          )}

          {activeDrawer === 'controls' && (
            <div className="drawer-controls-wrap">
              <RightControlColumn
                arduinoStatus={status}
                ports={ports}
                selectedPort={effectivePort}
                baudRate={baudRate}
                busy={busy}
                onSelectPort={setSelectedPort}
                onBaudRate={setBaudRate}
                onRefreshPorts={() => void refreshPorts(false)}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onToggleDemo={handleToggleDemo}
                aiActive={aiActive && !manualOverride}
                onToggleAi={handleToggleAi}
                settings={settings}
                onOpenSettings={() => setShowSettingsModal(true)}
                manualOverride={manualOverride}
                onToggleManualOverride={handleToggleManualOverride}
                onResetSystem={handleResetSystem}
                onOpenLogs={() => setShowLogsModal(true)}
              />

              <SystemActivityLog
                logs={logs}
                onClear={() => setLogs([])}
                onOpenFullLogs={() => setShowLogsModal(true)}
              />
            </div>
          )}
        </div>
      </aside>

      <FullLogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        logs={logs}
        samples={samples}
      />

      <AiReportModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        decision={decision}
        deciding={deciding}
        onAnalyze={() => void decideNow({ manual: true })}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onSaveSettings={(next) => {
          setSettings(next)
          addLog('ai', 'Ajustes de IA actualizados')
        }}
      />
    </div>
  )
}
