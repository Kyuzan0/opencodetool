import { readFile, writeFile, copyFile, access, stat } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname, extname } from 'path'
import { homedir } from 'os'
import * as jsonc from 'jsonc-parser'
import type { ConfigLocation } from '@shared/types/app-types'

export async function readConfig(
  filePath: string
): Promise<{ data: Record<string, unknown>; raw: string; format: 'json' | 'jsonc' }> {
  const raw = await readFile(filePath, 'utf-8')
  const format = detectFormat(filePath, raw)
  const errors: jsonc.ParseError[] = []
  const data = jsonc.parse(raw, errors) as Record<string, unknown>
  if (errors.length > 0) {
    const errMsg = errors.map((e) => `${jsonc.printParseErrorCode(e.error)} at offset ${e.offset}`).join(', ')
    throw new Error(`Parse errors in ${filePath}: ${errMsg}`)
  }
  return { data, raw, format }
}

export async function writeConfig(
  filePath: string,
  data: Record<string, unknown>,
  options: { format: 'json' | 'jsonc'; preserveComments?: boolean } = { format: 'json' }
): Promise<void> {
  // Backup before writing if file exists
  if (existsSync(filePath)) {
    await backupConfig(filePath)
  }

  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  let content: string
  if (options.format === 'jsonc' && options.preserveComments && existsSync(filePath)) {
    // Try to preserve comments by modifying the existing file
    const existing = await readFile(filePath, 'utf-8')
    content = applyEditsToJsonc(existing, data)
  } else {
    content = JSON.stringify(data, null, 2) + '\n'
  }

  await writeFile(filePath, content, 'utf-8')
}

export async function backupConfig(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = `${filePath}.backup.${timestamp}`
  await copyFile(filePath, backupPath)
  return backupPath
}

export function validateConfig(
  data: Record<string, unknown>,
  schema: 'opencode' | 'agent'
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (schema === 'opencode') {
    if (data.plugin !== undefined && !Array.isArray(data.plugin)) {
      errors.push('"plugin" must be an array of strings')
    }
    if (data.disabled_providers !== undefined && !Array.isArray(data.disabled_providers)) {
      errors.push('"disabled_providers" must be an array of strings')
    }
    if (data.provider !== undefined && typeof data.provider !== 'object') {
      errors.push('"provider" must be an object')
    }
    if (data.permission !== undefined && typeof data.permission !== 'object') {
      errors.push('"permission" must be an object')
    }
    if (data.model !== undefined && typeof data.model !== 'string') {
      errors.push('"model" must be a string')
    }
    if (data.compaction !== undefined && typeof data.compaction !== 'object') {
      errors.push('"compaction" must be an object')
    }
  } else if (schema === 'agent') {
    if (data.agents !== undefined && typeof data.agents !== 'object') {
      errors.push('"agents" must be an object')
    }
    if (data.categories !== undefined && typeof data.categories !== 'object') {
      errors.push('"categories" must be an object')
    }
    if (data.background_task !== undefined && typeof data.background_task !== 'object') {
      errors.push('"background_task" must be an object')
    }
  }

  return { valid: errors.length === 0, errors }
}

export async function getConfigLocations(): Promise<ConfigLocation[]> {
  const locations: ConfigLocation[] = []
  const home = homedir()

  const candidates = [
    // Global locations
    { type: 'global' as const, path: join(home, '.config', 'opencode', 'opencode.json'), format: 'json' as const },
    { type: 'global' as const, path: join(home, '.config', 'opencode', 'opencode.jsonc'), format: 'jsonc' as const },
    { type: 'global' as const, path: join(home, '.config', 'opencode', 'oh-my-openagent.json'), format: 'json' as const },
    { type: 'global' as const, path: join(home, '.config', 'opencode', 'oh-my-openagent.jsonc'), format: 'jsonc' as const },
    { type: 'global' as const, path: join(home, '.config', 'opencode', 'oh-my-opencode.json'), format: 'json' as const },
    { type: 'global' as const, path: join(home, '.config', 'opencode', 'oh-my-opencode.jsonc'), format: 'jsonc' as const },
  ]

  // Also check APPDATA on Windows
  const appData = process.env.APPDATA
  if (appData) {
    candidates.push(
      { type: 'global', path: join(appData, 'opencode', 'opencode.json'), format: 'json' },
      { type: 'global', path: join(appData, 'opencode', 'oh-my-openagent.json'), format: 'json' },
      { type: 'global', path: join(appData, 'opencode', 'oh-my-openagent.jsonc'), format: 'jsonc' },
    )
  }

  for (const candidate of candidates) {
    let exists = false
    let lastModified: string | undefined
    try {
      await access(candidate.path)
      exists = true
      const stats = await stat(candidate.path)
      lastModified = stats.mtime.toISOString()
    } catch {
      // File doesn't exist
    }
    locations.push({
      type: candidate.type,
      path: candidate.path,
      exists,
      format: candidate.format,
      lastModified
    })
  }

  return locations.filter((l) => l.exists)
}

