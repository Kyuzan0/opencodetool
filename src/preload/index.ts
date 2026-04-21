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
    createDefault: (type: string, path?: string) => ipcRenderer.invoke('config:create-default', type, path),
    backup: (filePath: string) => ipcRenderer.invoke('config:backup', filePath),
    openExternal: (filePath: string) => ipcRenderer.invoke('config:open-external', filePath)
  },
  pm: {
    detect: () => ipcRenderer.invoke('pm:detect'),
    install: (pluginName: string, configDir: string) => ipcRenderer.invoke('pm:install', pluginName, configDir),
    uninstall: (pluginName: string, configDir: string) => ipcRenderer.invoke('pm:uninstall', pluginName, configDir),
    list: (configDir: string) => ipcRenderer.invoke('pm:list', configDir),
    detectOpenCode: () => ipcRenderer.invoke('pm:detect-opencode'),
    detectOpenCodeApp: () => ipcRenderer.invoke('pm:detect-opencode-app'),
    installOpenCode: (pm: 'npm' | 'bun') => ipcRenderer.invoke('pm:install-opencode', pm),
    openagentDoctor: () => ipcRenderer.invoke('pm:openagent-doctor'),
    openagentVersion: () => ipcRenderer.invoke('pm:openagent-version')
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
  uninstall: {
    scan: () => ipcRenderer.invoke('uninstall:scan'),
    perform: (options: { cli: boolean; core: boolean; plugins: boolean; mcp: boolean; skills: boolean; sessions: boolean; projectData: boolean; projectPaths?: string[] }) =>
      ipcRenderer.invoke('uninstall:perform', options),
    desktopCheck: () => ipcRenderer.invoke('uninstall:desktop-check'),
    desktopRun: () => ipcRenderer.invoke('uninstall:desktop-run')
  },
  opencode: {
    status: () => ipcRenderer.invoke('opencode:status'),
    start: (mode: 'cli' | 'web', port?: number, force?: boolean) => ipcRenderer.invoke('opencode:start', mode, port, force),
    stop: (mode: 'cli' | 'web', port?: number) => ipcRenderer.invoke('opencode:stop', mode, port),
    restart: (mode: 'cli' | 'web', port?: number) => ipcRenderer.invoke('opencode:restart', mode, port)
  },
  dialog: {
    openFile: (options?: Record<string, unknown>) => ipcRenderer.invoke('dialog:open-file', options),
    openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),
    saveFile: (options?: Record<string, unknown>) => ipcRenderer.invoke('dialog:save-file', options)
  },
  githubSkill: {
    info: (url: string) => ipcRenderer.invoke('github-skill:info', url),
    install: (url: string, skillDir: string) => ipcRenderer.invoke('github-skill:install', url, skillDir)
  },
  smithery: {
    list: (namespace: string) =>
      ipcRenderer.invoke('smithery:list', namespace),
    get: (namespace: string, slug: string) =>
      ipcRenderer.invoke('smithery:get', namespace, slug),
    fetchContent: (gitUrl: string) =>
      ipcRenderer.invoke('smithery:fetch-content', gitUrl),
    install: (skillDir: string, name: string, gitUrl: string) =>
      ipcRenderer.invoke('smithery:install', skillDir, name, gitUrl)
  },
  fileWatcher: {
    watch: (filePath: string) => ipcRenderer.invoke('file-watcher:watch', filePath),
    unwatch: (filePath: string) => ipcRenderer.invoke('file-watcher:unwatch', filePath),
    onChanged: (callback: (filePath: string) => void) => {
      ipcRenderer.on('file-watcher:changed', (_event, filePath) => callback(filePath))
    },
    removeListeners: () => {
      ipcRenderer.removeAllListeners('file-watcher:changed')
    }
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
  ;(window as Record<string, unknown>).electron = electronAPI
  ;(window as Record<string, unknown>).api = api
}
