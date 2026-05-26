import { execFile } from 'child_process'
import { access } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { detectBun, detectNpm, detectOpenCode, detectOpenCodeApp } from './package-manager-service'
import { detectAvailableShells } from './shell-service'

export interface DiagnosticItem {
  name: string
  category: 'runtime' | 'tool' | 'shell' | 'config'
  status: 'ok' | 'warning' | 'error' | 'checking'
  version: string
  path: string
  message: string
}

export interface DiagnosticsReport {
  items: DiagnosticItem[]
  timestamp: string
  system: {
    os: string
    arch: string
    nodeVersion: string
    electronVersion: string
    homeDir: string
  }
}

function runCmd(command: string, args: string[], timeout = 5000): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout, shell: false }, (error, stdout) => {
      resolve({ stdout: stdout?.trim() || '', exitCode: error ? 1 : 0 })
    })
  })
}

async function detectNode(): Promise<DiagnosticItem> {
  try {
    const result = await runCmd('node', ['--version'])
    if (result.exitCode === 0) {
      const pathResult = await runCmd('where', ['node'])
      return {
        name: 'Node.js',
        category: 'runtime',
        status: 'ok',
        version: result.stdout.replace('v', ''),
        path: pathResult.stdout.split('\n')[0] || '',
        message: 'Node.js is available'
      }
    }
  } catch { /* not found */ }
  return { name: 'Node.js', category: 'runtime', status: 'error', version: '', path: '', message: 'Node.js not found in PATH' }
}

async function detectGit(): Promise<DiagnosticItem> {
  try {
    const result = await runCmd('git', ['--version'])
    if (result.exitCode === 0) {
      const version = result.stdout.replace('git version ', '').trim()
      const pathResult = await runCmd('where', ['git'])
      return {
        name: 'Git',
        category: 'tool',
        status: 'ok',
        version,
        path: pathResult.stdout.split('\n')[0] || '',
        message: 'Git is available'
      }
    }
  } catch { /* not found */ }
  return { name: 'Git', category: 'tool', status: 'warning', version: '', path: '', message: 'Git not found (optional but recommended)' }
}

export async function runDiagnostics(customOpenCodePath?: string): Promise<DiagnosticsReport> {
  const items: DiagnosticItem[] = []

  // Node.js
  items.push(await detectNode())

  // Bun
  const bun = await detectBun()
  if (bun) {
    items.push({ name: 'Bun', category: 'runtime', status: 'ok', version: bun.version, path: bun.path, message: 'Bun is available' })
  } else {
    items.push({ name: 'Bun', category: 'runtime', status: 'warning', version: '', path: '', message: 'Bun not found (optional, npm will be used)' })
  }

  // npm
  const npm = await detectNpm()
  if (npm.found) {
    items.push({ name: 'npm', category: 'runtime', status: 'ok', version: npm.version, path: npm.path, message: 'npm is available' })
  } else {
    items.push({ name: 'npm', category: 'runtime', status: 'error', version: '', path: '', message: 'npm not found — required for plugin management' })
  }

  // OpenCode CLI
  const oc = await detectOpenCode(customOpenCodePath)
  if (oc.found) {
    items.push({ name: 'OpenCode CLI', category: 'tool', status: 'ok', version: oc.version, path: oc.path, message: 'OpenCode CLI is ready' })
  } else {
    items.push({ name: 'OpenCode CLI', category: 'tool', status: 'error', version: '', path: '', message: 'OpenCode CLI not found — install via npm i -g opencode-ai or set custom path in Settings' })
  }

  // OpenCode Desktop App
  const ocApp = await detectOpenCodeApp()
  if (ocApp.found) {
    items.push({ name: 'OpenCode Desktop', category: 'tool', status: 'ok', version: ocApp.version, path: ocApp.installPath, message: 'OpenCode Desktop is installed' })
  } else {
    items.push({ name: 'OpenCode Desktop', category: 'tool', status: 'warning', version: '', path: '', message: 'OpenCode Desktop not detected (optional)' })
  }

  // Git
  items.push(await detectGit())

  // Shells
  const shells = await detectAvailableShells()
  for (const shell of shells) {
    items.push({
      name: shell.name,
      category: 'shell',
      status: shell.available ? 'ok' : 'warning',
      version: '',
      path: shell.path,
      message: shell.available ? `${shell.name} is available` : `${shell.name} not found`
    })
  }

  // Config locations
  const home = homedir()
  const configPaths = [
    join(home, '.config', 'opencode'),
    join(process.env.APPDATA || '', 'opencode'),
  ]
  for (const cp of configPaths) {
    try {
      await access(cp)
      items.push({ name: `Config: ${cp}`, category: 'config', status: 'ok', version: '', path: cp, message: 'Config directory exists' })
    } catch {
      items.push({ name: `Config: ${cp}`, category: 'config', status: 'warning', version: '', path: cp, message: 'Config directory not found' })
    }
  }

  return {
    items,
    timestamp: new Date().toISOString(),
    system: {
      os: `${process.platform} ${process.arch}`,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron || '',
      homeDir: home
    }
  }
}
