import { ipcMain } from 'electron'
import { getTrendingMcps, getInstalledMcps, installMcp, uninstallMcp, toggleMcp, getPluginMcps, togglePluginMcp } from '../services/mcp-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerMcpIpc(): void {
  ipcMain.handle('mcp:trending', async () => {
    try {
      return getTrendingMcps()
    } catch (e: unknown) {
      return ipcError('mcp:trending', e)
    }
  })

  ipcMain.handle('mcp:installed', async (_event, configPath: string) => {
    try {
      return getInstalledMcps(configPath)
    } catch (e: unknown) {
      return ipcError('mcp:installed', e)
    }
  })

  ipcMain.handle(
    'mcp:install',
    async (
      _event,
      configPath: string,
      name: string,
      command: string,
      args: string[],
      env?: Record<string, string>
    ) => {
      try {
        return installMcp(configPath, name, command, args, env)
      } catch (e: unknown) {
        return ipcError('mcp:install', e)
      }
    }
  )

  ipcMain.handle(
    'mcp:uninstall',
    async (_event, configPath: string, name: string) => {
      try {
        return uninstallMcp(configPath, name)
      } catch (e: unknown) {
        return ipcError('mcp:uninstall', e)
      }
    }
  )

  ipcMain.handle(
    'mcp:toggle',
    async (_event, configPath: string, name: string, disabled: boolean) => {
      try {
        return toggleMcp(configPath, name, disabled)
      } catch (e: unknown) {
        return ipcError('mcp:toggle', e)
      }
    }
  )

  ipcMain.handle('mcp:plugin-installed', async (_event, pluginConfigPath: string) => {
    try {
      return getPluginMcps(pluginConfigPath)
    } catch (e: unknown) {
      return ipcError('mcp:plugin-installed', e)
    }
  })

  ipcMain.handle(
    'mcp:plugin-toggle',
    async (_event, pluginConfigPath: string, name: string, disabled: boolean) => {
      try {
        return togglePluginMcp(pluginConfigPath, name, disabled)
      } catch (e: unknown) {
        return ipcError('mcp:plugin-toggle', e)
      }
    }
  )
}
