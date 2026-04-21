import { ipcMain } from 'electron'
import { scanUninstallTargets, performUninstall } from '../services/uninstall-service'
import type { UninstallOptions } from '../services/uninstall-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerUninstallIpc(): void {
  ipcMain.handle('uninstall:scan', async () => {
    try {
      return scanUninstallTargets()
    } catch (e: unknown) {
      return ipcError('uninstall:scan', e)
    }
  })

  ipcMain.handle('uninstall:perform', async (_event, options: UninstallOptions) => {
    try {
      return performUninstall(options)
    } catch (e: unknown) {
      return ipcError('uninstall:perform', e)
    }
  })
}
