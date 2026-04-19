import { ipcMain } from 'electron'
import {
  getOpenCodeRuntimeOverview,
  startOpenCode,
  stopOpenCode,
  restartOpenCode,
  type OpenCodeRuntimeMode,
} from '../services/opencode-control-service'

export function registerOpenCodeControlIpc(): void {
  ipcMain.handle('opencode:status', async () => {
    return getOpenCodeRuntimeOverview()
  })

  ipcMain.handle('opencode:start', async (_event, mode: OpenCodeRuntimeMode, port?: number, force?: boolean) => {
    return startOpenCode(mode, port, force)
  })

  ipcMain.handle('opencode:stop', async (_event, mode: OpenCodeRuntimeMode, port?: number) => {
    return stopOpenCode(mode, port)
  })

  ipcMain.handle('opencode:restart', async (_event, mode: OpenCodeRuntimeMode, port?: number) => {
    return restartOpenCode(mode, port)
  })
}
