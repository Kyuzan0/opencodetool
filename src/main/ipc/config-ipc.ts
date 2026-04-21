import { ipcMain, dialog, shell } from 'electron'
import {
  readConfig,
  writeConfig,
  validateConfig,
  getConfigLocations,
  getProjectConfigLocations,
  createDefaultConfig,
  getDefaultConfigPath,
  backupConfig
} from '../services/config-service'
import { watchFile, unwatchFile, suppressFileChange } from '../services/file-watcher-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerConfigIpc(): void {
  ipcMain.handle('config:read', async (_event, filePath: string) => {
    try {
      return readConfig(filePath)
    } catch (e: unknown) {
      return ipcError('config:read', e)
    }
  })

  ipcMain.handle(
    'config:write',
    async (_event, filePath: string, data: Record<string, unknown>, options: { format: 'json' | 'jsonc'; preserveComments?: boolean }) => {
      try {
        suppressFileChange(filePath)
        await writeConfig(filePath, data, options)
      } catch (e: unknown) {
        return ipcError('config:write', e)
      }
    }
  )

  ipcMain.handle(
    'config:validate',
    async (_event, data: Record<string, unknown>, schema: 'opencode' | 'agent') => {
      try {
        return validateConfig(data, schema)
      } catch (e: unknown) {
        return ipcError('config:validate', e)
      }
    }
  )

  ipcMain.handle('config:locations', async () => {
    try {
      return getConfigLocations()
    } catch (e: unknown) {
      return ipcError('config:locations', e)
    }
  })

  ipcMain.handle('config:project-locations', async (_event, projectPath: string) => {
    try {
      return getProjectConfigLocations(projectPath)
    } catch (e: unknown) {
      return ipcError('config:project-locations', e)
    }
  })

  ipcMain.handle('config:create-default', async (_event, type: 'opencode' | 'agent', path?: string) => {
    try {
      const targetPath = path || getDefaultConfigPath(type)
      await createDefaultConfig(type, targetPath)
      return targetPath
    } catch (e: unknown) {
      return ipcError('config:create-default', e)
    }
  })

  ipcMain.handle('config:backup', async (_event, filePath: string) => {
    try {
      return backupConfig(filePath)
    } catch (e: unknown) {
      return ipcError('config:backup', e)
    }
  })

  ipcMain.handle('dialog:open-file', async (_event, options?: Electron.OpenDialogOptions) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json', 'jsonc'] }],
        ...options
      })
      return result.canceled ? null : result.filePaths[0]
    } catch (e: unknown) {
      return ipcError('dialog:open-file', e)
    }
  })

  ipcMain.handle('dialog:open-directory', async () => {
    try {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
      return result.canceled ? null : result.filePaths[0]
    } catch (e: unknown) {
      return ipcError('dialog:open-directory', e)
    }
  })

  ipcMain.handle('dialog:save-file', async (_event, options?: Electron.SaveDialogOptions) => {
    try {
      const result = await dialog.showSaveDialog({
        filters: [{ name: 'JSON Files', extensions: ['json', 'jsonc'] }],
        ...options
      })
      return result.canceled ? null : result.filePath
    } catch (e: unknown) {
      return ipcError('dialog:save-file', e)
    }
  })

  // Open file in default external editor/IDE
  ipcMain.handle('config:open-external', async (_event, filePath: string) => {
    try {
      return shell.openPath(filePath)
    } catch (e: unknown) {
      return ipcError('config:open-external', e)
    }
  })

  // File watcher: start watching a config file for external changes
  ipcMain.handle('file-watcher:watch', async (_event, filePath: string) => {
    try {
      watchFile(filePath)
    } catch (e: unknown) {
      return ipcError('file-watcher:watch', e)
    }
  })

  // File watcher: stop watching a config file
  ipcMain.handle('file-watcher:unwatch', async (_event, filePath: string) => {
    try {
      unwatchFile(filePath)
    } catch (e: unknown) {
      return ipcError('file-watcher:unwatch', e)
    }
  })
}
