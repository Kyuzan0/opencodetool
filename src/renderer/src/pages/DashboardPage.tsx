import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OpenCodeConfig } from '../../../shared/types'
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
      const status = await window.api.opencode.status() as OpenCodeRuntimeOverview
      setRuntimeStatus(status)
    } catch (e: unknown) {
      appendRuntimeLog(`Gagal membaca status runtime: ${e instanceof Error ? e.message : 'unknown error'}`)
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
      const opencodeApi = window.api.opencode
      if (!opencodeApi) throw new Error('OpenCode runtime API tidak tersedia')

      let result: { running: boolean; port?: number | null }
      if (action === 'stop') {
        const stopPort =
          mode === 'web'
            ? (runtimeStatus?.web.port ?? (Number(openCodeWebPort) || undefined))
            : undefined
        result = (await opencodeApi.stop(mode, stopPort)) as { running: boolean; port?: number | null }
      } else if (mode === 'web') {
        const port = parseWebPort()
        result =
          action === 'start'
            ? (await opencodeApi.start(mode, port, force)) as { running: boolean; port?: number | null }
            : (await opencodeApi.restart(mode, port)) as { running: boolean; port?: number | null }
      } else {
        result =
          action === 'start' 
            ? (await opencodeApi.start(mode)) as { running: boolean; port?: number | null }
            : (await opencodeApi.restart(mode)) as { running: boolean; port?: number | null }
      }

      await refreshRuntimeStatus()
      const modeLabel = mode === 'cli' ? 'OpenCode CLI' : 'OpenCode Web'
      const portSuffix = result.port ? ` (port ${result.port})` : ''
      appendRuntimeLog(
        `${modeLabel} ${action} -> ${result.running ? 'running' : 'stopped'}${portSuffix}`
      )
    } catch (e: unknown) {
      const errorMsg: string = e instanceof Error ? e.message : 'unknown error'

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
        useConfigStore.getState().setConfigPath(first as any) // Need to cast as any due to ConfigLocation type mismatch
        const result = await window.api.config.read(first.path)
        useConfigStore.getState().setOpenCodeConfig(result.data as OpenCodeConfig)
        const pluginList = (result.data as OpenCodeConfig).plugin || []
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
      const info = await window.api.pm.detect() as any
      if (info && typeof info === 'object' && 'preferred' in info) {
        setPmInfo({ 
          preferred: info.preferred as string, 
          version: info[info.preferred as string]?.version || '?' 
        })
      }
    } catch {
      /* ignore */
    }
  }

  async function detectOpenCode(): Promise<void> {
    try {
      const result = await window.api.pm.detectOpenCode() as any
      setOcStatus({ found: !!result.installed, version: result.version || '' })
    } catch {
      setOcStatus({ found: false, version: '' })
    }
  }

  async function detectOpenCodeApp(): Promise<void> {
    try {
      const result = await window.api.pm.detectOpenCodeApp() as any
      setOcAppStatus({
        found: !!result.found,
        version: result.version || '',
        installPath: result.installPath || '',
        appExe: result.appExe || '',
        cliExe: result.cliExe || ''
      })
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
      const result = await window.api.pm.installOpenCode(pm) as any
      if (result && typeof result === 'object' && result.exitCode === 0) {
        setInstallLog((prev) => [...prev, result.stdout || 'Installed successfully'])
        await detectOpenCode()
      } else {
        setInstallLog((prev) => [...prev, `Error: ${result?.stderr || 'Install failed'}`])
      }
    } catch (e: unknown) {
      setInstallLog((prev) => [...prev, `Error: ${e instanceof Error ? e.message : 'Install failed'}`])
    } finally {
      setInstalling(false)
    }
  }

  async function handleCreateConfig(): Promise<void> {
    try {
      // @ts-ignore - The types in window.api.config are complex, we'll bypass for now to avoid TS errors
      const result = await window.api.config.createDefault({ type: 'opencode', path: '' }) as any
      if (result && typeof result === 'object' && result.success && result.path) {
        appendRuntimeLog(`Config dibuat: ${result.path}`)
        await loadConfigLocations(true)
      } else {
        appendRuntimeLog(`Gagal membuat config: ${result?.error || 'unknown error'}`)
      }
    } catch (e: unknown) {
      appendRuntimeLog(`Gagal membuat config: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  return (
    <div className="space-y-10 max-w-6xl">
      {/* Page Header */}
      <div className="animate-stagger-in stagger-1">
        <h1 className="text-2xl font-bold text-themed tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-themed-muted">System overview and runtime controls</p>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* HERO KPIs */}
        <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Config Status */}
          <div className="card card-accent-left animate-stagger-in stagger-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-accent opacity-5 blur-2xl group-hover:opacity-10 transition-opacity"></div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="rounded-xl bg-accent/[0.12] p-3 shadow-inner">
                <FileJson size={24} className="text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-themed-muted mb-1">
                  Config Status
                </p>
                <div className="flex items-center gap-2">
                  <span className={`status-dot ${configPath?.exists ? 'status-dot-active' : 'status-dot-inactive'}`} />
                  <span className="text-xl font-bold text-themed tracking-tight">
                    {configPath?.exists ? 'Loaded' : 'Not Loaded'}
                  </span>
                </div>
                {configPath && (
                  <p
                    className="mt-2 truncate text-xs text-themed-secondary font-mono bg-surface/50 rounded-md px-2 py-1 inline-block border border-border-default max-w-full"
                    title={configPath.path}
                  >
                    {configPath.path}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* OpenCode CLI */}
          <div className="card card-accent-left card-accent-success animate-stagger-in stagger-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-success opacity-5 blur-2xl group-hover:opacity-10 transition-opacity"></div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="rounded-xl bg-success/[0.12] p-3 shadow-inner">
                <Terminal size={24} className="text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-themed-muted mb-1">
                  OpenCode CLI
                </p>
                <div className="flex items-center gap-2">
                  {ocStatus === null ? (
                    <>
                      <span className="status-dot status-dot-warning animate-pulse" />
                      <span className="text-xl font-bold text-themed-muted tracking-tight">Detecting...</span>
                    </>
                  ) : ocStatus.found ? (
                    <>
                      <span className="status-dot status-dot-active" />
                      <span className="text-xl font-bold text-themed tracking-tight">v{ocStatus.version}</span>
                      <span className="badge badge-success ml-2">Installed</span>
                    </>
                  ) : (
                    <>
                      <span className="status-dot status-dot-inactive" />
                      <span className="text-xl font-bold text-danger tracking-tight">Missing</span>
                    </>
                  )}
                </div>
                {ocStatus?.found && (
                  <p className="mt-2 text-xs text-themed-secondary font-medium">Ready to execute commands</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECONDARY INFO */}
        <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Plugins */}
          <div className="card animate-stagger-in stagger-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-[#818cf8]/[0.15] p-2">
                <Puzzle size={16} className="text-[#818cf8]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-themed-muted">
                  Active Plugins
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold text-themed tabular-nums">{plugins.length}</span>
                  <span className="text-[10px] text-themed-muted">loaded</span>
                </div>
              </div>
            </div>
            {plugins.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#818cf8]/50"></div>
            )}
          </div>

          {/* Registered Skills */}
          <div className="card animate-stagger-in stagger-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-warning/[0.15] p-2">
                <Wand2 size={16} className="text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-themed-muted">
                  Registered Skills
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold text-themed tabular-nums">{skills.length}</span>
                  <span className="text-[10px] text-themed-muted">available</span>
                </div>
              </div>
            </div>
            {skills.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-warning/50"></div>
            )}
          </div>

          {/* OpenCode App */}
          <div className="card animate-stagger-in stagger-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-accent/[0.15] p-2">
                <Monitor size={16} className="text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-themed-muted">
                  Desktop App
                </p>
                <div className="mt-1 flex items-center">
                  {ocAppStatus === null ? (
                    <span className="text-sm font-medium text-themed-muted">Detecting...</span>
                  ) : ocAppStatus.found ? (
                    <span className="badge badge-success">
                      {ocAppStatus.version ? `v${ocAppStatus.version}` : 'Installed'}
                    </span>
                  ) : (
                    <span className="badge badge-muted">Not installed</span>
                  )}
                </div>
              </div>
            </div>
            {ocAppStatus?.found && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-success/50"></div>
            )}
          </div>

          {/* Package Manager */}
          <div className="card animate-stagger-in stagger-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-accent/[0.15] p-2">
                <Package size={16} className="text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-themed-muted">
                  Package Manager
                </p>
                <div className="mt-1 text-sm font-semibold text-themed">
                  {pmInfo ? `${pmInfo.preferred} v${pmInfo.version}` : 'Detecting...'}
                </div>
              </div>
            </div>
            {pmInfo && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent/50"></div>
            )}
          </div>
        </div>
      </div>

      {/* Install OpenCode Warning */}
      {ocStatus && !ocStatus.found && (
        <div className="animate-slide-up card card-accent-left card-accent-warning p-5">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-warning opacity-5 blur-2xl pointer-events-none"></div>
          <div className="space-y-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-warning/10 p-2 mt-0.5">
                <AlertCircle size={20} className="text-warning shrink-0" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-themed">OpenCode CLI Not Detected</h3>
                <p className="mt-1 text-sm text-themed-secondary leading-relaxed max-w-3xl">
                  OpenCode CLI tidak ditemukan di PATH sistem.
                  {ocAppStatus?.found
                    ? ' Desktop App terdeteksi tapi CLI-nya tidak tersedia di PATH.'
                    : ' Install via npm/bun atau download OpenCode Desktop App.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pl-14">
              <Button
                variant="primary"
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
                  onClick={() => {
                    const url = 'https://opencode.ai/download/stable/windows-x64-nsis'
                    if (window.electron?.platform) {
                      window.api.config.openExternal(url)
                    } else {
                      window.open(url)
                    }
                  }}
                >
                  <Monitor size={15} /> Download Desktop App
                </Button>
              )}
            </div>
            {installLog.length > 0 && (
              <div className="ml-14 max-h-32 overflow-auto rounded-lg bg-primary/80 p-4 font-mono text-[11px] text-themed-secondary border border-border-default shadow-inner">
                {installLog.map((line, i) => (
                  <div key={i} className={`py-0.5 ${line.startsWith('Error') ? 'text-danger font-medium' : ''}`}>
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
        <div className="animate-slide-up card card-accent-left card-accent-warning p-5">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-warning opacity-5 blur-2xl pointer-events-none"></div>
          <div className="space-y-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-warning/10 p-2 mt-0.5">
                <AlertCircle size={20} className="text-warning shrink-0" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-themed">Config File Tidak Ditemukan</h3>
                <p className="mt-1 text-sm text-themed-secondary leading-relaxed max-w-3xl">
                  File{' '}
                  <code className="rounded-md bg-primary/80 px-1.5 py-0.5 text-[11px] font-mono border border-border-default shadow-sm">
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
            <div className="pl-14">
              <Button variant="primary" onClick={handleCreateConfig}>
                <FilePlus size={15} /> Buat Config Default
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="animate-stagger-in stagger-3">
        <h2 className="mb-4 text-sm font-bold text-themed uppercase tracking-widest text-themed-muted">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => navigate('/opencode-config')}>
            <FileJson size={15} /> Open Config
          </Button>
          <div className="w-px h-8 bg-border-default mx-1 hidden sm:block"></div>
          <Button variant="secondary" onClick={() => navigate('/plugins')}>
            <Puzzle size={15} /> Plugins
          </Button>
          <Button variant="secondary" onClick={() => navigate('/agent-config')}>
            <Bot size={15} /> Agents
          </Button>
          <Button variant="secondary" onClick={() => toggleTerminal()}>
            <Terminal size={15} /> Terminal
          </Button>
          <div className="w-px h-8 bg-border-default mx-1 hidden sm:block"></div>
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
        <div className="mb-4">
          <h2 className="text-sm font-bold text-themed tracking-tight uppercase tracking-widest text-themed-muted">
            OpenCode Runtime
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* CLI Control */}
          <div className="card !p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-surface p-2 shadow-sm border border-border-default">
                  <Terminal size={18} className="text-accent" />
                </div>
                <div>
                  <span className="text-sm font-bold text-themed block">OpenCode CLI</span>
                  <span className="text-[11px] text-themed-muted font-medium">Background Process</span>
                </div>
              </div>
              <div className="flex items-center">
                <span
                  className={`badge ${runtimeStatus?.cli.running ? 'badge-success' : 'badge-muted'}`}
                >
                  <span
                    className={`status-dot ${runtimeStatus?.cli.running ? 'status-dot-active' : 'bg-themed-muted shadow-none'}`}
                  />
                  {runtimeStatus?.cli.running
                    ? `Running (PID ${runtimeStatus.cli.pid ?? '-'})`
                    : 'Stopped'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={runtimeStatus?.cli.running ? "secondary" : "primary"}
                disabled={!!runtimeBusy || !!runtimeStatus?.cli.running}
                onClick={() => handleRuntimeAction('cli', 'start')}
                className="flex-1 sm:flex-none"
              >
                <Play size={14} /> Start
              </Button>
              <Button
                variant={runtimeStatus?.cli.running ? "danger" : "secondary"}
                disabled={!!runtimeBusy || !runtimeStatus?.cli.running}
                onClick={() => handleRuntimeAction('cli', 'stop')}
                className="flex-1 sm:flex-none"
              >
                <Square size={14} /> Stop
              </Button>
              <Button
                variant="secondary"
                disabled={!!runtimeBusy || !runtimeStatus?.cli.running}
                onClick={() => handleRuntimeAction('cli', 'restart')}
                className="flex-1 sm:flex-none"
              >
                <RotateCcw size={14} /> Restart
              </Button>
            </div>
          </div>

          {/* Web Control */}
          <div className="card !p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-surface p-2 shadow-sm border border-border-default">
                  <Globe size={18} className="text-accent" />
                </div>
                <div>
                  <span className="text-sm font-bold text-themed block">OpenCode Web</span>
                  <span className="text-[11px] text-themed-muted font-medium">Browser Interface</span>
                </div>
              </div>
              <div className="flex items-center">
                <span
                  className={`badge ${runtimeStatus?.web.running ? 'badge-success' : 'badge-muted'}`}
                >
                  <span
                    className={`status-dot ${runtimeStatus?.web.running ? 'status-dot-active' : 'bg-themed-muted shadow-none'}`}
                  />
                  {runtimeStatus?.web.running
                    ? `Running (Port ${runtimeStatus.web.port ?? '-'})`
                    : 'Stopped'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-full sm:w-28 shrink-0">
                <TextInput
                  type="number"
                  value={openCodeWebPort}
                  onChange={setOpenCodeWebPort}
                  placeholder="3000"
                  disabled={!!runtimeBusy}
                  className="h-9 !py-1.5"
                />
              </div>

              <div className="flex flex-wrap gap-2 flex-1">
                <Button
                  variant={runtimeStatus?.web.running ? "secondary" : "primary"}
                  disabled={!!runtimeBusy || !!runtimeStatus?.web.running}
                  onClick={() => handleRuntimeAction('web', 'start')}
                  className="flex-1 sm:flex-none h-9"
                >
                  <Play size={14} /> Start
                </Button>
                <Button
                  variant={runtimeStatus?.web.running ? "danger" : "secondary"}
                  disabled={!!runtimeBusy || !runtimeStatus?.web.running}
                  onClick={() => handleRuntimeAction('web', 'stop')}
                  className="flex-1 sm:flex-none h-9"
                >
                  <Square size={14} /> Stop
                </Button>
                <Button
                  variant="secondary"
                  disabled={!!runtimeBusy || !runtimeStatus?.web.running}
                  onClick={() => handleRuntimeAction('web', 'restart')}
                  className="flex-1 sm:flex-none h-9"
                >
                  <RotateCcw size={14} /> Restart
                </Button>
                <Button
                  variant="secondary"
                  disabled={!!runtimeBusy}
                  onClick={refreshRuntimeStatus}
                  className="flex-1 sm:flex-none h-9"
                  title="Refresh Status"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Runtime Log */}
        {runtimeLog.length > 0 && (
          <div className="mt-4 max-h-40 overflow-auto rounded-lg bg-primary/90 p-4 font-mono text-[11px] text-themed-secondary border border-border-default shadow-inner">
            {runtimeLog.map((line, idx) => (
              <div key={`${line}-${idx}`} className="py-0.5 whitespace-pre-wrap">
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backup Dialog */}
      {backupMode && (
        <BackupDialog open={!!backupMode} onClose={() => setBackupMode(null)} mode={backupMode} />
      )}

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="animate-stagger-in stagger-5">
          <h2 className="mb-4 text-sm font-bold text-themed uppercase tracking-widest text-themed-muted">
            Recent Projects
          </h2>
          <div className="card !p-0 overflow-hidden">
            {recentProjects.map((path, index) => (
              <div
                key={path}
                className={`flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors ${
                  index !== recentProjects.length - 1 ? 'border-b border-border-default' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-md bg-surface p-1.5 border border-border-default">
                    <FolderOpen size={14} className="text-themed-secondary shrink-0" />
                  </div>
                  <span className="truncate text-sm text-themed-secondary font-mono">
                    {path}
                  </span>
                </div>
                <Button variant="secondary" className="text-xs shrink-0 ml-4 !py-1 !px-3 h-8">
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
