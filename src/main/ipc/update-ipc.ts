import { ipcMain, BrowserWindow } from 'electron'
import { checkForUpdate, downloadUpdate, cancelDownload, installUpdate } from '../services/update-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerUpdateIpc(): void {
  ipcMain.handle('update:check', async () => {
    try {
      return await checkForUpdate()
    } catch (e: unknown) {
      return ipcError('update:check', e)
    }
  })

  ipcMain.handle('update:download', async (_event, downloadUrl: string) => {
    try {
      const win = BrowserWindow.getAllWindows()[0]
      const result = await downloadUpdate(downloadUrl, (percent, transferred, total) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('update:download-progress', { percent, transferredBytes: transferred, totalBytes: total })
        }
      })
      return result
    } catch (e: unknown) {
      return ipcError('update:download', e)
    }
  })

  ipcMain.handle('update:cancel-download', () => {
    try {
      cancelDownload()
      return { success: true }
    } catch (e: unknown) {
      return ipcError('update:cancel-download', e)
    }
  })

  ipcMain.handle('update:install', (_event, installerPath: string) => {
    try {
      return installUpdate(installerPath)
    } catch (e: unknown) {
      return ipcError('update:install', e)
    }
  })
}
