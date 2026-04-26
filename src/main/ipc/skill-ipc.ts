import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { listSkills, readSkill, writeSkill, deleteSkill, createSkill } from '../services/skill-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerSkillIpc(): void {
  ipcMain.handle('skill:list', async (_event, skillDir: string) => {
    try {
      return listSkills(skillDir)
    } catch (e: unknown) {
      return ipcError('skill:list', e)
    }
  })

  ipcMain.handle('skill:read', async (_event, filePath: string) => {
    try {
      return readSkill(filePath)
    } catch (e: unknown) {
      return ipcError('skill:read', e)
    }
  })

  ipcMain.handle('skill:write', async (_event, filePath: string, content: string) => {
    try {
      await writeSkill(filePath, content)
    } catch (e: unknown) {
      return ipcError('skill:write', e)
    }
  })

  ipcMain.handle('skill:delete', async (_event, filePath: string) => {
    try {
      await deleteSkill(filePath)
    } catch (e: unknown) {
      return ipcError('skill:delete', e)
    }
  })

  ipcMain.handle('skill:create', async (_event, dir: string, name: string, content: string) => {
    try {
      return createSkill(dir, name, content)
    } catch (e: unknown) {
      return ipcError('skill:create', e)
    }
  })

  ipcMain.handle('skill:install-npx', async (_event, skillName: string, skillDir: string) => {
    try {
      // Validate skill name to prevent command injection
      if (/[;&|`$(){}]/.test(skillName)) {
        return { stdout: '', stderr: 'Invalid characters in skill name', exitCode: 1 }
      }
      return await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
        exec(
          `npx skills add ${skillName}`,
          { cwd: skillDir || undefined, timeout: 60000 },
          (error, stdout, stderr) => {
            resolve({
              stdout: stdout || '',
              stderr: stderr || '',
              exitCode: error ? ((error as { code?: number }).code ?? 1) : 0
            })
          }
        )
      })
    } catch (e: unknown) {
      return ipcError('skill:install-npx', e)
    }
  })
}
