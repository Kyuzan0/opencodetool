import { ipcMain } from 'electron'
import { parseGitHubUrl, getRepoInfo, installGitHubSkill } from '../services/github-skill-service'

function ipcError(channel: string, e: unknown): { error: true; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: true, message }
}

export function registerGitHubSkillIpc(): void {
  ipcMain.handle(
    'github-skill:info',
    async (_event, url: string) => {
      try {
        const { owner, repo } = parseGitHubUrl(url)
        return getRepoInfo(owner, repo)
      } catch (e: unknown) {
        return ipcError('github-skill:info', e)
      }
    }
  )

  ipcMain.handle(
    'github-skill:install',
    async (_event, url: string, skillDir: string) => {
      try {
        const { owner, repo } = parseGitHubUrl(url)
        const info = await getRepoInfo(owner, repo)
        return installGitHubSkill(owner, repo, info.defaultBranch, skillDir)
      } catch (e: unknown) {
        return ipcError('github-skill:install', e)
      }
    }
  )
}
