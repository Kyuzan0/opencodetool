import { execFile, exec } from 'child_process'
import { access } from 'fs/promises'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

interface DetectResult {
  found: boolean
  path: string
  version: string
}

export interface OpenCodeAppDetectResult {
  found: boolean
  installPath: string
  appExe: string
  cliExe: string
  version: string
}

export async function detectBun(): Promise<DetectResult | null> {
  const candidates = [
    // Common custom paths on Windows
    'C:\\Apps\\bun\\bin\\bun.exe',
    join(homedir(), '.bun', 'bin', 'bun.exe'),
    join(process.env.LOCALAPPDATA || '', 'bun', 'bin', 'bun.exe'),
    join(process.env.PROGRAMFILES || '', 'bun', 'bun.exe'),
  ].filter(Boolean)

  // Try PATH first
  try {
    const version = await runCommand('bun', ['--version'], undefined, 5000)
    if (version.exitCode === 0) {
      const path = await runCommand('where', ['bun'], undefined, 5000)
      return { found: true, path: path.stdout.trim().split('\n')[0], version: version.stdout.trim() }
    }
  } catch { /* not in PATH */ }

  // Try known paths
  for (const candidate of candidates) {
    try {
      await access(candidate)
      const version = await runCommand(candidate, ['--version'], undefined, 5000)
      if (version.exitCode === 0) {
        return { found: true, path: candidate, version: version.stdout.trim() }
      }
    } catch { /* not found */ }
  }

  return null
}

export async function detectNpm(): Promise<DetectResult> {
  try {
    const version = await runCommand('npm', ['--version'], undefined, 5000)
    const path = await runCommand('where', ['npm'], undefined, 5000)
    return {
      found: true,
      path: path.stdout.trim().split('\n')[0],
      version: version.stdout.trim()
    }
  } catch {
    return { found: false, path: '', version: '' }
  }
}

export async function getPreferredPackageManager(): Promise<'bun' | 'npm'> {
  const bun = await detectBun()
  return bun ? 'bun' : 'npm'
}

export async function detectOpenCode(): Promise<DetectResult> {
  // 1. Try PATH first (global npm/bun install)
  try {
    const version = await runCommand('opencode', ['--version'], undefined, 5000)
    if (version.exitCode === 0) {
      const path = await runCommand('where', ['opencode'], undefined, 5000)
      return { found: true, path: path.stdout.trim().split('\n')[0], version: version.stdout.trim() }
    }
  } catch { /* not in PATH */ }

  // 2. Try opencode-cli.exe from Desktop App install
  try {
    const app = await detectOpenCodeApp()
    if (app.found && app.cliExe) {
      const version = await runCommand(app.cliExe, ['--version'], undefined, 5000)
      if (version.exitCode === 0) {
        return { found: true, path: app.cliExe, version: version.stdout.trim() }
      }
    }
  } catch { /* not found */ }

  return { found: false, path: '', version: '' }
}

/**
 * Detect OpenCode Desktop App installation.
 * Checks: Windows Registry (NSIS uninstall key) → known install paths.
 */
export async function detectOpenCodeApp(): Promise<OpenCodeAppDetectResult> {
  const empty: OpenCodeAppDetectResult = { found: false, installPath: '', appExe: '', cliExe: '', version: '' }

  // 1. Try Windows Registry (NSIS installer writes uninstall keys)
  try {
    const regResult = await queryRegistryForOpenCode()
    if (regResult) {
      const result = buildAppResult(regResult.installPath, regResult.version)
      if (result) return result
    }
  } catch { /* registry query failed */ }

  // 2. Try known install paths
  const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
  const knownPaths = [
    join(localAppData, 'opencode'),
    join(localAppData, 'OpenCode'),
    join(localAppData, 'Programs', 'opencode'),
    join(localAppData, 'Programs', 'OpenCode'),
    'C:\\Apps\\OpenCode',
    'C:\\Apps\\opencode',
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'OpenCode'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'OpenCode'),
  ]

  for (const candidate of knownPaths) {
    const result = buildAppResult(candidate)
    if (result) return result
  }

  return empty
}

/**
 * Query Windows Registry for OpenCode install location.
 */
