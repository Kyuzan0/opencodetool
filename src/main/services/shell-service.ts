import { access } from 'fs/promises'
import { join } from 'path'
import type { ShellInfo } from '@shared/types/app-types'
import { detectBun } from './package-manager-service'

export async function detectAvailableShells(): Promise<ShellInfo[]> {
  const shells: ShellInfo[] = []

  const candidates: Array<{ name: string; paths: string[] }> = [
    {
      name: 'PowerShell 7',
      paths: [
        join(process.env.PROGRAMFILES || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe'),
        'pwsh.exe'
      ]
    },
    {
      name: 'Windows PowerShell',
      paths: [
        join(process.env.SYSTEMROOT || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
        'powershell.exe'
      ]
    },
    {
      name: 'Command Prompt',
      paths: [
        join(process.env.SYSTEMROOT || 'C:\\Windows', 'System32', 'cmd.exe'),
        'cmd.exe'
      ]
    },
    {
      name: 'Git Bash',
      paths: [
        join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
        join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Git', 'bin', 'bash.exe')
      ]
    },
    {
      name: 'WSL',
      paths: [
        join(process.env.SYSTEMROOT || 'C:\\Windows', 'System32', 'wsl.exe')
      ]
    }
  ]

  for (const candidate of candidates) {
    let found = false
    let foundPath = ''
    for (const p of candidate.paths) {
      try {
        await access(p)
        found = true
        foundPath = p
        break
      } catch { /* not found */ }
    }
    shells.push({ name: candidate.name, path: foundPath, available: found })
  }

  return shells
}

export async function getDefaultShell(): Promise<ShellInfo> {
  const shells = await detectAvailableShells()
  // Prefer PowerShell 7, then Windows PowerShell, then cmd
  const ps7 = shells.find((s) => s.name === 'PowerShell 7' && s.available)
  if (ps7) return ps7
  const ps = shells.find((s) => s.name === 'Windows PowerShell' && s.available)
  if (ps) return ps
  const cmd = shells.find((s) => s.name === 'Command Prompt' && s.available)
  if (cmd) return cmd
  return { name: 'Command Prompt', path: 'cmd.exe', available: true }
}

export async function getShellEnv(shell: ShellInfo): Promise<Record<string, string>> {
  const env = { ...process.env } as Record<string, string>

  // Add bun to PATH if detected
  const bun = await detectBun()
  if (bun) {
    const bunDir = bun.path.replace(/[/\\]bun\.exe$/, '')
    const currentPath = env.PATH || env.Path || ''
    if (!currentPath.includes(bunDir)) {
      env.PATH = `${bunDir};${currentPath}`
    }
  }

  return env
}
