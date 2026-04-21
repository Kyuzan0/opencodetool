import { ipcMain } from 'electron'
import { detectProjects, selectProjectDir, getProjectConfig } from '../services/project-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerProjectIpc(): void {
  ipcMain.handle('project:detect', async (_event, searchPaths: string[]) => {
    try {
      return detectProjects(searchPaths)
    } catch (e: unknown) {
      return ipcError('project:detect', e)
    }
  })

  ipcMain.handle('project:select', async () => {
    try {
      return selectProjectDir()
    } catch (e: unknown) {
      return ipcError('project:select', e)
    }
  })

  ipcMain.handle('project:config', async (_event, projectPath: string) => {
    try {
      return getProjectConfig(projectPath)
    } catch (e: unknown) {
      return ipcError('project:config', e)
    }
  })
}
