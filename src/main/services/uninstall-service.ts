import { rm, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execFile } from 'child_process'
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

function getConfigDir(): string {
  return join(getHome(), '.config', 'opencode')
}

function getDataDir(): string {
  return join(getHome(), '.local', 'share', 'opencode')
}

function getStateDir(): string {
  return join(getHome(), '.local', 'state', 'opencode')
}

function getAppDataDirs(): string[] {
  const dirs: string[] = []
  const appData = process.env.APPDATA
  if (appData) {
    dirs.push(join(appData, 'opencode'))
  }
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    dirs.push(join(localAppData, 'opencode'))
  }
  return dirs
}

// ── Process killing ─────────────────────────────────────────────────

function execPromise(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { shell: true, timeout: 10000 }, (error, stdout, stderr) => {
      resolve({ stdout: stdout || '', stderr: stderr || '' })
    })
  })
}

async function killOpenCodeProcesses(): Promise<string[]> {
  const killed: string[] = []

  // Process names to kill
  const processNames = [
    'opencode.exe',
  ]

  for (const procName of processNames) {
    try {
      // Check if process is running first
      const { stdout } = await execPromise('tasklist', ['/FI', `IMAGENAME eq ${procName}`, '/FO', 'CSV', '/NH'])
      if (stdout.includes(procName)) {
        await execPromise('taskkill', ['/F', '/IM', procName])
        killed.push(procName)
      }
    } catch { /* ignore if process not found */ }
  }

  // Also kill any node.exe processes with opencode-related command lines.
  try {
    const { stdout } = await execPromise('wmic', [
      'process', 'where',
      `"name='node.exe' and commandline like '%opencode%'"`,
      'get', 'processid', '/format:csv'
    ])
    const pids = stdout.split('\n')
      .map(line => line.trim().split(',').pop()?.trim())
      .filter(pid => pid && /^\d+$/.test(pid))
    for (const pid of pids) {
      try {
        await execPromise('taskkill', ['/F', '/PID', pid!])
        killed.push(`node.exe (PID ${pid}, opencode-related)`)
      } catch { /* ignore */ }
    }
  } catch { /* wmic may not be available, ignore */ }

  // Wait for processes to fully terminate and release file handles
  if (killed.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return killed
}

// ── Remove helper ───────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function removePath(target: string, result: UninstallResult, retries = 3): Promise<void> {
  if (!existsSync(target)) return

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const s = await stat(target)
      await rm(target, { recursive: s.isDirectory(), force: true, maxRetries: 3, retryDelay: 500 })
      result.removed.push(target)
      return
    } catch (e: any) {
      if (attempt < retries && (e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'ENOTEMPTY')) {
        // Wait longer on each retry
        await sleep(1000 * attempt)
        continue
      }
      result.errors.push(`Failed to remove ${target}: ${e.message}`)
    }
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
  const opencode = getConfigDir()

  // Remove ENTIRE config directories (not just individual files)
  await removePath(opencode, result)

  // Also remove AppData directories
  for (const dir of getAppDataDirs()) {
    await removePath(dir, result)
  }
}

async function removePlugins(result: UninstallResult): Promise<void> {
  // Plugins live inside the config dirs. If core removal already deleted them,
  // this handles the case where core=false but plugins=true.
  const opencode = getConfigDir()

  const pluginPaths = [
    join(opencode, 'node_modules'),
    join(opencode, 'package.json'),
    join(opencode, 'package-lock.json'),
    join(opencode, 'bun.lockb'),
    join(opencode, 'bun.lock'),
  ]

  for (const p of pluginPaths) {
    await removePath(p, result)
  }
}

async function removeMcp(result: UninstallResult): Promise<void> {
  const opencode = getConfigDir()

  const mcpPaths = [
    join(opencode, 'mcp.json'),
    join(opencode, 'mcp.jsonc'),
    join(opencode, 'mcp'),
  ]

  for (const appDir of getAppDataDirs()) {
    mcpPaths.push(join(appDir, 'mcp.json'), join(appDir, 'mcp.jsonc'))
  }

  for (const p of mcpPaths) {
    await removePath(p, result)
  }
}

async function removeSkills(result: UninstallResult): Promise<void> {
  const opencode = getConfigDir()

  const dirs = [
    join(opencode, 'skills'),
    join(opencode, 'skill'),
    join(opencode, 'command'),
    join(opencode, 'agent'),
  ]

  for (const d of dirs) {
    await removePath(d, result)
  }
}

