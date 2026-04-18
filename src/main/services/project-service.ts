import { existsSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'
import { dialog } from 'electron'
import type { ProjectInfo } from '@shared/types/app-types'
import { readConfig } from './config-service'

export async function detectProjects(searchPaths: string[]): Promise<ProjectInfo[]> {
  const projects: ProjectInfo[] = []
  const checked = new Set<string>()

  const paths = [...searchPaths]
  const home = homedir()
  const defaultDirs = [
    join(home, 'projects'),
    join(home, 'dev'),
    join(home, 'code'),
    join(home, 'Documents', 'projects')
  ]
  for (const d of defaultDirs) {
    if (existsSync(d) && !paths.includes(d)) paths.push(d)
  }

  for (const searchPath of paths) {
    if (!existsSync(searchPath) || checked.has(searchPath)) continue
    checked.add(searchPath)

    try {
      const entries = await readdir(searchPath)
      for (const entry of entries) {
        const fullPath = join(searchPath, entry)
        try {
          const s = await stat(fullPath)
          if (!s.isDirectory()) continue

          const hasOpenCode = existsSync(join(fullPath, '.opencode')) ||
            existsSync(join(fullPath, 'opencode.json')) ||
            existsSync(join(fullPath, 'opencode.jsonc'))
          const hasAgent = existsSync(join(fullPath, '.opencode', 'oh-my-openagent.json')) ||
            existsSync(join(fullPath, '.opencode', 'oh-my-openagent.jsonc')) ||
            existsSync(join(fullPath, 'oh-my-openagent.json'))

          if (hasOpenCode || hasAgent) {
            projects.push({
              path: fullPath,
              name: basename(fullPath),
              hasOpenCodeConfig: hasOpenCode,
              hasAgentConfig: hasAgent
            })
          }
        } catch { /* skip inaccessible */ }
      }
    } catch { /* skip inaccessible */ }
  }

  return projects
}

export async function selectProjectDir(): Promise<string | null> {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
}

export async function getProjectConfig(
  projectPath: string
): Promise<{ opencode?: Record<string, unknown>; agent?: Record<string, unknown> }> {
  const result: { opencode?: Record<string, unknown>; agent?: Record<string, unknown> } = {}

  const opencodePaths = [
    join(projectPath, '.opencode', 'opencode.json'),
    join(projectPath, '.opencode', 'opencode.jsonc'),
    join(projectPath, 'opencode.json')
  ]
  for (const p of opencodePaths) {
    if (existsSync(p)) {
      try {
        const r = await readConfig(p)
        result.opencode = r.data
        break
      } catch { /* skip */ }
    }
  }

  const agentPaths = [
    join(projectPath, '.opencode', 'oh-my-openagent.json'),
    join(projectPath, '.opencode', 'oh-my-openagent.jsonc'),
    join(projectPath, 'oh-my-openagent.json')
  ]
  for (const p of agentPaths) {
    if (existsSync(p)) {
      try {
        const r = await readConfig(p)
        result.agent = r.data
        break
      } catch { /* skip */ }
    }
  }

  return result
}
