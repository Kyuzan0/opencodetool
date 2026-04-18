import { ipcMain } from 'electron'
import {
  detectBun,
  detectNpm,
  getPreferredPackageManager,
  installPlugin,
  uninstallPlugin,
  listInstalledPackages,
  runCommand
} from '../services/package-manager-service'

export function registerPackageManagerIpc(): void {
  ipcMain.handle('pm:detect', async () => {
    const [bun, npm] = await Promise.all([detectBun(), detectNpm()])
    const preferred = bun ? 'bun' : 'npm'
    return { bun, npm, preferred }
  })

  ipcMain.handle('pm:install', async (_event, pluginName: string, configDir: string) => {
    return installPlugin(pluginName, configDir)
  })

  ipcMain.handle('pm:uninstall', async (_event, pluginName: string, configDir: string) => {
    return uninstallPlugin(pluginName, configDir)
  })

  ipcMain.handle('pm:list', async (_event, configDir: string) => {
    return listInstalledPackages(configDir)
  })

  ipcMain.handle('pm:run-command', async (_event, command: string, args: string[], cwd: string) => {
    return runCommand(command, args, cwd)
  })
}