async function removeSessions(result: UninstallResult): Promise<void> {
  const data = getDataDir()
  const state = getStateDir()

  // Remove entire data directories (contains DB, logs, snapshots, auth, tool-output)
  await removePath(data, result)

  // Remove state directories (contains locks)
  await removePath(state, result)

  // Remove AppData directories (contains WebView cache etc.)
  for (const dir of getAppDataDirs()) {
    await removePath(dir, result)
  }
}

async function removeProjectData(projectPaths: string[], result: UninstallResult): Promise<void> {
  for (const projectPath of projectPaths) {
    if (!existsSync(projectPath)) continue

    // Remove OpenCode project state directories.
    const projectStateDirs = [
      join(projectPath, '.opencode'),
      join(projectPath, '.sisyphus'),
    ]

    for (const d of projectStateDirs) {
      await removePath(d, result)
    }
  }
}

async function scanProjectStateDirs(root: string, found: Set<string>, depth = 0, maxDepth = 4): Promise<void> {
  if (depth > maxDepth || !existsSync(root)) return

  const skipDirs = new Set(['node_modules', '.git', '.svn', '.hg', '.idea', '.vscode'])
  const stateDirNames = new Set(['.opencode', '.sisyphus'])

  try {
    const entries = await readdir(root, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const fullPath = join(root, entry.name)
      if (stateDirNames.has(entry.name)) {
        found.add(fullPath)
        continue
      }

      if (skipDirs.has(entry.name)) continue
      await scanProjectStateDirs(fullPath, found, depth + 1, maxDepth)
    }
  } catch {
    // ignore permission and file system errors
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
  const opencode = getConfigDir()
  const data = getDataDir()
  const state = getStateDir()

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
  for (const dir of getAppDataDirs()) {
    if (existsSync(dir)) found.core.push(dir)
  }

  // Plugins
  const pluginPaths = [
    join(opencode, 'node_modules'),
    join(opencode, 'package.json'),
    join(opencode, 'package-lock.json'),
    join(opencode, 'bun.lockb'),
    join(opencode, 'bun.lock'),
  ]
  for (const p of pluginPaths) {
    if (existsSync(p)) found.plugins.push(p)
  }

  // MCP
  const mcpPaths = [
    join(opencode, 'mcp.json'),
    join(opencode, 'mcp.jsonc'),
    join(opencode, 'mcp'),
  ]
  for (const appDir of getAppDataDirs()) {
    mcpPaths.push(join(appDir, 'mcp.json'), join(appDir, 'mcp.jsonc'))
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
  ]
  for (const d of skillDirs) {
    if (existsSync(d)) found.skills.push(d)
  }

  // Sessions & data
  if (existsSync(data)) {
    try {
      const dbPath = join(data, 'opencode.db')
      if (existsSync(dbPath)) {
        const s = await stat(dbPath)
        const sizeMB = (s.size / (1024 * 1024)).toFixed(1)
        found.sessions.push(`${data} (DB: ${sizeMB} MB)`)
      } else {
        found.sessions.push(data)
      }
    } catch {
      found.sessions.push(data)
    }
  }
  if (existsSync(state)) found.sessions.push(state)
  for (const dir of getAppDataDirs()) {
    if (existsSync(dir)) found.sessions.push(dir)
  }

  // Project data — recursively scan common project directories for .opencode/.sisyphus.
  const home = getHome()
  const searchRoots = [
    join(home, 'projects'),
    join(home, 'dev'),
    join(home, 'code'),
    join(home, 'Documents'),
    join(home, 'Desktop'),
    'D:\\laragon\\www\\app',
    'D:\\laragon\\www',
    process.cwd(),
  ]

  const foundProjectData = new Set<string>()
  for (const root of searchRoots) {
    await scanProjectStateDirs(root, foundProjectData)
  }
  found.projectData.push(...Array.from(foundProjectData).sort())

  return found
}

// ── Perform uninstall ───────────────────────────────────────────────

export async function performUninstall(options: UninstallOptions): Promise<UninstallResult> {
  const result: UninstallResult = { removed: [], errors: [] }

  // Step 1: Kill running OpenCode processes to release file locks.
  try {
    const killed = await killOpenCodeProcesses()
    for (const proc of killed) {
      result.removed.push(`Killed process: ${proc}`)
    }
  } catch (e: any) {
    result.errors.push(`Warning: Could not kill processes: ${e.message}`)
  }

  // Step 2: Perform removal in order (CLI first, then data, then config)
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
