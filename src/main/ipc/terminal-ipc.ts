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

// Security: Whitelist of allowed shell executables
const ALLOWED_SHELLS = new Set([
  // Windows
  'powershell.exe', 'pwsh.exe', 'cmd.exe',
  'powershell', 'pwsh', 'cmd',
  // Unix
  'bash', 'zsh', 'sh', 'fish', 'dash',
  // Full paths (common)
  '/bin/bash', '/bin/zsh', '/bin/sh', '/bin/fish', '/usr/bin/bash', '/usr/bin/zsh',
  '/usr/local/bin/bash', '/usr/local/bin/zsh', '/usr/local/bin/fish',
])

function isAllowedShell(shellPath: string): boolean {
  const normalized = shellPath.replace(/\\/g, '/').toLowerCase()
  const shellName = normalized.split('/').pop() || ''
  // Check exact match or basename match
  return ALLOWED_SHELLS.has(shellPath) || ALLOWED_SHELLS.has(shellName) ||
    // Allow full Windows paths to known shells
    /[/\\](powershell|pwsh|cmd)\.exe$/i.test(shellPath) ||
    /[/\\](bash|zsh|sh|fish|dash)$/i.test(shellPath)
}

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerTerminalIpc(): void {
  ipcMain.handle('terminal:create', async (event, shellPath: string, cwd?: string) => {
    try {
      // Security: Validate shell path against whitelist
      if (!isAllowedShell(shellPath)) {
        throw new Error(`Blocked: "${shellPath}" is not an allowed shell executable`)
      }
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
    } catch (e: unknown) {
      return ipcError('terminal:create', e)
    }
  })

  ipcMain.handle('terminal:write', async (_event, id: string, data: string) => {
    try {
      writeToTerminal(id, data)
    } catch (e: unknown) {
      return ipcError('terminal:write', e)
    }
  })

  ipcMain.handle('terminal:resize', async (_event, id: string, cols: number, rows: number) => {
    try {
      resizeTerminal(id, cols, rows)
    } catch (e: unknown) {
      return ipcError('terminal:resize', e)
    }
  })

  ipcMain.handle('terminal:destroy', async (_event, id: string) => {
    try {
      removeTerminalListeners(id)
      destroyTerminal(id)
    } catch (e: unknown) {
      return ipcError('terminal:destroy', e)
    }
  })
}
