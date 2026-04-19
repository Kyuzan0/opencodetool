import { rm, readdir, stat, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { detectBun, detectOpenCode, runCommand } from './package-manager-service'

export interface UninstallOptions {
  cli: boolean
  core: boolean
  plugins: boolean
  mcp: boolean
  skills: boolean
  sessions: boolean
  projectData: boolean
  projectPaths?: string[]
}

export interface UninstallResult {
  removed: string[]
  errors: string[]
}

// ── Path helpers ────────────────────────────────────────────────────

function getHome(): string {
  return homedir()
}

function getConfigDirs(): { opencode: string; kilo: string } {
  const home = getHome()
  return {
    opencode: join(home, '.config', 'opencode'),
    kilo: join(home, '.config', 'kilo')
  }
}

function getDataDirs(): { opencode: string; kilo: string } {
  const home = getHome()
  return {
    opencode: join(home, '.local', 'share', 'opencode'),
    kilo: join(home, '.local', 'share', 'kilo')
  }
}

function getStateDirs(): { opencode: string; kilo: string } {
  const home = getHome()
  return {
    opencode: join(home, '.local', 'state', 'opencode'),
    kilo: join(home, '.local', 'state', 'kilo')
  }
}

function getAppDataDirs(): string[] {
  const dirs: string[] = []
  const appData = process.env.APPDATA
  if (appData) {
    dirs.push(join(appData, 'opencode'))
    dirs.push(join(appData, 'kilo'))
  }
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    dirs.push(join(localAppData, 'opencode'))
    dirs.push(join(localAppData, 'kilo'))
  }
  return dirs
}

// ── Remove helper ───────────────────────────────────────────────────

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

// ── Removal functions ───────────────────────────────────────────────

async function removeCli(result: UninstallResult): Promise<void> {
  const bun = await detectBun()
  if (bun) {
    try {
      const bunResult = await runCommand(bun.path, ['remove', '-g', 'opencode-ai'], undefined, 30000)
      if (bunResult.exitCode === 0) {
        result.removed.push('opencode-ai (bun global)')
        return
      }
    } catch { /* try npm next */ }
  }

  try {
    const npmResult = await runCommand('npm', ['uninstall', '-g', 'opencode-ai'], undefined, 30000)
    if (npmResult.exitCode === 0) {
      result.removed.push('opencode-ai (npm global)')
    } else {
      result.errors.push(`Failed to uninstall CLI: ${npmResult.stderr || 'unknown error'}`)
    }
  } catch (e: any) {
    result.errors.push(`Failed to uninstall CLI: ${e.message}`)
  }
}

async function removeCore(result: UninstallResult): Promise<void> {
  const { opencode, kilo } = getConfigDirs()

  // Remove ENTIRE config directories (not just individual files)
  await removePath(opencode, result)
  await removePath(kilo, result)

  // Also remove AppData directories
  for (const dir of getAppDataDirs()) {
    await removePath(dir, result)
  }
}

async function removePlugins(result: UninstallResult): Promise<void> {
  // Plugins live inside the config dirs. If core removal already deleted them,
  // this handles the case where core=false but plugins=true.
  const { opencode, kilo } = getConfigDirs()

  const pluginPaths = [
    join(opencode, 'node_modules'),
    join(opencode, 'package.json'),
    join(opencode, 'package-lock.json'),
    join(opencode, 'bun.lockb'),
    join(opencode, 'bun.lock'),
    join(kilo, 'node_modules'),
    join(kilo, 'package.json'),
    join(kilo, 'package-lock.json'),
    join(kilo, 'bun.lockb'),
    join(kilo, 'bun.lock'),
  ]

  for (const p of pluginPaths) {
    await removePath(p, result)
  }
}

