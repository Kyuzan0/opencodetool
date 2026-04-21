import { ipcMain } from 'electron'
import { scanUninstallTargets, performUninstall } from '../services/uninstall-service'
import type { UninstallOptions } from '../services/uninstall-service'
import { detectOpenCodeApp } from '../services/package-manager-service'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execFile } from 'child_process'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

async function findDesktopUninstaller(): Promise<{ found: boolean; path: string; installPath: string }> {
  // 1. Try registry-detected install path first
  const result = await detectOpenCodeApp()
  if (result.found && result.installPath) {
    const uninstallerPath = join(result.installPath, 'uninstall.exe')
    if (existsSync(uninstallerPath)) {
      return { found: true, path: uninstallerPath, installPath: result.installPath }
    }
  }

  // 2. Fallback: check default install location %LOCALAPPDATA%\Programs\OpenCode\
  const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
  const defaultPath = join(localAppData, 'Programs', 'OpenCode')
  const defaultUninstaller = join(defaultPath, 'uninstall.exe')
  if (existsSync(defaultUninstaller)) {
    return { found: true, path: defaultUninstaller, installPath: defaultPath }
  }

  // 3. Not found
  const knownPath = result.installPath || defaultPath
  return { found: false, path: '', installPath: knownPath }
}

function runDesktopUninstaller(uninstallerPath: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    execFile(uninstallerPath, [], { windowsHide: false }, (error) => {
      if (error) {
        resolve({ success: false, message: error.message })
      } else {
        resolve({ success: true, message: 'Uninstaller launched successfully' })
      }
    })
  })
}

export function registerUninstallIpc(): void {
  ipcMain.handle('uninstall:scan', async () => {
    try {
      return scanUninstallTargets()
    } catch (e: unknown) {
      return ipcError('uninstall:scan', e)
    }
  })

  ipcMain.handle('uninstall:perform', async (_event, options: UninstallOptions) => {
    try {
      return performUninstall(options)
    } catch (e: unknown) {
      return ipcError('uninstall:perform', e)
    }
  })

  ipcMain.handle('uninstall:desktop-check', async () => {
    try {
      return await findDesktopUninstaller()
    } catch (e: unknown) {
      return ipcError('uninstall:desktop-check', e)
    }
  })

  ipcMain.handle('uninstall:desktop-run', async () => {
    try {
      const info = await findDesktopUninstaller()
      if (!info.found) {
        return { success: false, message: 'Uninstaller not found' }
      }
      return await runDesktopUninstaller(info.path)
    } catch (e: unknown) {
      return ipcError('uninstall:desktop-run', e)
    }
  })
}
