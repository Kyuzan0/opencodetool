import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfigStore, usePluginStore, useSkillStore, useSettingsStore, useUiStore } from '../stores'
import { Card, Button } from '../components/ui'
import BackupDialog from '../components/BackupRestore/BackupDialog'
import { FileJson, Bot, Puzzle, Wand2, RefreshCw, FolderOpen, CheckCircle, XCircle, Package, Archive, Terminal, Download, AlertCircle } from 'lucide-react'

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

  useEffect(() => {
    loadConfigLocations()
    detectPM()
    detectOpenCode()
  }, [])

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
