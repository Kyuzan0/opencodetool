import { ipcMain } from 'electron'
import { runDiagnostics } from '../services/diagnostics-service'

export function registerDiagnosticsIpc(): void {
  ipcMain.handle('diagnostics:run', async (_event, customOpenCodePath?: string) => {
    try {
      return await runDiagnostics(customOpenCodePath)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error('[diagnostics:run]', message)
      return { error: true, message }
    }
  })
}
