import { ipcMain } from 'electron'
import { listSkills, readSkill, writeSkill, deleteSkill, createSkill } from '../services/skill-service'

export function registerSkillIpc(): void {
  ipcMain.handle('skill:list', async (_event, skillDir: string) => {
    return listSkills(skillDir)
  })

  ipcMain.handle('skill:read', async (_event, filePath: string) => {
    return readSkill(filePath)
  })

  ipcMain.handle('skill:write', async (_event, filePath: string, content: string) => {
    await writeSkill(filePath, content)
  })

  ipcMain.handle('skill:delete', async (_event, filePath: string) => {
    await deleteSkill(filePath)
  })

  ipcMain.handle('skill:create', async (_event, dir: string, name: string, content: string) => {
    return createSkill(dir, name, content)
  })
}
