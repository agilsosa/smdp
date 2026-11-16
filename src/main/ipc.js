import { app, BrowserWindow, ipcMain } from 'electron'
import { CHANNELS } from '../shared/channels.js'

function broadcast(channel, payload) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload)
    }
  }
}

export function registerIpc({ serial, gemini, settings }) {
  const statusListener = (status) => broadcast(CHANNELS.serialStatus, status)
  const sampleListener = (sample) => broadcast(CHANNELS.serialSample, sample)

  serial.on('status', statusListener)
  serial.on('sample', sampleListener)

  ipcMain.handle(CHANNELS.appInfo, () => ({
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    versions: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node
    },
    serialStatus: serial.getStatus(),
    settings: settings.getPublicSettings()
  }))

  ipcMain.handle(CHANNELS.serialList, () => serial.listPorts())

  ipcMain.handle(CHANNELS.serialConnect, async (_event, options) => {
    const status = await serial.connect(options ?? {})
    settings.saveSerial({
      path: String(options?.path ?? ''),
      baudRate: Number(options?.baudRate) || 9600
    })
    return status
  })

  ipcMain.handle(CHANNELS.serialDisconnect, () => serial.disconnect())
  ipcMain.handle(CHANNELS.serialDemoStart, () => serial.startDemo())
  ipcMain.handle(CHANNELS.serialDemoStop, () => serial.stopDemo())

  ipcMain.handle(CHANNELS.serialSend, (_event, payload) => serial.write(payload))

  ipcMain.handle(CHANNELS.settingsGet, () => settings.getPublicSettings())

  ipcMain.handle(CHANNELS.settingsSave, (_event, patch = {}) => {
    if (patch?.gemini && (patch.gemini.apiKey !== undefined || patch.gemini.model !== undefined)) {
      settings.saveGemini(patch.gemini)
    }

    if (patch?.serial) {
      settings.saveSerial({
        path: typeof patch.serial.path === 'string' ? patch.serial.path : '',
        baudRate: Number(patch.serial.baudRate) || 9600
      })
    }

    return settings.getPublicSettings()
  })

  ipcMain.handle(CHANNELS.geminiDecide, (_event, payload = {}) =>
    gemini.decide({
      sample: payload?.sample,
      aiEnabled: payload?.aiEnabled !== false
    })
  )

  ipcMain.handle(CHANNELS.geminiChat, (event, payload = {}) => {
    const requestId = String(payload?.requestId ?? '')
    if (!requestId) {
      throw new Error('Petición de chat inválida.')
    }

    const sender = event.sender
    const send = (channel, data) => {
      if (!sender.isDestroyed()) sender.send(channel, data)
    }

    void gemini.chat({
      requestId,
      sample: payload.sample,
      prompt: payload.prompt,
      messages: payload.messages,
      onChunk: (text) => send(CHANNELS.geminiChunk, { requestId, text }),
      onDone: (text) => send(CHANNELS.geminiDone, { requestId, text }),
      onError: (message) => send(CHANNELS.geminiError, { requestId, message }),
      onCancelled: (text) => send(CHANNELS.geminiCancelled, { requestId, text })
    })

    return { requestId, model: settings.getModel() }
  })

  ipcMain.handle(CHANNELS.geminiCancel, (_event, requestId) =>
    gemini.cancel(String(requestId ?? ''))
  )

  return () => {
    serial.off('status', statusListener)
    serial.off('sample', sampleListener)
  }
}