export async function getProjectConfigLocations(projectPath: string): Promise<ConfigLocation[]> {
  const locations: ConfigLocation[] = []
  const candidates = [
    { path: join(projectPath, '.opencode', 'opencode.json'), format: 'json' as const },
    { path: join(projectPath, '.opencode', 'opencode.jsonc'), format: 'jsonc' as const },
    { path: join(projectPath, '.opencode', 'oh-my-openagent.json'), format: 'json' as const },
    { path: join(projectPath, '.opencode', 'oh-my-openagent.jsonc'), format: 'jsonc' as const },
    { path: join(projectPath, '.opencode', 'oh-my-opencode.json'), format: 'json' as const },
    { path: join(projectPath, '.opencode', 'oh-my-opencode.jsonc'), format: 'jsonc' as const },
    { path: join(projectPath, 'opencode.json'), format: 'json' as const },
    { path: join(projectPath, 'opencode.jsonc'), format: 'jsonc' as const },
  ]

  for (const candidate of candidates) {
    let exists = false
    let lastModified: string | undefined
    try {
      await access(candidate.path)
      exists = true
      const stats = await stat(candidate.path)
      lastModified = stats.mtime.toISOString()
    } catch {
      // File doesn't exist
    }
    if (exists) {
      locations.push({ type: 'project', path: candidate.path, exists, format: candidate.format, lastModified })
    }
  }

  return locations
}

export async function createDefaultConfig(
  type: 'opencode' | 'agent',
  path: string
): Promise<void> {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const defaultConfig =
    type === 'opencode'
      ? {
          $schema: 'https://opencode.ai/config.json',
          provider: {},
          permission: {
            bash: 'ask',
            read: 'allow',
            edit: 'ask'
          },
          model: '',
          plugin: [],
          compaction: { auto: true, prune: false }
        }
      : {
          $schema:
            'https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/oh-my-opencode.schema.json',
          agents: {},
          categories: {}
        }

  await writeFile(path, JSON.stringify(defaultConfig, null, 2) + '\n', 'utf-8')
}

export function mergeConfigs(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base }
  for (const key of Object.keys(override)) {
    const baseVal = base[key]
    const overVal = override[key]
    if (
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal) &&
      typeof overVal === 'object' &&
      overVal !== null &&
      !Array.isArray(overVal)
    ) {
      result[key] = mergeConfigs(
        baseVal as Record<string, unknown>,
        overVal as Record<string, unknown>
      )
    } else {
      result[key] = overVal
    }
  }
  return result
}

// --- Helpers ---

function detectFormat(filePath: string, content: string): 'json' | 'jsonc' {
  if (extname(filePath) === '.jsonc') return 'jsonc'
  // Check for comments in content
  if (/\/\/.*|\/\*[\s\S]*?\*\//.test(content)) return 'jsonc'
  return 'json'
}

function applyEditsToJsonc(existing: string, newData: Record<string, unknown>): string {
  let result = existing
  for (const [key, value] of Object.entries(newData)) {
    const path = [key]
    const edits = jsonc.modify(result, path, value, { formattingOptions: { tabSize: 2, insertSpaces: true } })
    result = jsonc.applyEdits(result, edits)
  }
  return result
}
