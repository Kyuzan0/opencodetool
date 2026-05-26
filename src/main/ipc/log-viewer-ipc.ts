import { ipcMain } from 'electron'
import { listSessions, readSessionLog } from '../services/log-viewer-service'

export function registerLogViewerIpc(): void {
  ipcMain.handle('logs:sessions', async (_event, limit?: number) => {
    try {
      return await listSessions(limit)
    } catch (e: unknown) {
      console.error('[logs:sessions]', e)
      return []
    }
  })

  ipcMain.handle('logs:read', async (_event, sessionPath: string) => {
    try {
      return await readSessionLog(sessionPath)
    } catch (e: unknown) {
      console.error('[logs:read]', e)
      return []
    }
  })
}
