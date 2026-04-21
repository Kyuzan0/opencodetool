import { ipcMain } from 'electron'
import { listAllSmitherySkills, getSmitherySkill, fetchSkillContent } from '../services/smithery-service'
import { createSkill } from '../services/skill-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerSmitheryIpc(): void {
  ipcMain.handle(
    'smithery:list',
    async (_event, namespace: string) => {
      try {
        return listAllSmitherySkills(namespace)
      } catch (e: unknown) {
        return ipcError('smithery:list', e)
      }
    }
  )

  ipcMain.handle(
    'smithery:get',
    async (_event, namespace: string, slug: string) => {
      try {
        return getSmitherySkill(namespace, slug)
      } catch (e: unknown) {
        return ipcError('smithery:get', e)
      }
    }
  )

  ipcMain.handle(
    'smithery:fetch-content',
    async (_event, gitUrl: string) => {
      try {
        return fetchSkillContent(gitUrl)
      } catch (e: unknown) {
        return ipcError('smithery:fetch-content', e)
      }
    }
  )

  ipcMain.handle(
    'smithery:install',
    async (_event, skillDir: string, name: string, gitUrl: string) => {
      try {
        const content = await fetchSkillContent(gitUrl)
        const filePath = await createSkill(skillDir, name, content)
        return { filePath, content }
      } catch (e: unknown) {
        return ipcError('smithery:install', e)
      }
    }
  )
}
