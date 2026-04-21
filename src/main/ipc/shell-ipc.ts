import { ipcMain } from 'electron'
import { detectAvailableShells, getDefaultShell, getShellEnv } from '../services/shell-service'
import type { ShellInfo } from '@shared/types/app-types'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerShellIpc(): void {
  ipcMain.handle('shell:detect', async () => {
    try {
      return detectAvailableShells()
    } catch (e: unknown) {
      return ipcError('shell:detect', e)
    }
  })

  ipcMain.handle('shell:default', async () => {
    try {
      return getDefaultShell()
    } catch (e: unknown) {
      return ipcError('shell:default', e)
    }
  })

  ipcMain.handle('shell:env', async (_event, shell: ShellInfo) => {
    try {
      return getShellEnv(shell)
    } catch (e: unknown) {
      return ipcError('shell:env', e)
    }
  })
}