function queryRegistryForOpenCode(): Promise<{ installPath: string; version: string } | null> {
  return new Promise((resolve) => {
    // NSIS writes to HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall
    const regPaths = [
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    ]

    let pending = regPaths.length
    let found = false

    for (const regPath of regPaths) {
      exec(
        `reg query "${regPath}" /s /f "OpenCode" /d`,
        { timeout: 5000 },
        (err, stdout) => {
          pending--
          if (!found && !err && stdout) {
            const installMatch = stdout.match(/InstallLocation\s+REG_SZ\s+(.+)/i)
            const versionMatch = stdout.match(/DisplayVersion\s+REG_SZ\s+(.+)/i)
            if (installMatch) {
              found = true
              const installPath = installMatch[1].trim().replace(/^"|"$/g, '')
              const version = versionMatch ? versionMatch[1].trim() : ''
              resolve({ installPath, version })
              return
            }
          }
          if (pending === 0 && !found) resolve(null)
        }
      )
    }
  })
}

/**
 * Build app detection result from an install path.
 * Verifies that the expected executables exist.
 */
function buildAppResult(installPath: string, registryVersion?: string): OpenCodeAppDetectResult | null {
  if (!installPath || !existsSync(installPath)) return null

  const appExe = join(installPath, 'OpenCode.exe')
  const cliExe = join(installPath, 'opencode-cli.exe')

  // At minimum, one of the executables must exist
  const appExists = existsSync(appExe)
  const cliExists = existsSync(cliExe)
  if (!appExists && !cliExists) return null

  return {
    found: true,
    installPath,
    appExe: appExists ? appExe : '',
    cliExe: cliExists ? cliExe : '',
    version: registryVersion || '',
  }
}

export async function installOpenCode(pm: 'npm' | 'bun'): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  if (pm === 'bun') {
    const bun = await detectBun()
    if (bun) {
      return runCommand(bun.path, ['add', '-g', 'opencode-ai'], undefined, 60000)
    }
    return { stdout: '', stderr: 'bun is not installed', exitCode: 1 }
  }
  return runCommand('npm', ['i', '-g', 'opencode-ai'], undefined, 60000)
}

function parseBunxNpxCommand(input: string): { runner: 'bunx' | 'npx'; args: string[] } | null {
  const trimmed = input.trim()
  const parts = trimmed.split(/\s+/)
  if (parts.length < 2) return null
  const runner = parts[0].toLowerCase()
  if (runner === 'bunx' || runner === 'npx') {
    return { runner: runner as 'bunx' | 'npx', args: parts.slice(1) }
  }
  return null
}

export async function installPlugin(pluginName: string, configDir: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const parsed = parseBunxNpxCommand(pluginName)
  if (parsed) {
    if (parsed.runner === 'bunx') {
      const bun = await detectBun()
      if (bun) {
        return runCommand(bun.path, ['x', ...parsed.args], configDir, 60000)
      }
      return { stdout: '', stderr: 'bunx requested but bun is not installed', exitCode: 1 }
    }
    // npx
    return runCommand('npx', parsed.args, configDir, 60000)
  }

  const bun = await detectBun()
  if (bun) {
    return runCommand(bun.path, ['add', pluginName], configDir, 30000)
  }
  return runCommand('npm', ['install', pluginName], configDir, 30000)
}

export async function uninstallPlugin(pluginName: string, configDir: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const bun = await detectBun()
  if (bun) {
    return runCommand(bun.path, ['remove', pluginName], configDir, 30000)
  }
  return runCommand('npm', ['uninstall', pluginName], configDir, 30000)
}

export function listInstalledPackages(configDir: string): Record<string, string> {
  try {
    const pkgPath = join(configDir, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  } catch {
    return {}
  }
}

export function runCommand(
  command: string,
  args: string[],
  cwd?: string,
  timeout = 30000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Validate args to prevent command injection
  for (const arg of args) {
    if (/[;&|`$(){}]/.test(arg)) {
      return Promise.resolve({ stdout: '', stderr: `Invalid characters in argument: ${arg}`, exitCode: 1 })
    }
  }
  return new Promise((resolve, reject) => {
    const proc = execFile(command, args, { cwd, timeout, shell: false }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: error ? (error as any).code || 1 : 0
      })
    })
    proc.on('error', (err) => reject(err))
  })
}
