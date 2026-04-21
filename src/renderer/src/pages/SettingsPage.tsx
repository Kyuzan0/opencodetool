import { useState, useEffect } from 'react'
import { useSettingsStore, useConfigStore, usePluginStore, useSkillStore, useUpdateStore } from '../stores'
import { Card, TextInput, SelectInput, ToggleSwitch, Button, Modal } from '../components/ui'
import { Moon, Sun, FolderOpen, ExternalLink, Trash2, AlertTriangle, CheckCircle, Database, FolderX, Monitor, RefreshCw } from 'lucide-react'
import type { ShellInfo } from '@shared/types'

interface UninstallTargets {
  cli: string[]
  core: string[]
  plugins: string[]
  mcp: string[]
  skills: string[]
  sessions: string[]
  projectData: string[]
}

interface UninstallOptions {
  cli: boolean
  core: boolean
  plugins: boolean
  mcp: boolean
  skills: boolean
  sessions: boolean
  projectData: boolean
  projectPaths?: string[]
}

export default function SettingsPage(): JSX.Element {
  const {
    theme, language, defaultConfigPath, preferredShell, bunPath, autoBackup,
    setTheme, setLanguage, setDefaultPath, setPreferredShell, setBunPath, setAutoBackup
  } = useSettingsStore()
  const [shells, setShells] = useState<ShellInfo[]>([])
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [uninstallTargets, setUninstallTargets] = useState<UninstallTargets | null>(null)
  const [uninstallOpts, setUninstallOpts] = useState<UninstallOptions>({
    cli: true, core: true, plugins: true, mcp: true, skills: true, sessions: true, projectData: true
  })
  const [uninstalling, setUninstalling] = useState(false)
  const [uninstallResult, setUninstallResult] = useState<{ removed: string[]; errors: string[] } | null>(null)
  const [uninstallDone, setUninstallDone] = useState(false)
  const [showDesktopUninstall, setShowDesktopUninstall] = useState(false)
  const [desktopUninstalling, setDesktopUninstalling] = useState(false)
  const [desktopInfo, setDesktopInfo] = useState<{ found: boolean; path: string; installPath: string } | null>(null)
  const [desktopError, setDesktopError] = useState('')
  const { status: updateStatus, checkForUpdate, info: updateInfo } = useUpdateStore()

  useEffect(() => {
    window.api.shell.detect().then(setShells).catch(() => {})
  }, [])

  async function openUninstallModal(): Promise<void> {
    try {
      const targets = await window.api.uninstall.scan()
      setUninstallTargets(targets)
      setUninstallOpts({
        cli: true, core: true, plugins: true, mcp: true, skills: true,
        sessions: true, projectData: true
      })
      setUninstallResult(null)
      setUninstallDone(false)
      setShowUninstallModal(true)
    } catch { /* ignore */ }
  }

  function resetAllStores(): void {
    const configStore = useConfigStore.getState()
    configStore.setOpenCodeConfig(null)
    configStore.setAgentConfig(null)
    configStore.setConfigPath(null)
    configStore.setAgentConfigPath(null)
    configStore.setError(null)
    configStore.setDirty(false)
    configStore.setAgentDirty(false)

    usePluginStore.getState().setPlugins([])

    useSkillStore.getState().setSkills([])
    useSkillStore.getState().setSelectedSkill(null)
  }

  async function handleUninstall(): Promise<void> {
    setUninstalling(true)
    try {
      // Build project paths from scanned targets if projectData is enabled
      const opts: UninstallOptions = { ...uninstallOpts }
      if (opts.projectData && uninstallTargets?.projectData.length) {
        // Extract parent project paths from the .opencode/.sisyphus paths
        opts.projectPaths = [...new Set(
          uninstallTargets.projectData.map(p => {
            // e.g. D:\laragon\www\app\project\.sisyphus -> D:\laragon\www\app\project
            const parts = p.replace(/\\/g, '/').split('/')
            parts.pop() // remove .opencode/.sisyphus
            return parts.join('\\')
          })
        )]
      }

      const result = await window.api.uninstall.perform(opts)
      setUninstallResult(result)

      const targets = await window.api.uninstall.scan()
      setUninstallTargets(targets)

      resetAllStores()

      if (result.removed.length > 0) {
        setUninstallDone(true)
      }
    } catch (e: unknown) {
      setUninstallResult({ removed: [], errors: [e instanceof Error ? e.message : 'Uninstall failed'] })
    } finally {
      setUninstalling(false)
    }
  }

  async function openDesktopUninstallModal(): Promise<void> {
    setDesktopError('')
    try {
      const info = await window.api.uninstall.desktopCheck()
      setDesktopInfo(info)
      setShowDesktopUninstall(true)
    } catch (e: unknown) {
      setDesktopError(e instanceof Error ? e.message : 'Failed to check OpenCode Desktop')
    }
  }

  async function handleDesktopUninstall(): Promise<void> {
    setDesktopUninstalling(true)
    setDesktopError('')
    try {
      const result = await window.api.uninstall.desktopRun()
      if (!result.success) {
        setDesktopError(result.message)
      } else {
        setShowDesktopUninstall(false)
      }
    } catch (e: unknown) {
      setDesktopError(e instanceof Error ? e.message : 'Failed to run uninstaller')
    } finally {
      setDesktopUninstalling(false)
    }
  }

  const shellOpts = shells.filter((s) => s.available).map((s) => ({ value: s.name, label: `${s.name} (${s.path})` }))

  const hasAnyOption = uninstallOpts.cli || uninstallOpts.core || uninstallOpts.plugins ||
    uninstallOpts.mcp || uninstallOpts.skills || uninstallOpts.sessions || uninstallOpts.projectData

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-themed">Settings</h1>
        <p className="text-[13px] text-themed-muted mt-1">Configure application preferences and paths</p>
      </div>

      <Card title="Appearance">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={20} className="text-accent" /> : <Sun size={20} className="text-warning" />}
              <div>
                <span className="text-sm font-medium text-themed">Theme</span>
                <p className="text-xs text-themed-muted">Switch between dark and light mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${theme === 'dark' ? 'text-accent' : 'text-themed-muted'}`}>Dark</span>
              <ToggleSwitch checked={theme === 'light'} onChange={(c) => setTheme(c ? 'light' : 'dark')} />
              <span className={`text-xs ${theme === 'light' ? 'text-accent' : 'text-themed-muted'}`}>Light</span>
            </div>
          </div>
          <SelectInput label="Language" options={[{ value: 'en', label: 'English' }, { value: 'id', label: 'Indonesian' }]} value={language} onChange={setLanguage} />
        </div>
      </Card>

      <Card title="Paths">
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <TextInput label="Default Config Directory" description="Path to the default OpenCode project directory" value={defaultConfigPath} onChange={setDefaultPath} placeholder="e.g. C:\Users\you\projects\myapp" className="flex-1" />
            <Button variant="secondary" onClick={async () => { const d = await window.api.dialog.openDirectory(); if (d) setDefaultPath(d) }}><FolderOpen size={16} /> Browse</Button>
          </div>
          <div className="flex items-end gap-2">
            <TextInput label="Bun Path" description="Custom path to bun executable (leave empty for auto-detection)" value={bunPath} onChange={setBunPath} placeholder="e.g. C:\Apps\bun\bin\bun.exe" className="flex-1" />
            <Button variant="secondary" onClick={async () => { const f = await window.api.dialog.openFile({ filters: [{ name: 'Executable', extensions: ['exe'] }] }); if (f) setBunPath(f) }}><FolderOpen size={16} /> Browse</Button>
          </div>
        </div>
      </Card>

      <Card title="Terminal">
        <div className="space-y-4">
          <SelectInput label="Default Shell" description="Shell to use when opening the integrated terminal" options={shellOpts} value={preferredShell} onChange={setPreferredShell} placeholder="Select shell" />
        </div>
      </Card>

      <Card title="General">
        <div className="space-y-4">
          <ToggleSwitch label="Auto Backup" description="Automatically backup config files before saving" checked={autoBackup} onChange={setAutoBackup} />
        </div>
      </Card>

      <Card title="About">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-themed-secondary">App Version</span>
            <span className="text-sm text-themed">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-themed-secondary">Electron</span>
            <span className="text-sm text-themed">{window.electron?.process?.versions?.electron || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-themed-secondary">Updates</span>
            <div className="flex items-center gap-2">
              {updateStatus === 'available' && updateInfo && (
                <span className="text-xs text-accent font-medium">v{updateInfo.latestVersion} available</span>
              )}
              {updateStatus === 'idle' && updateInfo && !updateInfo.hasUpdate && (
                <span className="text-xs text-themed-muted">Up to date</span>
              )}
              {updateStatus === 'error' && (
                <span className="text-xs text-danger">Check failed</span>
              )}
              <Button variant="secondary" onClick={() => checkForUpdate()} loading={updateStatus === 'checking'} className="text-xs px-3 py-1.5">
                <RefreshCw size={14} /> Check for Updates
              </Button>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
            <a href="https://opencode.ai" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover"><ExternalLink size={14} /> OpenCode Documentation</a>
            <a href="https://github.com/code-yeongyu/oh-my-openagent" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover"><ExternalLink size={14} /> oh-my-openagent Documentation</a>
          </div>
        </div>
      </Card>

      <Card title="Danger Zone">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-themed">Uninstall OpenCode Desktop</span>
              <p className="text-xs text-themed-muted">Run the OpenCode Desktop uninstaller (uninstall.exe)</p>
            </div>
            <Button variant="secondary" onClick={openDesktopUninstallModal}>
              <Monitor size={16} /> Uninstall Desktop
            </Button>
          </div>

          <div className="border-t border-[var(--color-border-subtle)]" />

          {uninstallDone ? (
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-success" />
              <div>
                <span className="text-sm font-medium text-success">OpenCode has been uninstalled</span>
                <p className="text-xs text-themed-muted">All selected components have been removed. Reinstall will start fresh.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-danger">Complete Uninstall OpenCode</span>
                <p className="text-xs text-danger/60">Remove ALL OpenCode data: CLI, configs, plugins, sessions, databases, and project state</p>
              </div>
              <Button variant="danger" onClick={openUninstallModal}>
                <Trash2 size={16} /> Uninstall
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={showUninstallModal}
        onClose={() => !uninstalling && setShowUninstallModal(false)}
        title="Complete Uninstall OpenCode"
        className="max-w-2xl"
        actions={
          uninstallResult ? (
            <Button variant="secondary" onClick={() => setShowUninstallModal(false)}>Close</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowUninstallModal(false)} disabled={uninstalling}>Cancel</Button>
               <Button
                variant="danger"
                onClick={handleUninstall}
                loading={uninstalling}
                disabled={!hasAnyOption}
              >
                <Trash2 size={16} /> Uninstall Selected
              </Button>
            </>
          )
        }
      >
        {uninstallResult ? (
          <div className="space-y-3">
            {uninstallResult.removed.length > 0 && (
              <div>
                <p className="text-sm font-medium text-success mb-2">Removed ({uninstallResult.removed.length})</p>
                <div className="max-h-40 overflow-auto rounded-xl bg-primary p-3 border border-[var(--color-border-subtle)] font-mono text-xs text-themed-muted">
                  {uninstallResult.removed.map((p, i) => <div key={i}>{p}</div>)}
                </div>
              </div>
            )}
            {uninstallResult.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-danger mb-2">Errors ({uninstallResult.errors.length})</p>
                <div className="max-h-40 overflow-auto rounded-xl bg-primary p-3 border border-[var(--color-border-subtle)] font-mono text-xs text-danger">
                  {uninstallResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </div>
            )}
            {uninstallResult.removed.length === 0 && uninstallResult.errors.length === 0 && (
              <p className="text-sm text-themed-muted">Nothing to remove.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/[0.04] p-4">
              <AlertTriangle size={18} className="text-danger shrink-0" />
              <p className="text-xs text-danger">
                This will completely remove ALL OpenCode data so reinstallation starts fresh.
                This action is irreversible.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)]">
              <div className="px-4 py-3">
                <ToggleSwitch
                  label="OpenCode CLI"
                  description={`opencode-ai global package (npm/bun)${uninstallTargets ? ` (${uninstallTargets.cli.length > 0 ? 'installed' : 'not found'})` : ''}`}
                  checked={uninstallOpts.cli}
                  onChange={(v) => setUninstallOpts((o) => ({ ...o, cli: v }))}
                  disabled={!uninstallTargets?.cli.length}
                />
              </div>
              <div className="px-4 py-3">
                <ToggleSwitch
                  label="Config Directories (ENTIRE)"
                  description={`~/.config/opencode/, %APPDATA%/opencode/, %LOCALAPPDATA%/opencode/ — removes everything${uninstallTargets ? ` (${uninstallTargets.core.length} dirs)` : ''}`}
                  checked={uninstallOpts.core}
                  onChange={(v) => setUninstallOpts((o) => ({ ...o, core: v }))}
                />
              </div>
              <div className="px-4 py-3">
                <ToggleSwitch
                  label="Plugins & Dependencies"
                  description={`node_modules, package.json, lock files${uninstallTargets ? ` (${uninstallTargets.plugins.length} found)` : ''}`}
                  checked={uninstallOpts.plugins}
                  onChange={(v) => setUninstallOpts((o) => ({ ...o, plugins: v }))}
                />
              </div>
              <div className="px-4 py-3">
                <ToggleSwitch
                  label="MCP Servers"
                  description={`MCP configuration files and directories${uninstallTargets ? ` (${uninstallTargets.mcp.length} found)` : ''}`}
                  checked={uninstallOpts.mcp}
                  onChange={(v) => setUninstallOpts((o) => ({ ...o, mcp: v }))}
                />
              </div>
              <div className="px-4 py-3">
                <ToggleSwitch
                  label="Skills & Agents"
                  description={`Custom skills, commands, and agent configurations${uninstallTargets ? ` (${uninstallTargets.skills.length} found)` : ''}`}
                  checked={uninstallOpts.skills}
                  onChange={(v) => setUninstallOpts((o) => ({ ...o, skills: v }))}
                />
              </div>

              <div className="px-4 py-3">
                <p className="text-xs font-medium text-warning mb-3 flex items-center gap-1">
                  <Database size={14} /> Session & State Data
                </p>
                <div className="space-y-3">
                  <ToggleSwitch
                    label="Sessions & Database"
                    description={`Session history, SQLite databases, logs, snapshots, auth tokens, locks${uninstallTargets ? ` (${uninstallTargets.sessions.length} locations)` : ''}`}
                    checked={uninstallOpts.sessions}
                    onChange={(v) => setUninstallOpts((o) => ({ ...o, sessions: v }))}
                  />
                  <ToggleSwitch
                    label="Project State (.opencode/.sisyphus)"
                    description={`Remove state directories from all detected projects${uninstallTargets ? ` (${uninstallTargets.projectData.length} found)` : ''}`}
                    checked={uninstallOpts.projectData}
                    onChange={(v) => setUninstallOpts((o) => ({ ...o, projectData: v }))}
                  />
                </div>
              </div>
            </div>

            {uninstallTargets && (
              <details className="text-xs text-themed-muted">
                <summary className="cursor-pointer hover:text-themed-secondary">Show all files/directories to be removed</summary>
                <div className="mt-2 max-h-48 overflow-auto rounded-xl bg-primary p-3 border border-[var(--color-border-subtle)] font-mono space-y-2">
                  {uninstallOpts.cli && uninstallTargets.cli.length > 0 && (
                    <div>
                      <div className="text-accent font-semibold">CLI:</div>
                      {uninstallTargets.cli.map((p, i) => <div key={`cli${i}`} className="pl-2">{p}</div>)}
                    </div>
                  )}
                  {uninstallOpts.core && uninstallTargets.core.length > 0 && (
                    <div>
                      <div className="text-accent font-semibold">Config Directories:</div>
                      {uninstallTargets.core.map((p, i) => <div key={`c${i}`} className="pl-2">{p}</div>)}
                    </div>
                  )}
                  {uninstallOpts.plugins && uninstallTargets.plugins.length > 0 && (
                    <div>
                      <div className="text-accent font-semibold">Plugins:</div>
                      {uninstallTargets.plugins.map((p, i) => <div key={`p${i}`} className="pl-2">{p}</div>)}
                    </div>
                  )}
                  {uninstallOpts.mcp && uninstallTargets.mcp.length > 0 && (
                    <div>
                      <div className="text-accent font-semibold">MCP:</div>
                      {uninstallTargets.mcp.map((p, i) => <div key={`m${i}`} className="pl-2">{p}</div>)}
                    </div>
                  )}
                  {uninstallOpts.skills && uninstallTargets.skills.length > 0 && (
                    <div>
                      <div className="text-accent font-semibold">Skills:</div>
                      {uninstallTargets.skills.map((p, i) => <div key={`s${i}`} className="pl-2">{p}</div>)}
                    </div>
                  )}
                  {uninstallOpts.sessions && uninstallTargets.sessions.length > 0 && (
                    <div>
                      <div className="text-warning font-semibold">Sessions & Database:</div>
                      {uninstallTargets.sessions.map((p, i) => <div key={`ss${i}`} className="pl-2">{p}</div>)}
                    </div>
                  )}
                  {uninstallOpts.projectData && uninstallTargets.projectData.length > 0 && (
                    <div>
                      <div className="text-warning font-semibold">Project State:</div>
                      {uninstallTargets.projectData.map((p, i) => <div key={`pd${i}`} className="pl-2">{p}</div>)}
                    </div>
                  )}
                  {!hasAnyOption && <div>No categories selected.</div>}
                </div>
              </details>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={showDesktopUninstall}
        onClose={() => !desktopUninstalling && setShowDesktopUninstall(false)}
        title="Uninstall OpenCode Desktop"
        actions={
          desktopInfo?.found ? (
            <>
              <Button variant="secondary" onClick={() => setShowDesktopUninstall(false)} disabled={desktopUninstalling}>Cancel</Button>
              <Button variant="danger" onClick={handleDesktopUninstall} loading={desktopUninstalling}>
                <Trash2 size={16} /> Run Uninstaller
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setShowDesktopUninstall(false)}>Close</Button>
          )
        }
      >
        <div className="space-y-4">
          {desktopInfo?.found ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/[0.04] p-4">
                <AlertTriangle size={18} className="text-warning shrink-0" />
                <p className="text-xs text-warning">
                  This will launch the OpenCode Desktop uninstaller. The uninstaller may ask for administrator permissions.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border-subtle)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-themed-muted">Install Path</span>
                  <span className="text-xs font-mono text-themed">{desktopInfo.installPath}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-themed-muted">Uninstaller</span>
                  <span className="text-xs font-mono text-themed">{desktopInfo.path}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] p-4">
              <FolderX size={18} className="text-themed-muted shrink-0" />
              <div>
                <p className="text-sm text-themed">OpenCode Desktop not found</p>
                <p className="text-xs text-themed-muted mt-1">
                  {desktopInfo?.installPath
                    ? `Found install at ${desktopInfo.installPath} but uninstall.exe is missing`
                    : 'Could not detect an OpenCode Desktop installation on this system'}
                </p>
              </div>
            </div>
          )}
          {desktopError && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/[0.04] p-3">
              <AlertTriangle size={16} className="text-danger shrink-0" />
              <p className="text-xs text-danger">{desktopError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
