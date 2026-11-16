import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/channels.js'

function subscribe(channel, callback) {
  if (typeof callback !== 'function') return () => {}

  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)

  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  app: {
    info: () => ipcRenderer.invoke(CHANNELS.appInfo)
  },
  serial: {
    listPorts: () => ipcRenderer.invoke(CHANNELS.serialList),
    connect: (options) => ipcRenderer.invoke(CHANNELS.serialConnect, options),
    disconnect: () => ipcRenderer.invoke(CHANNELS.serialDisconnect),
    startDemo: () => ipcRenderer.invoke(CHANNELS.serialDemoStart),
    stopDemo: () => ipcRenderer.invoke(CHANNELS.serialDemoStop),
    send: (payload) => ipcRenderer.invoke(CHANNELS.serialSend, payload),
    onSample: (callback) => subscribe(CHANNELS.serialSample, callback),
    onStatus: (callback) => subscribe(CHANNELS.serialStatus, callback)
  },
  settings: {
    get: () => ipcRenderer.invoke(CHANNELS.settingsGet),
    save: (patch) => ipcRenderer.invoke(CHANNELS.settingsSave, patch)
  },
  gemini: {
    decide: (payload) => ipcRenderer.invoke(CHANNELS.geminiDecide, payload),
    chat: (payload) => ipcRenderer.invoke(CHANNELS.geminiChat, payload),
    cancel: (requestId) => ipcRenderer.invoke(CHANNELS.geminiCancel, requestId),
    onChunk: (callback) => subscribe(CHANNELS.geminiChunk, callback),
    onDone: (callback) => subscribe(CHANNELS.geminiDone, callback),
    onError: (callback) => subscribe(CHANNELS.geminiError, callback),
    onCancelled: (callback) => subscribe(CHANNELS.geminiCancelled, callback)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.api = api
}
