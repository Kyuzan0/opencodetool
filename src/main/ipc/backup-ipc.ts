import { ipcMain } from 'electron'
import { createBackup, restoreBackup, listBackups, previewBackup } from '../services/backup-service'

export function registerBackupIpc(): void {
  ipcMain.handle('backup:create', async (_event, configPaths: string[], outputPath: string) => {
    return createBackup(configPaths, outputPath)
  })

  ipcMain.handle('backup:restore', async (_event, zipPath: string, targetDir: string) => {
    return restoreBackup(zipPath, targetDir)
  })

  ipcMain.handle('backup:list', async (_event, backupDir: string) => {
    return listBackups(backupDir)
  })

  ipcMain.handle('backup:preview', async (_event, zipPath: string) => {
    return previewBackup(zipPath)
  })
}
