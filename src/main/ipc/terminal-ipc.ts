import { ipcMain, BrowserWindow } from 'electron'
import {
  createTerminal,
  writeToTerminal,
  resizeTerminal,
  destroyTerminal,
  onTerminalData,
  onTerminalExit,
  removeTerminalListeners
} from '../services/terminal-service'

export function registerTerminalIpc(): void {
  ipcMain.handle('terminal:create', async (event, shellPath: string, cwd?: string) => {
    const id = createTerminal(shellPath, cwd)
    const win = BrowserWindow.fromWebContents(event.sender)

    onTerminalData(id, (data) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal:data', id, data)
      }
    })

    onTerminalExit(id, (code) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal:exit', id, code)
      }
      removeTerminalListeners(id)
    })

    return id
  })

  ipcMain.handle('terminal:write', async (_event, id: string, data: string) => {
    writeToTerminal(id, data)
  })

  ipcMain.handle('terminal:resize', async (_event, id: string, cols: number, rows: number) => {
    resizeTerminal(id, cols, rows)
  })

  ipcMain.handle('terminal:destroy', async (_event, id: string) => {
    removeTerminalListeners(id)
    destroyTerminal(id)
  })
}
