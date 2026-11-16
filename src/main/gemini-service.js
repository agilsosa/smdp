import { GoogleGenAI, Type } from '@google/genai'
import {
  DECISION_ORDER,
  DECISION_VALUES,
  buildDecisionPayload,
  energyBreakdown,
  formatNumber,
  localDecisionResult,
  sunSummary,
  toNumber,
  trafficSummary
} from '../shared/city.js'
import { formatCityFrame } from './city-parser.js'

const DECISION_INSTRUCTION = [
  'Eres el cerebro de operaciones de CityNexus, una ciudad inteligente simulada con sensores Arduino.',
  'Recibes lecturas de energía (solar, eólica y residuos), semáforo de tres luces, radiación solar, temperatura/humedad y agua.',
  'Decides también si se cubre la cubierta de los edificios y si se encienden los postes de alumbrado público.',
  'Debes tomar decisiones operativas y, sobre todo, recomendar a los ciudadanos cómo actuar.',
  'Responde siempre en español y devuelve únicamente el objeto JSON solicitado, sin Markdown.'
].join(' ')

const CHAT_INSTRUCTION = [
  'Eres el asistente ciudadano de CityNexus.',
  'Conversas en español con operadores y ciudadanos sobre las lecturas de los sensores y las decisiones tomadas.',
  'Explica las recomendaciones con claridad, responde dudas y propone hábitos seguros y sostenibles.',
  'Usa Markdown ligero (listas y negritas) y sé breve: máximo 2 párrafos o 5 viñetas.',
  'No inventes lecturas que no aparezcan en el contexto.'
].join(' ')

const MAX_PROMPT_LENGTH = 1600
const MAX_CHAT_MESSAGES = 12

const DECISION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    energia: {
      type: Type.STRING,
      enum: DECISION_VALUES.energia,
      description: 'Fuente de energía con mayor producción: solar, eolica o residuos.'
    },
    semaforo: {
      type: Type.STRING,
      enum: DECISION_VALUES.semaforo,
      description:
        'rojo si ambos ejes están ocupados o hay congestión; amarillo si solo un eje está ocupado; verde si ambos están libres.'
    },
    sol: {
      type: Type.STRING,
      enum: DECISION_VALUES.sol,
      description:
        'cubrir si la radiación es alta (>= 60 %) para desplegar la cubierta de los edificios; libre si no hace falta cubrirlos.'
    },
    temperatura: {
      type: Type.STRING,
      enum: DECISION_VALUES.temperatura,
      description: 'caliente si hace calor (>= 26 °C); frio en caso contrario.'
    },
    agua: {
      type: Type.STRING,
      enum: DECISION_VALUES.agua,
      description: 'bajo (< 25 %), full (>= 85 %) o normal.'
    },
    poste: {
      type: Type.STRING,
      enum: DECISION_VALUES.poste,
      description:
        'encender si la radiación es baja (< 35 %, de noche o muy nublado); apagar si hay luz suficiente.'
    },
    explanation: {
      type: Type.STRING,
      description: 'Explicación breve (1-2 frases) de por qué se tomaron estas decisiones.'
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Entre 3 y 5 recomendaciones concretas para los ciudadanos, en español.'
    }
  },
  required: [...DECISION_ORDER, 'explanation', 'recommendations'],
  propertyOrdering: [...DECISION_ORDER, 'explanation', 'recommendations']
}

function friendlyError(error) {
  const message = String(error?.message || error || 'Error desconocido')

  if (/api key|api_key|unauthenticated|permission denied|401|403/i.test(message)) {
    return 'La API key de Gemini no es válida o no tiene permisos.'
  }

  if (/quota|rate limit|429|resource_exhausted/i.test(message)) {
    return 'Se alcanzó el límite de uso de Gemini.'
  }

  if (/model|not found|404/i.test(message)) {
    return `El modelo configurado no está disponible (${message.slice(0, 160)}).`
  }

  if (/fetch|network|enotfound|econn|timeout/i.test(message)) {
    return 'No se pudo conectar con la API de Gemini.'
  }

  return message.slice(0, 400)
}

