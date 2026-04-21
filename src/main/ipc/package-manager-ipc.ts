import { ipcMain } from 'electron'
import {
  detectBun,
  detectNpm,
  detectOpenCode,
  detectOpenCodeApp,
  getPreferredPackageManager,
  installPlugin,
  installOpenCode,
  uninstallPlugin,
  listInstalledPackages,
  runCommand
} from '../services/package-manager-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerPackageManagerIpc(): void {
  ipcMain.handle('pm:detect', async () => {
    try {
      const [bun, npm] = await Promise.all([detectBun(), detectNpm()])
      const preferred = bun ? 'bun' : 'npm'
      return { bun, npm, preferred }
    } catch (e: unknown) {
      return ipcError('pm:detect', e)
    }
  })

  ipcMain.handle('pm:install', async (_event, pluginName: string, configDir: string) => {
    try {
      return installPlugin(pluginName, configDir)
    } catch (e: unknown) {
      return ipcError('pm:install', e)
    }
  })

  ipcMain.handle('pm:uninstall', async (_event, pluginName: string, configDir: string) => {
    try {
      return uninstallPlugin(pluginName, configDir)
    } catch (e: unknown) {
      return ipcError('pm:uninstall', e)
    }
  })

  ipcMain.handle('pm:list', async (_event, configDir: string) => {
    try {
      return listInstalledPackages(configDir)
    } catch (e: unknown) {
      return ipcError('pm:list', e)
    }
  })

  ipcMain.handle('pm:run-command', async (_event, command: string, args: string[], cwd: string) => {
    try {
      return runCommand(command, args, cwd)
    } catch (e: unknown) {
      return ipcError('pm:run-command', e)
    }
  })

  ipcMain.handle('pm:detect-opencode', async () => {
    try {
      return detectOpenCode()
    } catch (e: unknown) {
      return ipcError('pm:detect-opencode', e)
    }
  })

  ipcMain.handle('pm:detect-opencode-app', async () => {
    try {
      return detectOpenCodeApp()
    } catch (e: unknown) {
      return ipcError('pm:detect-opencode-app', e)
    }
  })

  ipcMain.handle('pm:install-opencode', async (_event, pm: 'npm' | 'bun') => {
    try {
      return installOpenCode(pm)
    } catch (e: unknown) {
      return ipcError('pm:install-opencode', e)
    }
  })

  ipcMain.handle('pm:openagent-doctor', async () => {
    try {
      const bun = await detectBun()
      if (bun) {
        return runCommand(bun.path, ['x', 'oh-my-openagent', 'doctor', '--json'], undefined, 60000)
      }
      return runCommand('npx', ['oh-my-openagent', 'doctor', '--json'], undefined, 60000)
    } catch (e: unknown) {
      return ipcError('pm:openagent-doctor', e)
    }
  })

  ipcMain.handle('pm:openagent-version', async () => {
    try {
      const bun = await detectBun()
      if (bun) {
        return runCommand(bun.path, ['x', 'oh-my-openagent', '--version'], undefined, 15000)
      }
      return runCommand('npx', ['oh-my-openagent', '--version'], undefined, 15000)
    } catch (e: unknown) {
      return ipcError('pm:openagent-version', e)
    }
  })
}
