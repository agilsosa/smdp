import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULTS = {
  gemini: {
    apiKey: '',
    model: 'gemini-3.8-flash'
  },
  serial: {
    path: '',
    baudRate: 9600
  }
}

function mergeSettings(base, patch) {
  return {
    ...base,
    ...patch,
    gemini: { ...base.gemini, ...(patch?.gemini ?? {}) },
    serial: { ...base.serial, ...(patch?.serial ?? {}) }
  }
}

export class SettingsStore {
  constructor(fileName = 'settings.json') {
    this.filePath = path.join(app.getPath('userData'), fileName)
    this.data = this.#read()
  }

  #read() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8')
      return mergeSettings(DEFAULTS, JSON.parse(raw))
    } catch {
      return structuredClone(DEFAULTS)
    }
  }

  #write() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), { mode: 0o600 })

    try {
      fs.chmodSync(this.filePath, 0o600)
    } catch {
      // En algunos sistemas de archivos (p. ej. FAT) no se soportan permisos.
    }
  }

  getApiKey() {
    return String(this.data.gemini.apiKey || process.env.GEMINI_API_KEY || '').trim()
  }

  getModel() {
    return String(
      process.env.GEMINI_MODEL || this.data.gemini.model || DEFAULTS.gemini.model
    ).trim()
  }

  getSerialDefaults() {
    return { ...this.data.serial }
  }

  saveSerial(serial) {
    this.data = mergeSettings(this.data, { serial })
    this.#write()
  }

  saveGemini({ apiKey, model }) {
    const patch = { gemini: {} }

    if (apiKey !== undefined && apiKey !== null) {
      patch.gemini.apiKey = String(apiKey).trim()
    }

    if (model !== undefined && model !== null && String(model).trim()) {
      patch.gemini.model = String(model).trim()
    }

    this.data = mergeSettings(this.data, patch)
    this.#write()
  }

  getPublicSettings() {
    return {
      gemini: {
        hasApiKey: Boolean(this.getApiKey()),
        hasEnvApiKey: Boolean(process.env.GEMINI_API_KEY),
        model: this.getModel()
      },
      serial: this.getSerialDefaults()
    }
  }
}