function telemetryContext(sample) {
  const data = sample?.data

  if (!data) {
    return 'No hay lecturas del Arduino en este momento. Indica que se conecte el dispositivo o se active el modo demo.'
  }

  const energy = energyBreakdown(data)
  const traffic = trafficSummary(data)
  const sun = sunSummary(data)
  const ambient = toNumber(data?.temperatura?.ambiente)
  const humidity = toNumber(data?.temperatura?.humedad)
  const water = toNumber(data?.agua?.nivel)
  const solarVoltage = toNumber(data?.energia?.voltaje_solar)
  const windVoltage = toNumber(data?.energia?.voltaje_eolica)

  return [
    'Lecturas actuales del Arduino:',
    formatCityFrame(data),
    '',
    'Análisis rápido:',
    `- Energía: solar ${formatNumber(toNumber(data?.energia?.solar))} kW (${formatNumber(
      solarVoltage,
      2
    )} V), eólica ${formatNumber(toNumber(data?.energia?.eolica))} kW (${formatNumber(
      windVoltage,
      2
    )} V), residuos ${formatNumber(
      toNumber(data?.energia?.residuos)
    )} kW (estimado). Fuente principal: ${energy.highest.label} (${formatNumber(
      energy.highest.value
    )} kW de ${formatNumber(energy.total)} kW totales).`,
    `- Semáforo: vertical ${traffic.verticalOccupied ? 'ocupado' : 'libre'}, horizontal ${
      traffic.horizontalOccupied ? 'ocupado' : 'libre'
    }${
      traffic.bothOccupied
        ? ' → congestión en ambos ejes (rojo)'
        : traffic.occupiedCount === 1
          ? ' → un eje ocupado (amarillo)'
          : ' → cruce fluido (verde)'
    }.`,
    `- Sol: norte ${formatNumber(sun.north, 0)}%, sur ${formatNumber(
      sun.south,
      0
    )}% → posición ${sun.position}, ${sun.isCloudy ? 'nublado' : 'despejado'}; cubierta ${
      sun.needsProtection ? 'recomendada' : 'no necesaria'
    }.`,
    `- Temperatura: ${formatNumber(ambient)} °C, humedad ${formatNumber(humidity)}%.`,
    `- Agua: ${formatNumber(water)}%. Alumbrado público: ${sun.isCloudy ? 'encender' : 'apagar'}.`
  ].join('\n')
}

function buildDecisionPrompt(sample) {
  return [
    telemetryContext(sample),
    '',
    'Toma las seis decisiones operativas y redacta recomendaciones para la ciudadanía.',
    'Reglas:',
    '- energia: la fuente con el valor más alto de las tres (solar, eolica o residuos).',
    '- semaforo: rojo si ambos sensores están ocupados; amarillo si solo uno está ocupado; verde si ambos están libres.',
    '- sol: cubrir si la radiación máxima es alta (>= 60 %) para desplegar la cubierta de los edificios; libre si es baja.',
    '- temperatura: caliente si la temperatura ambiente es >= 26 °C; frio por debajo.',
    '- agua: bajo si el nivel es < 25 %, full si es >= 85 %, normal en el resto.',
    '- poste: encender si la radiación máxima es baja (< 35 %, noche o nubosidad densa); apagar si hay luz suficiente.',
    'Las recomendaciones deben ser acciones concretas para los ciudadanos (movilidad, cubierta de edificios, alumbrado, hidratación y consumo de agua).',
    'Devuelve solo el JSON con las claves: energia, semaforo, sol, temperatura, agua, poste, explanation, recommendations.'
  ].join('\n')
}

function sanitizeResult(parsed, fallback) {
  const decisions = {}

  for (const key of DECISION_ORDER) {
    const candidate = String(parsed?.[key] ?? '')
      .trim()
      .toLowerCase()
    decisions[key] = DECISION_VALUES[key].includes(candidate) ? candidate : fallback.decisions[key]
  }

  const explanation =
    typeof parsed?.explanation === 'string' && parsed.explanation.trim()
      ? parsed.explanation.trim().slice(0, 600)
      : fallback.explanation

  const recommendations = Array.isArray(parsed?.recommendations)
    ? parsed.recommendations
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .slice(0, 5)
    : []

  return {
    decisions,
    explanation,
    recommendations: recommendations.length > 0 ? recommendations : fallback.recommendations
  }
}

function withPayload(result) {
  return {
    ...result,
    payload: buildDecisionPayload(result.decisions),
    ts: Date.now()
  }
}

export class GeminiService {
  constructor(settings) {
    this.settings = settings
    this.client = null
    this.clientKey = null
    this.active = new Map()
  }

  #getClient() {
    const apiKey = this.settings.getApiKey()

