import { ipcMain } from 'electron'
import {
  getOpenCodeRuntimeOverview,
  startOpenCode,
  stopOpenCode,
  restartOpenCode,
  type OpenCodeRuntimeMode,
} from '../services/opencode-control-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerOpenCodeControlIpc(): void {
  ipcMain.handle('opencode:status', async () => {
    try {
      return getOpenCodeRuntimeOverview()
    } catch (e: unknown) {
      return ipcError('opencode:status', e)
    }
  })

  ipcMain.handle('opencode:start', async (_event, mode: OpenCodeRuntimeMode, port?: number, force?: boolean) => {
    try {
      return startOpenCode(mode, port, force)
    } catch (e: unknown) {
      return ipcError('opencode:start', e)
    }
  })

  ipcMain.handle('opencode:stop', async (_event, mode: OpenCodeRuntimeMode, port?: number) => {
    try {
      return stopOpenCode(mode, port)
    } catch (e: unknown) {
      return ipcError('opencode:stop', e)
    }
  })

  ipcMain.handle('opencode:restart', async (_event, mode: OpenCodeRuntimeMode, port?: number) => {
    try {
      return restartOpenCode(mode, port)
    } catch (e: unknown) {
      return ipcError('opencode:restart', e)
    }
  })
}
