import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useConfigStore,
  usePluginStore,
  useSkillStore,
  useSettingsStore,
  useUiStore
} from '../stores'
import { Card, Button, TextInput } from '../components/ui'
import BackupDialog from '../components/BackupRestore/BackupDialog'
import {
  FileJson,
  Bot,
  Puzzle,
  Wand2,
  RefreshCw,
  FolderOpen,
  CheckCircle,
  XCircle,
  Package,
  Archive,
  Terminal,
  Download,
  AlertCircle,
  Globe,
  Play,
  Square,
  RotateCcw,
  Monitor,
  FilePlus
} from 'lucide-react'
import type { OpenCodeRuntimeOverview } from '@shared/types'

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate()
  const { openCodeConfig, configPath } = useConfigStore()
  const { plugins } = usePluginStore()
  const { skills } = useSkillStore()
  const { recentProjects, openCodeWebPort, setOpenCodeWebPort } = useSettingsStore()
  const [pmInfo, setPmInfo] = useState<{ preferred: string; version: string } | null>(null)
  const [backupMode, setBackupMode] = useState<'backup' | 'restore' | null>(null)
  const { toggleTerminal } = useUiStore()
  const [ocStatus, setOcStatus] = useState<{ found: boolean; version: string } | null>(null)
  const [ocAppStatus, setOcAppStatus] = useState<{
    found: boolean
    version: string
    installPath: string
    appExe: string
    cliExe: string
  } | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installLog, setInstallLog] = useState<string[]>([])
  const [runtimeStatus, setRuntimeStatus] = useState<OpenCodeRuntimeOverview | null>(null)
  const [runtimeBusy, setRuntimeBusy] = useState<string | null>(null)
  const [runtimeLog, setRuntimeLog] = useState<string[]>([])

  useEffect(() => {
    loadConfigLocations()
    detectPM()
    detectOpenCode()
    detectOpenCodeApp()
    refreshRuntimeStatus()
  }, [])

  function appendRuntimeLog(message: string): void {
    const stamp = new Date().toLocaleTimeString()
    setRuntimeLog((prev) => [`[${stamp}] ${message}`, ...prev].slice(0, 80))
  }

  function parseWebPort(): number {
    const parsed = Number(openCodeWebPort)
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

  async function handleRuntimeAction(
    mode: 'cli' | 'web',
    action: 'start' | 'stop' | 'restart',
    force?: boolean
  ): Promise<void> {
    const busyKey = `${mode}:${action}`
    setRuntimeBusy(busyKey)
    try {
      const opencodeApi = (window.api as any).opencode
      if (!opencodeApi) throw new Error('OpenCode runtime API tidak tersedia')

      let result: { running: boolean; port?: number | null }
      if (action === 'stop') {
        const stopPort =
          mode === 'web'
            ? (runtimeStatus?.web.port ?? (Number(openCodeWebPort) || undefined))
            : undefined
        result = await opencodeApi.stop(mode, stopPort)
      } else if (mode === 'web') {
        const port = parseWebPort()
        result =
          action === 'start'
            ? await opencodeApi.start(mode, port, force)
            : await opencodeApi.restart(mode, port)
      } else {
        result =
          action === 'start' ? await opencodeApi.start(mode) : await opencodeApi.restart(mode)
      }

      await refreshRuntimeStatus()
      const modeLabel = mode === 'cli' ? 'OpenCode CLI' : 'OpenCode Web'
      const portSuffix = result.port ? ` (port ${result.port})` : ''
      appendRuntimeLog(
        `${modeLabel} ${action} -> ${result.running ? 'running' : 'stopped'}${portSuffix}`
      )
    } catch (e: any) {
      const errorMsg: string = e.message || 'unknown error'

      if (errorMsg.startsWith('PORT_IN_USE:') && !force) {
        const busyPort = errorMsg.split(':')[1]
        appendRuntimeLog(`Port ${busyPort} sedang digunakan, menghentikan proses lama...`)
        try {
          await handleRuntimeAction(mode, action, true)
          return
        } catch {
          // force retry also failed, fall through to log error
        }
      }

      appendRuntimeLog(`Error ${mode} ${action}: ${errorMsg}`)
    } finally {
      setRuntimeBusy(null)
    }
  }

  async function loadConfigLocations(forceReload?: boolean): Promise<void> {
    try {
      const locations = await window.api.config.locations()
      if (locations.length > 0 && (!configPath || forceReload)) {
        const first = locations[0]
        useConfigStore.getState().setConfigPath(first)
        const result = await window.api.config.read(first.path)
        useConfigStore.getState().setOpenCodeConfig(result.data as any)
        const pluginList = (result.data as any).plugin || []
        usePluginStore.getState().setPlugins(
          pluginList.map((name: string) => ({
            name,
            version: '',
            enabled: true,
            installed: true
          }))
        )
      }
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }

  async function detectPM(): Promise<void> {
    try {
      const info = await window.api.pm.detect()
      setPmInfo({ preferred: info.preferred, version: info[info.preferred]?.version || '?' })
    } catch {
      /* ignore */
    }
  }

  async function detectOpenCode(): Promise<void> {
    try {
      const result = await window.api.pm.detectOpenCode()
      setOcStatus({ found: result.found, version: result.version })
    } catch {
      setOcStatus({ found: false, version: '' })
    }
  }

  async function detectOpenCodeApp(): Promise<void> {
    try {
      const result = await (window.api as any).pm.detectOpenCodeApp()
      setOcAppStatus(result)
    } catch {
      setOcAppStatus({
        found: false,
        version: '',
        installPath: '',
        appExe: '',
        cliExe: ''
      })
    }
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

  async function handleCreateConfig(): Promise<void> {
    try {
      const configApi = window.api.config as any
      const createdPath: string = await configApi.createDefault('opencode')
      appendRuntimeLog(`Config dibuat: ${createdPath}`)
      await loadConfigLocations(true)
    } catch (e: any) {
      appendRuntimeLog(`Gagal membuat config: ${e.message || 'unknown error'}`)
    }
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div className="animate-stagger-in stagger-1">
        <h1 className="text-2xl font-bold text-themed tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-themed-muted">System overview and runtime controls</p>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Config Status */}
        <div className="card card-accent-left animate-stagger-in stagger-1 !border-l-accent">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/[0.08] p-2.5">
              <FileJson size={18} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-themed-muted">
                Config Status
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {configPath?.exists ? (
                  <CheckCircle size={13} className="text-success shrink-0" />
                ) : (
                  <XCircle size={13} className="text-themed-muted shrink-0" />
                )}
                <span className="text-sm font-semibold text-themed">
                  {configPath?.exists ? 'Loaded' : 'Not loaded'}
                </span>
              </div>
              {configPath && (
                <p
                  className="mt-1.5 truncate text-[11px] text-themed-muted font-mono"
                  title={configPath.path}
                >
                  {configPath.path}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Active Plugins */}
        <div className="card card-accent-left animate-stagger-in stagger-2 !border-l-[#818cf8]">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#818cf8]/[0.08] p-2.5">
              <Puzzle size={18} className="text-[#818cf8]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-themed-muted">
                Active Plugins
              </p>
              <span className="text-xl font-bold text-themed tabular-nums">{plugins.length}</span>
              {plugins.slice(0, 2).map((p) => (
                <p key={p.name} className="truncate text-[11px] text-themed-muted">
                  {p.name}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Registered Skills */}
        <div className="card card-accent-left animate-stagger-in stagger-3 !border-l-[#f59e0b]">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-warning/[0.08] p-2.5">
              <Wand2 size={18} className="text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-themed-muted">
                Registered Skills
              </p>
              <span className="text-xl font-bold text-themed tabular-nums">{skills.length}</span>
            </div>
          </div>
        </div>

        {/* OpenCode CLI */}
        <div className="card card-accent-left animate-stagger-in stagger-4 !border-l-success">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-success/[0.08] p-2.5">
              <Terminal size={18} className="text-success" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-themed-muted">
                OpenCode CLI
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {ocStatus === null ? (
                  <span className="text-sm font-medium text-themed-muted animate-breathe">
                    Detecting...
                  </span>
                ) : ocStatus.found ? (
                  <>
                    <CheckCircle size={13} className="text-success shrink-0" />
                    <span className="text-sm font-semibold text-themed">v{ocStatus.version}</span>
                  </>
                ) : (
                  <>
                    <XCircle size={13} className="text-danger shrink-0" />
                    <span className="text-sm font-medium text-danger">Not installed</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* OpenCode App */}
        <div className="card animate-stagger-in stagger-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/[0.08] p-2.5">
              <Monitor size={18} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-themed-muted">
                OpenCode App
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {ocAppStatus === null ? (
                  <span className="text-sm font-medium text-themed-muted animate-breathe">
                    Detecting...
                  </span>
                ) : ocAppStatus.found ? (
                  <>
                    <CheckCircle size={13} className="text-success shrink-0" />
                    <span className="text-sm font-semibold text-themed">
                      {ocAppStatus.version ? `v${ocAppStatus.version}` : 'Installed'}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={13} className="text-themed-muted shrink-0" />
                    <span className="text-sm font-medium text-themed-muted">Not installed</span>
                  </>
                )}
              </div>
              {ocAppStatus?.found && (
                <p
                  className="mt-1.5 truncate text-[11px] text-themed-muted font-mono"
                  title={ocAppStatus.installPath}
                >
                  {ocAppStatus.installPath}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Package Manager */}
        <div className="card animate-stagger-in stagger-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/[0.08] p-2.5">
              <Package size={18} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-themed-muted">
                Package Manager
              </p>
              <span className="text-sm font-semibold text-themed">
                {pmInfo ? `${pmInfo.preferred} v${pmInfo.version}` : 'Detecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Install OpenCode Warning */}
      {ocStatus && !ocStatus.found && (
        <div className="animate-slide-up rounded-xl border border-warning/20 bg-warning/[0.04] p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-warning mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-themed">OpenCode Not Detected</h3>
                <p className="mt-1 text-sm text-themed-secondary leading-relaxed">
                  OpenCode CLI tidak ditemukan di PATH.
                  {ocAppStatus?.found
                    ? ' Desktop App terdeteksi tapi CLI-nya tidak tersedia di PATH.'
                    : ' Install via npm/bun atau download OpenCode Desktop App.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-[30px]">
              <Button
                onClick={() => handleInstallOpenCode('npm')}
                loading={installing}
                disabled={installing}
              >
                <Download size={15} /> Install CLI (npm)
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleInstallOpenCode('bun')}
                loading={installing}
                disabled={installing || !pmInfo || pmInfo.preferred !== 'bun'}
              >
                <Download size={15} /> Install CLI (bun)
              </Button>
              {!ocAppStatus?.found && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    (window as any).electron?.shell?.openExternal?.(
                      'https://opencode.ai/download/stable/windows-x64-nsis'
                    ) ||
                    window.open('https://opencode.ai/download/stable/windows-x64-nsis')
                  }
                >
                  <Monitor size={15} /> Download Desktop App
                </Button>
              )}
            </div>
            {installLog.length > 0 && (
              <div className="ml-[30px] max-h-32 overflow-auto rounded-lg bg-primary/80 p-3 font-mono text-xs text-themed-muted border border-border-default">
                {installLog.map((line, i) => (
                  <div key={i} className={line.startsWith('Error') ? 'text-danger' : ''}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Config Not Found Warning */}
      {!configPath && (
        <div className="animate-slide-up rounded-xl border border-warning/20 bg-warning/[0.04] p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-warning mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-themed">Config File Tidak Ditemukan</h3>
                <p className="mt-1 text-sm text-themed-secondary leading-relaxed">
                  File{' '}
                  <code className="rounded-md bg-primary/80 px-1.5 py-0.5 text-xs font-mono border border-border-default">
                    opencode.json
                  </code>{' '}
                  tidak ditemukan.
                  {ocStatus?.found || ocAppStatus?.found
                    ? ' OpenCode terdeteksi tapi belum ada file konfigurasi.'
                    : ''}{' '}
                  Buat file config default untuk mulai menggunakan OpenCode Manager.
                </p>
              </div>
            </div>
            <div className="pl-[30px]">
              <Button onClick={handleCreateConfig}>
                <FilePlus size={15} /> Buat Config Default
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="animate-stagger-in stagger-3">
        <h2 className="mb-3 text-sm font-semibold text-themed tracking-tight">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/opencode-config')}>
            <FileJson size={15} /> Open Config
          </Button>
          <Button variant="secondary" onClick={() => navigate('/plugins')}>
            <Puzzle size={15} /> Manage Plugins
          </Button>
          <Button variant="secondary" onClick={() => navigate('/agent-config')}>
            <Bot size={15} /> Agent Config
          </Button>
          <Button variant="secondary" onClick={() => toggleTerminal()}>
            <Terminal size={15} /> Terminal
          </Button>
          <Button variant="secondary" onClick={() => setBackupMode('backup')}>
            <Archive size={15} /> Backup
          </Button>
          <Button variant="secondary" onClick={() => loadConfigLocations()}>
            <RefreshCw size={15} /> Reload
          </Button>
        </div>
      </div>

      {/* Runtime Control */}
      <div className="animate-stagger-in stagger-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-themed tracking-tight">
            OpenCode Runtime Control
          </h2>
          <p className="text-xs text-themed-muted mt-0.5">
            Start/Stop/Restart OpenCode CLI and OpenCode Web
          </p>
        </div>

        <div className="space-y-3">
          {/* CLI Control */}
          <div className="rounded-xl border border-border-default bg-surface/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal size={16} className="text-accent" />
                <span className="text-sm font-semibold text-themed">OpenCode CLI</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`status-dot ${runtimeStatus?.cli.running ? 'status-dot-active' : 'status-dot-inactive'}`}
                />
                <span
                  className={`text-xs font-medium ${runtimeStatus?.cli.running ? 'text-success' : 'text-themed-muted'}`}
                >
                  {runtimeStatus?.cli.running
                    ? `Running (PID ${runtimeStatus.cli.pid ?? '-'})`
                    : 'Stopped'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={!!runtimeBusy || !!runtimeStatus?.cli.running}
                onClick={() => handleRuntimeAction('cli', 'start')}
              >
                <Play size={14} /> Start
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy || !runtimeStatus?.cli.running}
                onClick={() => handleRuntimeAction('cli', 'stop')}
              >
                <Square size={14} /> Stop
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy}
                onClick={() => handleRuntimeAction('cli', 'restart')}
              >
                <RotateCcw size={14} /> Restart
              </Button>
            </div>
          </div>

          {/* Web Control */}
          <div className="rounded-xl border border-border-default bg-surface/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Globe size={16} className="text-accent" />
                <span className="text-sm font-semibold text-themed">OpenCode Web</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`status-dot ${runtimeStatus?.web.running ? 'status-dot-active' : 'status-dot-inactive'}`}
                />
                <span
                  className={`text-xs font-medium ${runtimeStatus?.web.running ? 'text-success' : 'text-themed-muted'}`}
                >
                  {runtimeStatus?.web.running
                    ? `Running (port ${runtimeStatus.web.port ?? '-'})`
                    : 'Stopped'}
                </span>
              </div>
            </div>

            <div className="mb-4 max-w-[200px]">
              <TextInput
                label="Custom Port"
                type="number"
                value={openCodeWebPort}
                onChange={setOpenCodeWebPort}
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
                <Play size={14} /> Start
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy || !runtimeStatus?.web.running}
                onClick={() => handleRuntimeAction('web', 'stop')}
              >
                <Square size={14} /> Stop
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy}
                onClick={() => handleRuntimeAction('web', 'restart')}
              >
                <RotateCcw size={14} /> Restart
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy}
                onClick={refreshRuntimeStatus}
              >
                <RefreshCw size={14} /> Refresh Status
              </Button>
            </div>
          </div>

          {/* Runtime Log */}
          {runtimeLog.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-lg bg-primary/80 p-3 font-mono text-xs text-themed-muted border border-border-default">
              {runtimeLog.map((line, idx) => (
                <div key={`${line}-${idx}`} className="py-0.5">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backup Dialog */}
      {backupMode && (
        <BackupDialog open={!!backupMode} onClose={() => setBackupMode(null)} mode={backupMode} />
      )}

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="animate-stagger-in stagger-5">
          <h2 className="mb-3 text-sm font-semibold text-themed tracking-tight">
            Recent Projects
          </h2>
          <div className="space-y-2">
            {recentProjects.map((path) => (
              <div
                key={path}
                className="flex items-center justify-between rounded-xl border border-border-default bg-surface/30 p-3 hover:border-[var(--color-border-bright)] transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderOpen size={15} className="text-themed-muted shrink-0" />
                  <span className="truncate text-sm text-themed-secondary font-mono">
                    {path}
                  </span>
                </div>
                <Button variant="secondary" className="text-xs shrink-0 ml-3">
                  Open
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