    if (!apiKey) {
      throw new Error(
        'Falta la API key de Gemini. Añádela en Ajustes o define GEMINI_API_KEY en el archivo .env.'
      )
    }

    if (!this.client || this.clientKey !== apiKey) {
      this.client = new GoogleGenAI({ apiKey })
      this.clientKey = apiKey
    }

    return this.client
  }

  /**
   * Decisiones estructuradas para las seis categorías.
   * Si Gemini no está disponible, devuelve el resultado local determinista.
   */
  async decide({ sample, aiEnabled = true } = {}) {
    const data = sample?.data
    const fallback = localDecisionResult(data ?? {})
    const local = withPayload({
      ...fallback,
      source: 'local',
      model: null,
      note: aiEnabled
        ? 'Decisiones calculadas localmente a partir de las lecturas.'
        : 'Gemini en pausa · decisiones calculadas localmente.'
    })

    if (!data) {
      return {
        ...local,
        note: 'Todavía no hay lecturas completas del Arduino; se muestran valores de referencia.'
      }
    }

    if (!aiEnabled) return local

    const apiKey = this.settings.getApiKey()

    if (!apiKey) {
      return {
        ...local,
        note: 'Sin API key de Gemini · decisiones calculadas localmente.'
      }
    }

    try {
      const client = this.#getClient()
      const model = this.settings.getModel()

      const response = await client.models.generateContent({
        model,
        contents: buildDecisionPrompt(sample),
        config: {
          systemInstruction: DECISION_INSTRUCTION,
          temperature: 0.35,
          maxOutputTokens: 900,
          responseMimeType: 'application/json',
          responseSchema: DECISION_SCHEMA
        }
      })

      const text = String(response?.text ?? '').trim()
      if (!text) throw new Error('Gemini devolvió una respuesta vacía.')

      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        const start = text.indexOf('{')
        const end = text.lastIndexOf('}')
        if (start < 0 || end <= start) throw new Error('La respuesta de Gemini no es JSON válido.')
        parsed = JSON.parse(text.slice(start, end + 1))
      }

      const clean = sanitizeResult(parsed, fallback)

      return withPayload({
        source: 'gemini',
        model,
        decisions: clean.decisions,
        explanation: clean.explanation,
        recommendations: clean.recommendations,
        note: null
      })
    } catch (error) {
      const reason = friendlyError(error)
      return {
        ...local,
        error: reason,
        note: `${reason} Se usan decisiones locales como respaldo.`
      }
    }
  }

  /**
   * Chat ciudadano con streaming. La telemetría actual se incluye como contexto.
   */
  async chat({ requestId, sample, prompt, messages = [], onChunk, onDone, onError, onCancelled }) {
    const controller = new AbortController()
    this.active.set(requestId, controller)

    let fullText = ''

    try {
      const userPrompt = String(prompt || '')
        .trim()
        .slice(0, MAX_PROMPT_LENGTH)

      if (!userPrompt) throw new Error('Escribe una pregunta para el asistente.')

      const client = this.#getClient()
      const model = this.settings.getModel()

      const history = (Array.isArray(messages) ? messages : [])
        .filter((message) => message && message.text && message.role)
        .slice(-MAX_CHAT_MESSAGES)
        .map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(message.text).slice(0, MAX_PROMPT_LENGTH) }]
        }))

      const contents = [
        ...history,
        {
          role: 'user',
          parts: [
            {
              text: [telemetryContext(sample), '', `Pregunta del usuario: ${userPrompt}`].join('\n')
            }
          ]
        }
      ]

      const stream = await client.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: CHAT_INSTRUCTION,
          temperature: 0.65,
          maxOutputTokens: 1100,
          abortSignal: controller.signal
        }
      })

      for await (const chunk of stream) {
        if (controller.signal.aborted) break

        const text = chunk.text
        if (text) {
          fullText += text
          onChunk?.(text)
        }
      }

      if (controller.signal.aborted) {
        onCancelled?.(fullText)
      } else {
        onDone?.(fullText)
      }
    } catch (error) {
      if (controller.signal.aborted) {
        onCancelled?.(fullText)
      } else {
        onError?.(friendlyError(error))
      }
    } finally {
      this.active.delete(requestId)
    }
  }

  cancel(requestId) {
    const controller = this.active.get(requestId)
    if (!controller) return false
    controller.abort()
    return true
  }

  cancelAll() {
    for (const controller of this.active.values()) {
      controller.abort()
    }
    this.active.clear()
  }
}
