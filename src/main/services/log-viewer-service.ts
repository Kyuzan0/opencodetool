import { readdir, readFile, stat } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'

export interface SessionEntry {
  id: string
  path: string
  date: string
  size: number
  preview: string
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  source?: string
}

function getSessionDirs(): string[] {
  const home = homedir()
  const candidates = [
    join(home, '.config', 'opencode', 'sessions'),
    join(home, '.config', 'opencode', 'session'),
    join(process.env.APPDATA || '', 'opencode', 'sessions'),
    join(home, '.opencode', 'sessions'),
  ]
  return candidates.filter((p) => existsSync(p))
}

export async function listSessions(limit = 50): Promise<SessionEntry[]> {
  const dirs = getSessionDirs()
  const sessions: SessionEntry[] = []

  for (const dir of dirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        try {
          const stats = await stat(fullPath)
          let preview = ''
          if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.jsonl') || entry.name.endsWith('.log'))) {
            const content = await readFile(fullPath, 'utf-8')
            preview = content.slice(0, 200)
            sessions.push({
              id: entry.name,
              path: fullPath,
              date: stats.mtime.toISOString(),
              size: stats.size,
              preview
            })
          } else if (entry.isDirectory()) {
            sessions.push({
              id: entry.name,
              path: fullPath,
              date: stats.mtime.toISOString(),
              size: stats.size,
              preview: '[directory]'
            })
          }
        } catch { /* skip unreadable */ }
      }
    } catch { /* dir not readable */ }
  }

  // Sort by date descending
  sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return sessions.slice(0, limit)
}

export async function readSessionLog(sessionPath: string): Promise<LogEntry[]> {
  const entries: LogEntry[] = []

  try {
    const stats = await stat(sessionPath)

    if (stats.isDirectory()) {
      // Read all files in the session directory
      const files = await readdir(sessionPath)
      for (const file of files.sort()) {
        const filePath = join(sessionPath, file)
        const fileStats = await stat(filePath)
        if (fileStats.isFile() && fileStats.size < 5 * 1024 * 1024) { // Max 5MB per file
          const content = await readFile(filePath, 'utf-8')
          entries.push(...parseLogContent(content, file))
        }
      }
    } else {
      // Single file
      if (stats.size > 10 * 1024 * 1024) {
        entries.push({ timestamp: '', level: 'warn', message: 'File too large to display (>10MB)', source: basename(sessionPath) })
        return entries
      }
      const content = await readFile(sessionPath, 'utf-8')
      entries.push(...parseLogContent(content, basename(sessionPath)))
    }
  } catch (e: unknown) {
    entries.push({ timestamp: '', level: 'error', message: `Failed to read: ${e instanceof Error ? e.message : 'unknown'}`, source: '' })
  }

  return entries
}

function parseLogContent(content: string, source: string): LogEntry[] {
  const entries: LogEntry[] = []
  const lines = content.split('\n').filter((l) => l.trim())

  for (const line of lines) {
    // Try JSONL format
    try {
      const parsed = JSON.parse(line)
      if (parsed && typeof parsed === 'object') {
        entries.push({
          timestamp: parsed.timestamp || parsed.time || parsed.ts || '',
          level: normalizeLevel(parsed.level || parsed.severity || 'info'),
          message: parsed.message || parsed.msg || parsed.content || JSON.stringify(parsed).slice(0, 500),
          source
        })
        continue
      }
    } catch { /* not JSON */ }

    // Try timestamp prefix format: [2024-01-01 12:00:00] [INFO] message
    const tsMatch = line.match(/^\[?(\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}:\d{2}[^\]]*)\]?\s*\[?(INFO|WARN|ERROR|DEBUG)\]?\s*(.*)$/i)
    if (tsMatch) {
      entries.push({
        timestamp: tsMatch[1],
        level: normalizeLevel(tsMatch[2]),
        message: tsMatch[3],
        source
      })
      continue
    }

    // Plain text line
    entries.push({
      timestamp: '',
      level: line.toLowerCase().includes('error') ? 'error' : line.toLowerCase().includes('warn') ? 'warn' : 'info',
      message: line.slice(0, 1000),
      source
    })
  }

  return entries
}

function normalizeLevel(level: string): 'info' | 'warn' | 'error' | 'debug' {
  const l = level.toLowerCase()
  if (l.includes('err') || l.includes('fatal') || l.includes('critical')) return 'error'
  if (l.includes('warn')) return 'warn'
  if (l.includes('debug') || l.includes('trace')) return 'debug'
  return 'info'
}
