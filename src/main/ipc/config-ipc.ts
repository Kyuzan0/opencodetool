import { ipcMain, dialog, shell } from 'electron'
import {
  readConfig,
  writeConfig,
  validateConfig,
  getConfigLocations,
  getProjectConfigLocations,
  createDefaultConfig,
  backupConfig
} from '../services/config-service'
import { watchFile, unwatchFile, suppressFileChange } from '../services/file-watcher-service'

export function registerConfigIpc(): void {
  ipcMain.handle('config:read', async (_event, filePath: string) => {
    return readConfig(filePath)
  })

  ipcMain.handle(
    'config:write',
    async (_event, filePath: string, data: Record<string, unknown>, options: { format: 'json' | 'jsonc'; preserveComments?: boolean }) => {
      // Suppress file watcher notification for this write (app-initiated save)
      suppressFileChange(filePath)
      await writeConfig(filePath, data, options)
    }
  )

  ipcMain.handle(
    'config:validate',
    async (_event, data: Record<string, unknown>, schema: 'opencode' | 'agent') => {
      return validateConfig(data, schema)
    }
  )

  ipcMain.handle('config:locations', async () => {
    return getConfigLocations()
  })

  ipcMain.handle('config:project-locations', async (_event, projectPath: string) => {
    return getProjectConfigLocations(projectPath)
  })

  ipcMain.handle('config:create-default', async (_event, type: 'opencode' | 'agent', path: string) => {
    await createDefaultConfig(type, path)
  })

  ipcMain.handle('config:backup', async (_event, filePath: string) => {
    return backupConfig(filePath)
  })

  ipcMain.handle('dialog:open-file', async (_event, options?: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json', 'jsonc'] }],
      ...options
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:open-directory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:save-file', async (_event, options?: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'JSON Files', extensions: ['json', 'jsonc'] }],
      ...options
    })
    return result.canceled ? null : result.filePath
  })

  // Open file in default external editor/IDE
  ipcMain.handle('config:open-external', async (_event, filePath: string) => {
    return shell.openPath(filePath)
  })

  // File watcher: start watching a config file for external changes
  ipcMain.handle('file-watcher:watch', async (_event, filePath: string) => {
    watchFile(filePath)
  })

  // File watcher: stop watching a config file
  ipcMain.handle('file-watcher:unwatch', async (_event, filePath: string) => {
    unwatchFile(filePath)
  })
}
