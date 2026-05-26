import { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores'
import { Card, Button } from '../components/ui'
import {
  Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Monitor, Terminal, FolderOpen, Copy, Download
} from 'lucide-react'

interface DiagnosticItem {
  name: string
  category: 'runtime' | 'tool' | 'shell' | 'config'
  status: 'ok' | 'warning' | 'error' | 'checking'
  version: string
  path: string
  message: string
}

interface DiagnosticsReport {
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

const statusIcons = {
  ok: <CheckCircle size={16} className="text-success" />,
  warning: <AlertTriangle size={16} className="text-warning" />,
  error: <XCircle size={16} className="text-danger" />,
  checking: <RefreshCw size={16} className="text-accent animate-spin" />
}

const categoryIcons = {
  runtime: <Monitor size={16} />,
  tool: <Terminal size={16} />,
  shell: <Terminal size={16} />,
  config: <FolderOpen size={16} />
}

const categoryLabels = {
  runtime: 'Runtime & Package Managers',
  tool: 'Tools',
  shell: 'Available Shells',
  config: 'Config Locations'
}

export default function DiagnosticsPage(): JSX.Element {
  const { customOpenCodePath } = useSettingsStore()
  const [report, setReport] = useState<DiagnosticsReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    runDiagnostics()
  }, [])

  async function runDiagnostics(): Promise<void> {
    setLoading(true)
    try {
      const result = await (window as any).api.diagnostics.run(customOpenCodePath || undefined)
      if (result && !result.error) {
        setReport(result)
      }
    } catch (e) {
      console.error('Diagnostics failed:', e)
    } finally {
      setLoading(false)
    }
  }

  function copyReport(): void {
    if (!report) return
    const text = [
      `System Diagnostics Report — ${new Date(report.timestamp).toLocaleString()}`,
      `OS: ${report.system.os} | Node: ${report.system.nodeVersion} | Electron: ${report.system.electronVersion}`,
      '',
      ...report.items.map((item) => {
        const icon = item.status === 'ok' ? '✅' : item.status === 'warning' ? '⚠️' : '❌'
        return `${icon} ${item.name}: ${item.version || 'N/A'} — ${item.message}${item.path ? ` (${item.path})` : ''}`
      })
    ].join('\n')
    navigator.clipboard.writeText(text)
  }

  const grouped = report?.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, DiagnosticItem[]>)

  const totalOk = report?.items.filter((i) => i.status === 'ok').length || 0
  const totalWarn = report?.items.filter((i) => i.status === 'warning').length || 0
  const totalErr = report?.items.filter((i) => i.status === 'error').length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">System Diagnostics</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Check all dependencies and system requirements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={copyReport} disabled={!report}>
            <Copy size={16} /> Copy Report
          </Button>
          <Button onClick={runDiagnostics} loading={loading}>
            <RefreshCw size={16} /> Re-detect All
          </Button>
        </div>
      </div>

      {/* Summary */}
      {report && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card flex items-center gap-3">
            <div className="rounded-lg bg-success/[0.12] p-2">
              <CheckCircle size={20} className="text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success tabular-nums">{totalOk}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Healthy</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="rounded-lg bg-warning/[0.12] p-2">
              <AlertTriangle size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning tabular-nums">{totalWarn}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Warnings</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="rounded-lg bg-danger/[0.12] p-2">
              <XCircle size={20} className="text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-danger tabular-nums">{totalErr}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Errors</p>
            </div>
          </div>
        </div>
      )}

      {/* System Info */}
      {report && (
        <Card title="System Information">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[var(--color-text-muted)] text-xs">OS</p>
              <p className="text-[var(--color-text-primary)] font-medium">{report.system.os}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-xs">Node.js</p>
              <p className="text-[var(--color-text-primary)] font-medium">v{report.system.nodeVersion}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-xs">Electron</p>
              <p className="text-[var(--color-text-primary)] font-medium">v{report.system.electronVersion}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-xs">Home</p>
              <p className="text-[var(--color-text-primary)] font-mono text-xs truncate" title={report.system.homeDir}>{report.system.homeDir}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Diagnostic Items by Category */}
      {loading && !report && (
        <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
          <RefreshCw size={24} className="animate-spin mr-3" />
          Running diagnostics...
        </div>
      )}

      {grouped && Object.entries(grouped).map(([category, items]) => (
        <Card key={category} title={categoryLabels[category as keyof typeof categoryLabels] || category}>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-4 py-3 hover:border-[var(--color-border-bright)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcons[item.status]}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.name}</span>
                      {item.version && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono">
                          v{item.version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.message}</p>
                  </div>
                </div>
                {item.path && (
                  <span className="text-xs text-[var(--color-text-muted)] font-mono truncate max-w-[300px] ml-4" title={item.path}>
                    {item.path}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Last checked */}
      {report && (
        <p className="text-xs text-[var(--color-text-muted)] text-center">
          Last checked: {new Date(report.timestamp).toLocaleString()}
        </p>
      )}
    </div>
  )
}
