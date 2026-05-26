import { ipcMain } from 'electron'
import { getTemplates, applyTemplate } from '../services/template-service'

export function registerTemplateIpc(): void {
  ipcMain.handle('template:list', async () => {
    try {
      return getTemplates()
    } catch (e: unknown) {
      console.error('[template:list]', e)
      return []
    }
  })

  ipcMain.handle('template:apply', async (_event, templateId: string, configPath: string, agentConfigPath?: string) => {
    try {
      return await applyTemplate(templateId, configPath, agentConfigPath)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error('[template:apply]', message)
      return { success: false, message }
    }
  })
}
