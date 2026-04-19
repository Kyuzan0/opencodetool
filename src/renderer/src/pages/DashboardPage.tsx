import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfigStore, usePluginStore, useSkillStore, useSettingsStore, useUiStore } from '../stores'
import { Card, Button, TextInput } from '../components/ui'
import BackupDialog from '../components/BackupRestore/BackupDialog'
import { FileJson, Bot, Puzzle, Wand2, RefreshCw, FolderOpen, CheckCircle, XCircle, Package, Archive, Terminal, Download, AlertCircle, Globe, Play, Square, RotateCcw } from 'lucide-react'
import type { OpenCodeRuntimeOverview } from '@shared/types'

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate()
  const { openCodeConfig, configPath } = useConfigStore()
  const { plugins } = usePluginStore()
  const { skills } = useSkillStore()
  const { recentProjects } = useSettingsStore()
  const [pmInfo, setPmInfo] = useState<{ preferred: string; version: string } | null>(null)
  const [backupMode, setBackupMode] = useState<'backup' | 'restore' | null>(null)
  const { toggleTerminal } = useUiStore()
  const [ocStatus, setOcStatus] = useState<{ found: boolean; version: string } | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installLog, setInstallLog] = useState<string[]>([])
  const [runtimeStatus, setRuntimeStatus] = useState<OpenCodeRuntimeOverview | null>(null)
  const [runtimeBusy, setRuntimeBusy] = useState<string | null>(null)
  const [runtimeLog, setRuntimeLog] = useState<string[]>([])
  const [webPort, setWebPort] = useState('3000')

  useEffect(() => {
    loadConfigLocations()
    detectPM()
    detectOpenCode()
    refreshRuntimeStatus()
  }, [])

  function appendRuntimeLog(message: string): void {
    const stamp = new Date().toLocaleTimeString()
    setRuntimeLog((prev) => [`[${stamp}] ${message}`, ...prev].slice(0, 80))
  }

  function parseWebPort(): number {
    const parsed = Number(webPort)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error('Port OpenCode Web harus integer antara 1-65535')
    }
    return parsed
  }

  async function refreshRuntimeStatus(): Promise<void> {
    try {
      const status = await (window.api as any).opencode.status()
      setRuntimeStatus(status)
    } catch (e: any) {
      appendRuntimeLog(`Gagal membaca status runtime: ${e.message || 'unknown error'}`)
    }
  }

  async function handleRuntimeAction(mode: 'cli' | 'web', action: 'start' | 'stop' | 'restart'): Promise<void> {
    const busyKey = `${mode}:${action}`
    setRuntimeBusy(busyKey)
    try {
      const opencodeApi = (window.api as any).opencode
      if (!opencodeApi) throw new Error('OpenCode runtime API tidak tersedia')

      let result: { running: boolean; port?: number | null }
      if (action === 'stop') {
        result = await opencodeApi.stop(mode)
      } else if (mode === 'web') {
        const port = parseWebPort()
        result = action === 'start'
          ? await opencodeApi.start(mode, port)
          : await opencodeApi.restart(mode, port)
      } else {
        result = action === 'start'
          ? await opencodeApi.start(mode)
          : await opencodeApi.restart(mode)
      }

      await refreshRuntimeStatus()
      const modeLabel = mode === 'cli' ? 'OpenCode CLI' : 'OpenCode Web'
      const portSuffix = result.port ? ` (port ${result.port})` : ''
      appendRuntimeLog(`${modeLabel} ${action} -> ${result.running ? 'running' : 'stopped'}${portSuffix}`)
    } catch (e: any) {
      appendRuntimeLog(`Error ${mode} ${action}: ${e.message || 'unknown error'}`)
    } finally {
      setRuntimeBusy(null)
    }
  }

  async function loadConfigLocations(): Promise<void> {
    try {
      const locations = await window.api.config.locations()
      if (locations.length > 0 && !configPath) {
        const first = locations[0]
        useConfigStore.getState().setConfigPath(first)
        const result = await window.api.config.read(first.path)
        useConfigStore.getState().setOpenCodeConfig(result.data as any)
        const pluginList = (result.data as any).plugin || []
        usePluginStore.getState().setPlugins(
          pluginList.map((name: string) => ({ name, version: '', enabled: true, installed: true }))
        )
      }
    } catch (err) { console.error('Failed to load config:', err) }
  }

  async function detectPM(): Promise<void> {
    try {
      const info = await window.api.pm.detect()
      setPmInfo({ preferred: info.preferred, version: info[info.preferred]?.version || '?' })
    } catch { /* ignore */ }
  }

  async function detectOpenCode(): Promise<void> {
    try {
      const result = await window.api.pm.detectOpenCode()
      setOcStatus({ found: result.found, version: result.version })
    } catch { setOcStatus({ found: false, version: '' }) }
  }

  async function handleInstallOpenCode(pm: 'npm' | 'bun'): Promise<void> {
    setInstalling(true)
    setInstallLog([`> ${pm === 'bun' ? 'bun add -g opencode-ai' : 'npm i -g opencode-ai'}...`])
    try {
      const result = await window.api.pm.installOpenCode(pm)
      if (result.exitCode === 0) {
        setInstallLog((prev) => [...prev, result.stdout || 'Installed successfully'])
        await detectOpenCode()
      } else {
        setInstallLog((prev) => [...prev, `Error: ${result.stderr || 'Install failed'}`])
      }
    } catch (e: any) {
      setInstallLog((prev) => [...prev, `Error: ${e.message || 'Install failed'}`])
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-themed">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2"><FileJson size={20} className="text-accent" /></div>
            <div>
              <p className="text-xs text-themed-muted">Config Status</p>
              <div className="flex items-center gap-1">
                {configPath?.exists ? <CheckCircle size={14} className="text-success" /> : <XCircle size={14} className="text-themed-muted" />}
                <span className="text-sm font-medium text-themed">{configPath?.exists ? 'Loaded' : 'Not loaded'}</span>
              </div>
              {configPath && <p className="mt-1 truncate text-xs text-themed-muted" title={configPath.path}>{configPath.path}</p>}
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2"><Puzzle size={20} className="text-accent" /></div>
            <div>
              <p className="text-xs text-themed-muted">Active Plugins</p>
              <span className="text-lg font-bold text-themed">{plugins.length}</span>
              {plugins.slice(0, 3).map((p) => <p key={p.name} className="truncate text-xs text-themed-muted">{p.name}</p>)}
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2"><Wand2 size={20} className="text-accent" /></div>
            <div>
              <p className="text-xs text-themed-muted">Registered Skills</p>
              <span className="text-lg font-bold text-themed">{skills.length}</span>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2"><Terminal size={20} className="text-accent" /></div>
            <div>
              <p className="text-xs text-themed-muted">OpenCode CLI</p>
              <div className="flex items-center gap-1">
                {ocStatus === null ? (
                  <span className="text-sm font-medium text-themed">Detecting...</span>
                ) : ocStatus.found ? (
                  <><CheckCircle size={14} className="text-success" /><span className="text-sm font-medium text-themed">v{ocStatus.version}</span></>
                ) : (
                  <><XCircle size={14} className="text-danger" /><span className="text-sm font-medium text-danger">Not installed</span></>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2"><Package size={20} className="text-accent" /></div>
            <div>
              <p className="text-xs text-themed-muted">Package Manager</p>
              <span className="text-sm font-medium text-themed">{pmInfo ? `${pmInfo.preferred} v${pmInfo.version}` : 'Detecting...'}</span>
            </div>
          </div>
        </Card>
      </div>
      {ocStatus && !ocStatus.found && (
        <Card title="OpenCode Not Detected">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-warning" />
              <p className="text-sm text-themed-secondary">OpenCode CLI is not installed globally. Install it to get started.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleInstallOpenCode('npm')} loading={installing} disabled={installing}>
                <Download size={16} /> Install with npm
              </Button>
              <Button variant="secondary" onClick={() => handleInstallOpenCode('bun')} loading={installing} disabled={installing || !pmInfo || pmInfo.preferred !== 'bun'}>
                <Download size={16} /> Install with bun
              </Button>
            </div>
            {installLog.length > 0 && (
              <div className="max-h-32 overflow-auto rounded-md bg-primary p-2 font-mono text-xs text-themed-muted">
                {installLog.map((line, i) => (
                  <div key={i} className={line.startsWith('Error') ? 'text-danger' : ''}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      <Card title="Quick Actions">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/opencode-config')}><FileJson size={16} /> Open Config</Button>
          <Button variant="secondary" onClick={() => navigate('/plugins')}><Puzzle size={16} /> Manage Plugins</Button>
          <Button variant="secondary" onClick={() => navigate('/agent-config')}><Bot size={16} /> Agent Config</Button>
          <Button variant="secondary" onClick={() => toggleTerminal()}><Terminal size={16} /> Terminal</Button>
          <Button variant="secondary" onClick={() => setBackupMode('backup')}><Archive size={16} /> Backup</Button>
          <Button variant="secondary" onClick={() => loadConfigLocations()}><RefreshCw size={16} /> Reload</Button>
        </div>
      </Card>

      <Card title="OpenCode Runtime Control" description="Start/Stop/Restart OpenCode CLI and OpenCode Web">
        <div className="space-y-4">
          <div className="rounded-md border border-border-default p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-accent" />
                <span className="text-sm font-medium text-themed">OpenCode CLI</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {runtimeStatus?.cli.running ? (
                  <><CheckCircle size={14} className="text-success" /><span className="text-success">Running (PID {runtimeStatus.cli.pid ?? '-'})</span></>
                ) : (
                  <><XCircle size={14} className="text-themed-muted" /><span className="text-themed-muted">Stopped</span></>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={!!runtimeBusy || !!runtimeStatus?.cli.running}
                onClick={() => handleRuntimeAction('cli', 'start')}
              >
                <Play size={16} /> Start
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy || !runtimeStatus?.cli.running}
                onClick={() => handleRuntimeAction('cli', 'stop')}
              >
                <Square size={16} /> Stop
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy}
                onClick={() => handleRuntimeAction('cli', 'restart')}
              >
                <RotateCcw size={16} /> Restart
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border-default p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-accent" />
                <span className="text-sm font-medium text-themed">OpenCode Web</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {runtimeStatus?.web.running ? (
                  <><CheckCircle size={14} className="text-success" /><span className="text-success">Running (port {runtimeStatus.web.port ?? '-'})</span></>
                ) : (
                  <><XCircle size={14} className="text-themed-muted" /><span className="text-themed-muted">Stopped</span></>
                )}
              </div>
            </div>

            <div className="mb-3 max-w-[220px]">
              <TextInput
                label="Custom Port"
                type="number"
                value={webPort}
                onChange={setWebPort}
                placeholder="3000"
                disabled={!!runtimeBusy}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={!!runtimeBusy || !!runtimeStatus?.web.running}
                onClick={() => handleRuntimeAction('web', 'start')}
              >
                <Play size={16} /> Start
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy || !runtimeStatus?.web.running}
                onClick={() => handleRuntimeAction('web', 'stop')}
              >
                <Square size={16} /> Stop
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy}
                onClick={() => handleRuntimeAction('web', 'restart')}
              >
                <RotateCcw size={16} /> Restart
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy}
                onClick={refreshRuntimeStatus}
              >
                <RefreshCw size={16} /> Refresh Status
              </Button>
            </div>
          </div>

          {runtimeLog.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-md bg-primary p-2 font-mono text-xs text-themed-muted">
              {runtimeLog.map((line, idx) => (
                <div key={`${line}-${idx}`}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {backupMode && <BackupDialog open={!!backupMode} onClose={() => setBackupMode(null)} mode={backupMode} />}
      {recentProjects.length > 0 && (
        <Card title="Recent Projects">
          <div className="space-y-2">
            {recentProjects.map((path) => (
              <div key={path} className="flex items-center justify-between rounded-md border border-border-default p-2">
                <div className="flex items-center gap-2 truncate"><FolderOpen size={16} className="text-themed-muted" /><span className="truncate text-sm text-themed-secondary">{path}</span></div>
                <Button variant="secondary" className="text-xs">Open</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
