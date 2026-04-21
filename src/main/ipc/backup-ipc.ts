import { ipcMain } from 'electron'
import { createBackup, restoreBackup, listBackups, previewBackup } from '../services/backup-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerBackupIpc(): void {
  ipcMain.handle('backup:create', async (_event, configPaths: string[], outputPath: string) => {
    try {
      return createBackup(configPaths, outputPath)
    } catch (e: unknown) {
      return ipcError('backup:create', e)
    }
  })

  ipcMain.handle('backup:restore', async (_event, zipPath: string, targetDir: string) => {
    try {
      return restoreBackup(zipPath, targetDir)
    } catch (e: unknown) {
      return ipcError('backup:restore', e)
    }
  })

  ipcMain.handle('backup:list', async (_event, backupDir: string) => {
    try {
      return listBackups(backupDir)
    } catch (e: unknown) {
      return ipcError('backup:list', e)
    }
  })

  ipcMain.handle('backup:preview', async (_event, zipPath: string) => {
    try {
      return previewBackup(zipPath)
    } catch (e: unknown) {
      return ipcError('backup:preview', e)
    }
  })
}
