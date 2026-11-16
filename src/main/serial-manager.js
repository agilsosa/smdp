import { EventEmitter } from 'node:events'
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { CityFrameAssembler, formatCityFrame } from './city-parser.js'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function noise(scale) {
  return (Math.random() - 0.5) * scale
}

/**
 * Gestión del enlace serie con el Arduino.
 *
 * Emite eventos:
 *  - status: { state, message, port, baudRate, since }
 *  - sample: { t, data: { energia, semaforo, sol, temperatura, agua }, raw }
 */
export class SerialManager extends EventEmitter {
  constructor() {
    super()
    this.port = null
    this.parser = null
    this.assembler = null
    this.portPath = null
    this.baudRate = null
    this.demoTimer = null
    this.demoTick = 0
    this.demoValues = this.#createDemoValues()
    this.status = {
      state: 'disconnected',
      message: 'Sin conexión',
      port: null,
      baudRate: null,
      since: Date.now()
    }
  }

  #createDemoValues() {
    return {
      solar: 420,
      eolica: 310,
      residuos: 240,
      voltajeSolar: 2.33,
      voltajeEolica: 1.94,
      ambiente: 24.5,
      humedad: 55,
      norte: 55,
      sur: 48,
      nivel: 64
    }
  }

  getStatus() {
    return this.status
  }

  getMode() {
    if (this.port) return 'serial'
    if (this.demoTimer) return 'demo'
    return 'idle'
  }

  #emitStatus(state, message, extra = {}) {
    this.status = {
      state,
      message,
      port: this.portPath,
      baudRate: this.baudRate,
      since: Date.now(),
      ...extra
    }

    this.emit('status', this.status)
    return this.status
  }

  #emitSample(frame) {
    this.emit('sample', {
      t: Date.now(),
      data: frame.data,
      raw: frame.raw
    })
  }

  async listPorts() {
    const ports = await SerialPort.list()

    return ports
      .map(({ path, manufacturer, serialNumber, vendorId, productId }) => ({
        path,
        manufacturer: manufacturer || '',
        serialNumber: serialNumber || '',
        vendorId: vendorId || '',
        productId: productId || ''
      }))
      .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
  }

  async connect({ path: portPath, baudRate = 9600 } = {}) {
    const baud = Number(baudRate)

    if (!portPath) {
      throw new Error('Selecciona un puerto serie antes de conectar.')
    }

    if (!Number.isFinite(baud) || baud <= 0) {
      throw new Error('La velocidad (baudios) no es válida.')
    }

    await this.#stopDemo()
    await this.#closePort()

    this.portPath = portPath
    this.baudRate = baud
    this.#emitStatus('connecting', `Abriendo ${portPath} a ${baud} baudios…`)

    const port = new SerialPort({ path: portPath, baudRate: baud, autoOpen: false })
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))
    const assembler = new CityFrameAssembler({
      onFrame: (frame) => {
        if (this.port === port) this.#emitSample(frame)
      }
    })

    this.port = port
    this.parser = parser
    this.assembler = assembler

    parser.on('data', (line) => assembler.push(line))

    port.on('error', (error) => {
      if (this.port !== port) return

      this.#emitStatus('error', `Error de puerto: ${error.message}`)
      void this.#closePort().then(() => {
        if (!this.parser && !this.demoTimer) {
          this.#emitStatus('disconnected', 'Puerto cerrado por un error')
        }
      })
    })

    port.on('close', () => {
      if (this.port !== port) return
      this.port = null

      if (this.parser) {
        this.parser.removeAllListeners()
        this.parser = null
      }

      this.assembler?.reset()
      this.assembler = null
      this.#emitStatus('disconnected', 'Puerto serie cerrado')
    })

    try {
      await new Promise((resolve, reject) => {
        port.open((error) => (error ? reject(error) : resolve()))
      })
    } catch (error) {
      await this.#discardPort(port)
      const message = `No se pudo abrir ${portPath}: ${error.message}`
      this.#emitStatus('error', message)
      throw new Error(message, { cause: error })
    }

    return this.#emitStatus('connected', `Conectado a ${portPath}`)
  }

  async disconnect() {
    const hadDemo = Boolean(this.demoTimer)
    const hadPort = Boolean(this.port)

    await this.#stopDemo()
    await this.#closePort()

    this.portPath = null
    this.baudRate = null

    if (hadDemo || hadPort) {
      return this.#emitStatus('disconnected', 'Conexión cerrada')
    }

    return this.#emitStatus('disconnected', 'Sin conexión')
  }

  /**
   * Envía el bloque de decisiones al Arduino.
   * Acepta directamente el texto o un objeto { payload }.
   */
  async write(payload) {
    const text = String(
      typeof payload === 'string' ? payload : (payload?.payload ?? payload?.text ?? '')
    ).trim()

    if (!text) {
      return { sent: false, mode: this.getMode(), reason: 'El bloque de decisiones está vacío.' }
    }

    if (this.demoTimer) {
      return {
        sent: true,
        simulated: true,
        mode: 'demo',
        bytes: Buffer.byteLength(`${text}\n`),
        text
      }
    }

    if (!this.port || !this.port.isOpen) {
      return {
        sent: false,
        mode: 'idle',
        reason: 'No hay Arduino conectado: la decisión solo se muestra en pantalla.'
      }
    }

    const data = `${text}\n`

    await new Promise((resolve, reject) => {
      this.port.write(data, (error) => (error ? reject(error) : resolve()))
    })

    await new Promise((resolve) => this.port.drain(() => resolve()))

    return {
      sent: true,
      simulated: false,
      mode: 'serial',
      bytes: Buffer.byteLength(data),
      text
    }
  }

  async startDemo() {
    await this.#stopDemo()
    await this.#closePort()

    this.portPath = 'demo-smart-city'
    this.baudRate = null
    this.demoTick = 0
    this.demoValues = this.#createDemoValues()

    const tick = () => {
      this.demoTick += 1
      const time = this.demoTick
      const values = this.demoValues

      values.solar = clamp(
        values.solar + (430 + Math.sin(time / 17) * 210 - values.solar) * 0.18 + noise(28),
        70,
        820
      )
      values.eolica = clamp(
        values.eolica + (320 + Math.cos(time / 23) * 190 - values.eolica) * 0.16 + noise(24),
        50,
        740
      )
      values.residuos = clamp(
        values.residuos +
          (250 + Math.sin(time / 31 + 1.2) * 130 - values.residuos) * 0.14 +
          noise(18),
        40,
        560
      )

      values.ambiente = clamp(
        values.ambiente + (25 + Math.sin(time / 42) * 4.8 - values.ambiente) * 0.12 + noise(0.4),
        16,
        36
      )
      values.humedad = clamp(
        values.humedad + (55 + Math.cos(time / 33) * 18 - values.humedad) * 0.1 + noise(1.2),
        25,
        88
      )

      values.norte = clamp(
        values.norte + (52 + Math.sin(time / 26) * 42 - values.norte) * 0.2 + noise(4),
        0,
        100
      )
      values.sur = clamp(
        values.sur + (46 + Math.cos(time / 19) * 44 - values.sur) * 0.2 + noise(4),
        0,
        100
      )

      values.nivel = clamp(
        values.nivel + (62 + Math.cos(time / 37) * 34 - values.nivel) * 0.12 + noise(2),
        6,
        98
      )

      // Voltaje en el pin (0-5 V) coherente con la potencia simulada.
      values.voltajeSolar = clamp(values.solar / 180, 0, 5)
      values.voltajeEolica = clamp(values.eolica / 160, 0, 5)

      const cycle = time % 44
      const verticalOccupied = cycle < 18 || (cycle >= 30 && cycle < 35)
      const horizontalOccupied = cycle >= 20 && cycle < 37

      const data = {
        energia: {
          solar: round(values.solar, 1),
          eolica: round(values.eolica, 1),
          residuos: round(values.residuos, 1),
          voltaje_solar: round(values.voltajeSolar, 2),
          voltaje_eolica: round(values.voltajeEolica, 2)
        },
        semaforo: {
          vertical: verticalOccupied ? 'ocupado' : 'libre',
          horizontal: horizontalOccupied ? 'ocupado' : 'libre'
        },
        sol: {
          norte: Math.round(values.norte),
          sur: Math.round(values.sur)
        },
        temperatura: {
          ambiente: round(values.ambiente, 1),
          humedad: Math.round(values.humedad)
        },
        agua: {
          nivel: Math.round(values.nivel)
        }
      }

      this.#emitSample({ data, raw: formatCityFrame(data) })
    }

    tick()
    this.demoTimer = setInterval(tick, 1200)

    return this.#emitStatus('demo', 'Simulación de sensores activa', { demo: true })
  }

  async stopDemo() {
    const wasDemo = Boolean(this.demoTimer)
    await this.#stopDemo()

    if (wasDemo) {
      this.portPath = null
      this.baudRate = null
      return this.#emitStatus('disconnected', 'Demostración detenida')
    }

    return this.status
  }

  async #stopDemo() {
    if (this.demoTimer) {
      clearInterval(this.demoTimer)
      this.demoTimer = null
    }
  }

  async #discardPort(port) {
    try {
      port.removeAllListeners()
      if (port.isOpen) {
        await new Promise((resolve) => port.close(() => resolve()))
      }
    } catch {
      // El puerto ya estaba cerrado.
    }

    if (this.port === port) {
      this.port = null
      this.parser = null
      this.assembler = null
    }
  }

  async #closePort() {
    const port = this.port
    this.port = null

    if (this.parser) {
      this.parser.removeAllListeners()
      this.parser = null
    }

    if (this.assembler) {
      this.assembler.reset()
      this.assembler = null
    }

    if (!port) return

    try {
      port.removeAllListeners()
      if (port.isOpen) {
        await new Promise((resolve) => port.close(() => resolve()))
      }
    } catch {
      // Ignoramos errores al cerrar: el objetivo es liberar el recurso.
    }
  }
}
