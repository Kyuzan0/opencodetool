import { ipcMain, dialog } from 'electron'
import { exportBundle, importBundle, previewBundle } from '../services/bundle-service'

export function registerBundleIpc(): void {
  ipcMain.handle('bundle:export', async (_event, options) => {
    try {
      return await exportBundle(options)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error('[bundle:export]', message)
      return { success: false, message, path: '' }
    }
  })

  ipcMain.handle('bundle:import', async (_event, zipPath: string, targetDir?: string) => {
    try {
      return await importBundle(zipPath, targetDir)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error('[bundle:import]', message)
      return { success: false, message, imported: [], errors: [] }
    }
  })

  ipcMain.handle('bundle:preview', async (_event, zipPath: string) => {
    try {
      return await previewBundle(zipPath)
    } catch (e: unknown) {
      console.error('[bundle:preview]', e)
      return { manifest: null, files: [] }
    }
  })
}
