import { ipcMain } from 'electron'
import { detectAvailableShells, getDefaultShell, getShellEnv } from '../services/shell-service'
import type { ShellInfo } from '@shared/types/app-types'

export function registerShellIpc(): void {
  ipcMain.handle('shell:detect', async () => {
    return detectAvailableShells()
  })

  ipcMain.handle('shell:default', async () => {
    return getDefaultShell()
  })

  ipcMain.handle('shell:env', async (_event, shell: ShellInfo) => {
    return getShellEnv(shell)
  })
}
