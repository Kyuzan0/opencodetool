import { ipcMain } from 'electron'
import { detectProjects, selectProjectDir, getProjectConfig } from '../services/project-service'

export function registerProjectIpc(): void {
  ipcMain.handle('project:detect', async (_event, searchPaths: string[]) => {
    return detectProjects(searchPaths)
  })

  ipcMain.handle('project:select', async () => {
    return selectProjectDir()
  })

  ipcMain.handle('project:config', async (_event, projectPath: string) => {
    return getProjectConfig(projectPath)
  })
}
