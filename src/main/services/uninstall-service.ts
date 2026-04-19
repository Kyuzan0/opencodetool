import { rm, readdir, stat, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { uninstallPlugin, listInstalledPackages } from './package-manager-service'

export interface UninstallOptions {
  core: boolean
  plugins: boolean
  mcp: boolean
  skills: boolean
}

export interface UninstallResult {
  removed: string[]
  errors: string[]
}

function getGlobalConfigDirs(): string[] {
  const home = homedir()
  const dirs = [
    join(home, '.config', 'opencode'),
    join(home, '.config', 'kilo')
  ]
  const appData = process.env.APPDATA
  if (appData) {
    dirs.push(join(appData, 'opencode'))
  }
  return dirs
}

async function removePath(target: string, result: UninstallResult): Promise<void> {
  try {
    if (existsSync(target)) {
      const s = await stat(target)
      await rm(target, { recursive: s.isDirectory(), force: true })
      result.removed.push(target)
    }
  } catch (e: any) {
    result.errors.push(`Failed to remove ${target}: ${e.message}`)
  }
}

async function removeCore(result: UninstallResult): Promise<void> {
  const home = homedir()
  const appData = process.env.APPDATA

  // Core config files
  const coreFiles = [
    join(home, '.config', 'opencode', 'opencode.json'),
    join(home, '.config', 'opencode', 'opencode.jsonc'),
    join(home, '.config', 'opencode', 'oh-my-openagent.json'),
    join(home, '.config', 'opencode', 'oh-my-openagent.jsonc'),
    join(home, '.config', 'opencode', 'oh-my-opencode.json'),
    join(home, '.config', 'opencode', 'oh-my-opencode.jsonc'),
    join(home, '.config', 'kilo', 'kilo.json'),
    join(home, '.config', 'kilo', 'kilo.jsonc'),
  ]

  if (appData) {
    coreFiles.push(
      join(appData, 'opencode', 'opencode.json'),
      join(appData, 'opencode', 'oh-my-openagent.json'),
      join(appData, 'opencode', 'oh-my-openagent.jsonc')
    )
  }

  for (const f of coreFiles) {
    await removePath(f, result)
  }
}

async function removePlugins(result: UninstallResult): Promise<void> {
  const home = homedir()
  const configDir = join(home, '.config', 'opencode')

  // Remove node_modules and package.json in config dir (plugin install location)
  const pluginPaths = [
    join(configDir, 'node_modules'),
    join(configDir, 'package.json'),
    join(configDir, 'package-lock.json'),
    join(configDir, 'bun.lockb'),
    join(configDir, 'bun.lock'),
  ]

  for (const p of pluginPaths) {
    await removePath(p, result)
  }
}

async function removeMcp(result: UninstallResult): Promise<void> {
  const home = homedir()

  // MCP config locations
  const mcpPaths = [
    join(home, '.config', 'opencode', 'mcp.json'),
    join(home, '.config', 'opencode', 'mcp.jsonc'),
    join(home, '.config', 'kilo', 'mcp.json'),
    join(home, '.config', 'kilo', 'mcp.jsonc'),
    join(home, '.config', 'opencode', 'mcp'),
    join(home, '.config', 'kilo', 'mcp'),
  ]

  const appData = process.env.APPDATA
  if (appData) {
    mcpPaths.push(
      join(appData, 'opencode', 'mcp.json'),
      join(appData, 'opencode', 'mcp.jsonc')
    )
  }

  for (const p of mcpPaths) {
    await removePath(p, result)
  }
}

async function removeSkills(result: UninstallResult): Promise<void> {
  const home = homedir()

  const skillDirs = [
    join(home, '.config', 'opencode', 'skills'),
    join(home, '.config', 'kilo', 'skill'),
    join(home, '.config', 'opencode', 'skill'),
  ]

  // Also remove command/agent dirs (custom agents and commands)
  const extraDirs = [
    join(home, '.config', 'kilo', 'command'),
    join(home, '.config', 'kilo', 'agent'),
    join(home, '.config', 'opencode', 'command'),
    join(home, '.config', 'opencode', 'agent'),
  ]

  for (const d of [...skillDirs, ...extraDirs]) {
    await removePath(d, result)
  }
}

export async function scanUninstallTargets(): Promise<{
  core: string[]
  plugins: string[]
  mcp: string[]
  skills: string[]
}> {
  const home = homedir()
  const appData = process.env.APPDATA
  const found = { core: [] as string[], plugins: [] as string[], mcp: [] as string[], skills: [] as string[] }

  // Core
  const coreFiles = [
    join(home, '.config', 'opencode', 'opencode.json'),
    join(home, '.config', 'opencode', 'opencode.jsonc'),
    join(home, '.config', 'opencode', 'oh-my-openagent.json'),
    join(home, '.config', 'opencode', 'oh-my-openagent.jsonc'),
    join(home, '.config', 'opencode', 'oh-my-opencode.json'),
    join(home, '.config', 'opencode', 'oh-my-opencode.jsonc'),
    join(home, '.config', 'kilo', 'kilo.json'),
    join(home, '.config', 'kilo', 'kilo.jsonc'),
  ]
  if (appData) {
    coreFiles.push(
      join(appData, 'opencode', 'opencode.json'),
      join(appData, 'opencode', 'oh-my-openagent.json')
    )
  }
  for (const f of coreFiles) {
    if (existsSync(f)) found.core.push(f)
  }

  // Plugins
  const pluginPaths = [
    join(home, '.config', 'opencode', 'node_modules'),
    join(home, '.config', 'opencode', 'package.json'),
  ]
  for (const p of pluginPaths) {
    if (existsSync(p)) found.plugins.push(p)
  }

  // MCP
  const mcpPaths = [
    join(home, '.config', 'opencode', 'mcp.json'),
    join(home, '.config', 'opencode', 'mcp.jsonc'),
    join(home, '.config', 'kilo', 'mcp.json'),
    join(home, '.config', 'kilo', 'mcp.jsonc'),
    join(home, '.config', 'opencode', 'mcp'),
    join(home, '.config', 'kilo', 'mcp'),
  ]
  if (appData) {
    mcpPaths.push(join(appData, 'opencode', 'mcp.json'))
  }
  for (const p of mcpPaths) {
    if (existsSync(p)) found.mcp.push(p)
  }

  // Skills
  const skillDirs = [
    join(home, '.config', 'opencode', 'skills'),
    join(home, '.config', 'kilo', 'skill'),
    join(home, '.config', 'opencode', 'skill'),
    join(home, '.config', 'kilo', 'command'),
    join(home, '.config', 'kilo', 'agent'),
    join(home, '.config', 'opencode', 'command'),
    join(home, '.config', 'opencode', 'agent'),
  ]
  for (const d of skillDirs) {
    if (existsSync(d)) found.skills.push(d)
  }

  return found
}

export async function performUninstall(options: UninstallOptions): Promise<UninstallResult> {
  const result: UninstallResult = { removed: [], errors: [] }

  if (options.core) await removeCore(result)
  if (options.plugins) await removePlugins(result)
  if (options.mcp) await removeMcp(result)
  if (options.skills) await removeSkills(result)

  return result
}
