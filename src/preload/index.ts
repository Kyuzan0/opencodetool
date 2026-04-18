import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  config: {
    read: (filePath: string) => ipcRenderer.invoke('config:read', filePath),
    write: (filePath: string, data: Record<string, unknown>, options: { format: string; preserveComments?: boolean }) =>
      ipcRenderer.invoke('config:write', filePath, data, options),
    validate: (data: Record<string, unknown>, schema: string) => ipcRenderer.invoke('config:validate', data, schema),
    locations: () => ipcRenderer.invoke('config:locations'),
    projectLocations: (projectPath: string) => ipcRenderer.invoke('config:project-locations', projectPath),
    createDefault: (type: string, path: string) => ipcRenderer.invoke('config:create-default', type, path),
    backup: (filePath: string) => ipcRenderer.invoke('config:backup', filePath)
  },
  pm: {
    detect: () => ipcRenderer.invoke('pm:detect'),
    install: (pluginName: string, configDir: string) => ipcRenderer.invoke('pm:install', pluginName, configDir),
    uninstall: (pluginName: string, configDir: string) => ipcRenderer.invoke('pm:uninstall', pluginName, configDir),
    list: (configDir: string) => ipcRenderer.invoke('pm:list', configDir)
  },
  shell: {
    detect: () => ipcRenderer.invoke('shell:detect'),
    default: () => ipcRenderer.invoke('shell:default')
  },
  dialog: {
    openFile: (options?: Record<string, unknown>) => ipcRenderer.invoke('dialog:open-file', options),
    openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),
    saveFile: (options?: Record<string, unknown>) => ipcRenderer.invoke('dialog:save-file', options)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
