import { useState, useEffect } from 'react'
import { Card, Button, TextInput } from '../components/ui'
import {
  FileText, RefreshCw, Search, AlertCircle, AlertTriangle, Info, Bug,
  Clock, ChevronRight, X
} from 'lucide-react'

interface SessionEntry {
  id: string
  path: string
  date: string
  size: number
  preview: string
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  source?: string
}

const levelIcons = {
  info: <Info size={14} className="text-accent" />,
  warn: <AlertTriangle size={14} className="text-warning" />,
  error: <AlertCircle size={14} className="text-danger" />,
  debug: <Bug size={14} className="text-[var(--color-text-muted)]" />
}

const levelColors = {
  info: 'text-[var(--color-text-secondary)]',
  warn: 'text-warning',
  error: 'text-danger',
  debug: 'text-[var(--color-text-muted)]'
}

export default function LogViewerPage(): JSX.Element {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [selectedSession, setSelectedSession] = useState<SessionEntry | null>(null)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [logLoading, setLogLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions(): Promise<void> {
    setLoading(true)
    try {
      const result = await (window as any).api.logs.sessions(50)
      setSessions(result || [])
    } catch (e) {
      console.error('Failed to load sessions:', e)
    } finally {
      setLoading(false)
    }
  }

  async function openSession(session: SessionEntry): Promise<void> {
    setSelectedSession(session)
    setLogLoading(true)
    try {
      const entries = await (window as any).api.logs.read(session.path)
      setLogEntries(entries || [])
    } catch (e) {
      console.error('Failed to read session:', e)
      setLogEntries([])
    } finally {
      setLogLoading(false)
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  const filteredEntries = logEntries.filter((entry) => {
    if (levelFilter !== 'all' && entry.level !== levelFilter) return false
    if (searchQuery && !entry.message.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Log Viewer</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Browse OpenCode session logs and history</p>
        </div>
        <Button variant="secondary" onClick={loadSessions} loading={loading}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* Session List */}
        <div className="w-72 shrink-0 space-y-1 overflow-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-2 max-h-[700px]">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Sessions ({sessions.length})
          </p>
          {sessions.length === 0 && !loading && (
            <div className="flex flex-col items-center py-8 text-[var(--color-text-muted)]">
              <FileText size={32} className="opacity-50 mb-2" />
              <p className="text-xs">No sessions found</p>
            </div>
          )}
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => openSession(session)}
              className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                selectedSession?.id === session.id
                  ? 'bg-accent/[0.08] text-accent'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate">{session.id}</span>
                <ChevronRight size={12} className="shrink-0 opacity-50" />
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--color-text-muted)]">
                <Clock size={10} />
                <span>{formatDate(session.date)}</span>
                <span>•</span>
                <span>{formatSize(session.size)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Log Content */}
        <div className="flex-1 space-y-3">
          {selectedSession ? (
            <>
              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter logs..."
                    className="input-field w-full pl-9 text-sm"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="flex gap-1">
                  {['all', 'error', 'warn', 'info', 'debug'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setLevelFilter(level)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        levelFilter === level
                          ? 'bg-accent/20 text-accent'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-primary)]'
                      }`}
                    >
                      {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log entries */}
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] overflow-hidden">
                {logLoading ? (
                  <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
                    <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
                    <FileText size={32} className="opacity-50 mb-2" />
                    <p className="text-sm">{searchQuery ? 'No matching entries' : 'No log entries'}</p>
                  </div>
                ) : (
                  <div className="max-h-[550px] overflow-auto font-mono text-xs divide-y divide-[var(--color-border-subtle)]">
                    {filteredEntries.map((entry, i) => (
                      <div key={i} className="flex items-start gap-2 px-4 py-2 hover:bg-[var(--color-bg-surface)] transition-colors">
                        <span className="shrink-0 mt-0.5">{levelIcons[entry.level]}</span>
                        {entry.timestamp && (
                          <span className="shrink-0 text-[var(--color-text-muted)] w-[140px]">
                            {entry.timestamp.slice(0, 19)}
                          </span>
                        )}
                        <span className={`flex-1 break-all ${levelColors[entry.level]}`}>
                          {entry.message}
                        </span>
                        {entry.source && (
                          <span className="shrink-0 text-[var(--color-text-muted)] text-[10px]">
                            {entry.source}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-[var(--color-text-muted)]">
                Showing {filteredEntries.length} of {logEntries.length} entries
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)]">
              <FileText size={48} className="opacity-30 mb-4" />
              <p className="text-sm">Select a session to view logs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