async function removeMcp(result: UninstallResult): Promise<void> {
  const { opencode, kilo } = getConfigDirs()

  const mcpPaths = [
    join(opencode, 'mcp.json'),
    join(opencode, 'mcp.jsonc'),
    join(kilo, 'mcp.json'),
    join(kilo, 'mcp.jsonc'),
    join(opencode, 'mcp'),
    join(kilo, 'mcp'),
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
  const { opencode, kilo } = getConfigDirs()

  const dirs = [
    join(opencode, 'skills'),
    join(opencode, 'skill'),
    join(opencode, 'command'),
    join(opencode, 'agent'),
    join(kilo, 'skill'),
    join(kilo, 'command'),
    join(kilo, 'agent'),
  ]

  for (const d of dirs) {
    await removePath(d, result)
  }
}

async function removeSessions(result: UninstallResult): Promise<void> {
  const data = getDataDirs()
  const state = getStateDirs()

  // Remove entire data directories (contains DB, logs, snapshots, auth, tool-output)
  await removePath(data.opencode, result)
  await removePath(data.kilo, result)

  // Remove state directories (contains locks)
  await removePath(state.opencode, result)
  await removePath(state.kilo, result)

  // Remove AppData directories (contains WebView cache etc.)
  for (const dir of getAppDataDirs()) {
    await removePath(dir, result)
  }
}

async function removeProjectData(projectPaths: string[], result: UninstallResult): Promise<void> {
  for (const projectPath of projectPaths) {
    if (!existsSync(projectPath)) continue

    // Remove all OpenCode/Kilo/Sisyphus state directories in the project
    const projectStateDirs = [
      join(projectPath, '.opencode'),
      join(projectPath, '.kilo'),
      join(projectPath, '.sisyphus'),
    ]

    for (const d of projectStateDirs) {
      await removePath(d, result)
    }
  }
}

// ── Scan ────────────────────────────────────────────────────────────

export async function scanUninstallTargets(): Promise<{
  cli: string[]
  core: string[]
  plugins: string[]
  mcp: string[]
  skills: string[]
  sessions: string[]
  projectData: string[]
}> {
  const { opencode, kilo } = getConfigDirs()
  const data = getDataDirs()
  const state = getStateDirs()
  const appData = process.env.APPDATA

  const found = {
    cli: [] as string[],
    core: [] as string[],
    plugins: [] as string[],
    mcp: [] as string[],
    skills: [] as string[],
    sessions: [] as string[],
    projectData: [] as string[],
  }

  // CLI
  try {
    const oc = await detectOpenCode()
    if (oc.found) {
      found.cli.push(`opencode-ai v${oc.version} (${oc.path})`)
    }
  } catch { /* ignore */ }

  // Core — show entire directories
  if (existsSync(opencode)) found.core.push(opencode)
  if (existsSync(kilo)) found.core.push(kilo)
  for (const dir of getAppDataDirs()) {
    if (existsSync(dir)) found.core.push(dir)
  }

  // Plugins
  const pluginPaths = [
    join(opencode, 'node_modules'),
    join(opencode, 'package.json'),
    join(kilo, 'node_modules'),
    join(kilo, 'package.json'),
  ]
  for (const p of pluginPaths) {
    if (existsSync(p)) found.plugins.push(p)
  }

  // MCP
  const mcpPaths = [
    join(opencode, 'mcp.json'),
    join(opencode, 'mcp.jsonc'),
    join(kilo, 'mcp.json'),
    join(kilo, 'mcp.jsonc'),
    join(opencode, 'mcp'),
    join(kilo, 'mcp'),
  ]
  if (appData) {
    mcpPaths.push(join(appData, 'opencode', 'mcp.json'))
  }
  for (const p of mcpPaths) {
    if (existsSync(p)) found.mcp.push(p)
  }

  // Skills
  const skillDirs = [
    join(opencode, 'skills'),
    join(opencode, 'skill'),
    join(opencode, 'command'),
    join(opencode, 'agent'),
    join(kilo, 'skill'),
    join(kilo, 'command'),
    join(kilo, 'agent'),
  ]
  for (const d of skillDirs) {
    if (existsSync(d)) found.skills.push(d)
  }

  // Sessions & data
  if (existsSync(data.opencode)) {
    try {
      const dbPath = join(data.opencode, 'opencode.db')
      if (existsSync(dbPath)) {
        const s = await stat(dbPath)
        const sizeMB = (s.size / (1024 * 1024)).toFixed(1)
        found.sessions.push(`${data.opencode} (DB: ${sizeMB} MB)`)
      } else {
        found.sessions.push(data.opencode)
      }
    } catch {
      found.sessions.push(data.opencode)
    }
  }
  if (existsSync(data.kilo)) {
    try {
      const dbPath = join(data.kilo, 'kilo.db')
      if (existsSync(dbPath)) {
        const s = await stat(dbPath)
        const sizeMB = (s.size / (1024 * 1024)).toFixed(1)
        found.sessions.push(`${data.kilo} (DB: ${sizeMB} MB)`)
      } else {
        found.sessions.push(data.kilo)
      }
    } catch {
      found.sessions.push(data.kilo)
    }
  }
  if (existsSync(state.opencode)) found.sessions.push(state.opencode)
  if (existsSync(state.kilo)) found.sessions.push(state.kilo)
  for (const dir of getAppDataDirs()) {
    if (existsSync(dir)) found.sessions.push(dir)
  }

  // Project data — scan common project directories for .opencode/.kilo/.sisyphus
  const home = getHome()
  const searchRoots = [
    join(home, 'projects'),
    join(home, 'dev'),
    join(home, 'code'),
    join(home, 'Documents'),
    join(home, 'Desktop'),
    'D:\\laragon\\www\\app',
    'D:\\laragon\\www',
  ]

  for (const root of searchRoots) {
    if (!existsSync(root)) continue
    try {
      const entries = await readdir(root, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const projectPath = join(root, entry.name)
        const stateDirs = ['.opencode', '.kilo', '.sisyphus']
        for (const sd of stateDirs) {
          const fullPath = join(projectPath, sd)
          if (existsSync(fullPath)) {
            found.projectData.push(fullPath)
          }
        }
      }
    } catch { /* ignore permission errors */ }
  }

  return found
}

// ── Perform uninstall ───────────────────────────────────────────────

export async function performUninstall(options: UninstallOptions): Promise<UninstallResult> {
  const result: UninstallResult = { removed: [], errors: [] }

  if (options.cli) await removeCli(result)
  if (options.sessions) await removeSessions(result)
  if (options.core) await removeCore(result)
  if (options.plugins) await removePlugins(result)
  if (options.mcp) await removeMcp(result)
  if (options.skills) await removeSkills(result)
  if (options.projectData && options.projectPaths?.length) {
    await removeProjectData(options.projectPaths, result)
  }

  return result
}
