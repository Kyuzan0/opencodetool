import { ipcMain } from 'electron'
import { scanUninstallTargets, performUninstall } from '../services/uninstall-service'
import type { UninstallOptions } from '../services/uninstall-service'

export function registerUninstallIpc(): void {
  ipcMain.handle('uninstall:scan', async () => {
    return scanUninstallTargets()
  })

  ipcMain.handle('uninstall:perform', async (_event, options: UninstallOptions) => {
    return performUninstall(options)
  })
}
