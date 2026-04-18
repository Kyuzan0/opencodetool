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
  skill: {
    list: (skillDir: string) => ipcRenderer.invoke('skill:list', skillDir),
    read: (filePath: string) => ipcRenderer.invoke('skill:read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('skill:write', filePath, content),
    delete: (filePath: string) => ipcRenderer.invoke('skill:delete', filePath),
    create: (dir: string, name: string, content: string) => ipcRenderer.invoke('skill:create', dir, name, content)
  },
  terminal: {
    create: (shellPath: string, cwd?: string) => ipcRenderer.invoke('terminal:create', shellPath, cwd),
    write: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    destroy: (id: string) => ipcRenderer.invoke('terminal:destroy', id),
    onData: (callback: (id: string, data: string) => void) => {
      ipcRenderer.on('terminal:data', (_event, id, data) => callback(id, data))
    },
    onExit: (callback: (id: string, code: number | null) => void) => {
      ipcRenderer.on('terminal:exit', (_event, id, code) => callback(id, code))
    },
    removeListeners: () => {
      ipcRenderer.removeAllListeners('terminal:data')
      ipcRenderer.removeAllListeners('terminal:exit')
    }
  },
  backup: {
    create: (configPaths: string[], outputPath: string) => ipcRenderer.invoke('backup:create', configPaths, outputPath),
    restore: (zipPath: string, targetDir: string) => ipcRenderer.invoke('backup:restore', zipPath, targetDir),
    list: (backupDir: string) => ipcRenderer.invoke('backup:list', backupDir),
    preview: (zipPath: string) => ipcRenderer.invoke('backup:preview', zipPath)
  },
  project: {
    detect: (searchPaths: string[]) => ipcRenderer.invoke('project:detect', searchPaths),
    select: () => ipcRenderer.invoke('project:select'),
    config: (projectPath: string) => ipcRenderer.invoke('project:config', projectPath)
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
