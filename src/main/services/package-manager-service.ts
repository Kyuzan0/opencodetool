import { execFile } from 'child_process'
import { access } from 'fs/promises'
import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

interface DetectResult {
  found: boolean
  path: string
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
  try {
    const version = await runCommand('opencode', ['--version'], undefined, 5000)
    if (version.exitCode === 0) {
      const path = await runCommand('where', ['opencode'], undefined, 5000)
      return { found: true, path: path.stdout.trim().split('\n')[0], version: version.stdout.trim() }
    }
  } catch { /* not found */ }
  return { found: false, path: '', version: '' }
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
