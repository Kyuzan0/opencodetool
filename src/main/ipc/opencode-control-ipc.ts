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

  ipcMain.handle('opencode:start', async (_event, mode: OpenCodeRuntimeMode, port?: number) => {
    return startOpenCode(mode, port)
  })

  ipcMain.handle('opencode:stop', async (_event, mode: OpenCodeRuntimeMode) => {
    return stopOpenCode(mode)
  })

  ipcMain.handle('opencode:restart', async (_event, mode: OpenCodeRuntimeMode, port?: number) => {
    return restartOpenCode(mode, port)
  })
}
