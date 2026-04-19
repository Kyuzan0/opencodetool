import { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores'
import { Card, TextInput, SelectInput, ToggleSwitch, Button, Modal } from '../components/ui'
import { Moon, Sun, FolderOpen, ExternalLink, Trash2, AlertTriangle } from 'lucide-react'
import type { ShellInfo } from '@shared/types'

interface UninstallTargets {
  core: string[]
  plugins: string[]
  mcp: string[]
  skills: string[]
}

interface UninstallOptions {
  core: boolean
  plugins: boolean
  mcp: boolean
  skills: boolean
}

export default function SettingsPage(): JSX.Element {
  const {
    theme, language, defaultConfigPath, preferredShell, bunPath, autoBackup,
    setTheme, setLanguage, setDefaultPath, setPreferredShell, setBunPath, setAutoBackup
  } = useSettingsStore()
  const [shells, setShells] = useState<ShellInfo[]>([])
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [uninstallTargets, setUninstallTargets] = useState<UninstallTargets | null>(null)
  const [uninstallOpts, setUninstallOpts] = useState<UninstallOptions>({ core: true, plugins: true, mcp: true, skills: true })
  const [uninstalling, setUninstalling] = useState(false)
  const [uninstallResult, setUninstallResult] = useState<{ removed: string[]; errors: string[] } | null>(null)

  useEffect(() => {
    window.api.shell.detect().then(setShells).catch(() => {})
  }, [])

  async function openUninstallModal(): Promise<void> {
    try {
      const targets = await window.api.uninstall.scan()
      setUninstallTargets(targets)
      setUninstallOpts({ core: true, plugins: true, mcp: true, skills: true })
      setUninstallResult(null)
      setShowUninstallModal(true)
    } catch { /* ignore */ }
  }

  async function handleUninstall(): Promise<void> {
    setUninstalling(true)
    try {
      const result = await window.api.uninstall.perform(uninstallOpts)
      setUninstallResult(result)
      // Re-scan to update counts
      const targets = await window.api.uninstall.scan()
      setUninstallTargets(targets)
    } catch (e: any) {
      setUninstallResult({ removed: [], errors: [e.message || 'Uninstall failed'] })
    } finally {
      setUninstalling(false)
    }
  }

  const shellOpts = shells.filter((s) => s.available).map((s) => ({ value: s.name, label: `${s.name} (${s.path})` }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-themed">Settings</h1>

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
          <div className="flex items-center justify-between">
            <span className="text-sm text-themed-secondary">App Version</span>
            <span className="text-sm text-themed">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-themed-secondary">Electron</span>
            <span className="text-sm text-themed">{window.electron?.process?.versions?.electron || 'N/A'}</span>
          </div>
          <div className="space-y-2 pt-2 border-t border-border-default">
            <a href="https://opencode.ai" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover"><ExternalLink size={14} /> OpenCode Documentation</a>
            <a href="https://github.com/code-yeongyu/oh-my-openagent" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover"><ExternalLink size={14} /> oh-my-openagent Documentation</a>
          </div>
        </div>
      </Card>

      <Card title="Danger Zone">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-danger">Uninstall OpenCode</span>
              <p className="text-xs text-themed-muted">Remove OpenCode configurations, plugins, MCP servers, and skills</p>
            </div>
            <Button variant="danger" onClick={openUninstallModal}>
              <Trash2 size={16} /> Uninstall
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={showUninstallModal}
        onClose={() => !uninstalling && setShowUninstallModal(false)}
        title="Uninstall OpenCode"
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
                disabled={!uninstallOpts.core && !uninstallOpts.plugins && !uninstallOpts.mcp && !uninstallOpts.skills}
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
                <div className="max-h-40 overflow-auto rounded-md bg-primary p-2 font-mono text-xs text-themed-muted">
                  {uninstallResult.removed.map((p, i) => <div key={i}>{p}</div>)}
                </div>
              </div>
            )}
            {uninstallResult.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-danger mb-2">Errors ({uninstallResult.errors.length})</p>
                <div className="max-h-40 overflow-auto rounded-md bg-primary p-2 font-mono text-xs text-danger">
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
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
              <AlertTriangle size={18} className="text-warning shrink-0" />
              <p className="text-xs text-warning">This action is irreversible. Selected items will be permanently deleted.</p>
            </div>

            <div className="space-y-3">
              <ToggleSwitch
                label="Core Configurations"
                description={`opencode.json, oh-my-openagent.json, kilo.json${uninstallTargets ? ` (${uninstallTargets.core.length} found)` : ''}`}
                checked={uninstallOpts.core}
                onChange={(v) => setUninstallOpts((o) => ({ ...o, core: v }))}
              />
              <ToggleSwitch
                label="Plugins"
                description={`node_modules, package.json in config directory${uninstallTargets ? ` (${uninstallTargets.plugins.length} found)` : ''}`}
                checked={uninstallOpts.plugins}
                onChange={(v) => setUninstallOpts((o) => ({ ...o, plugins: v }))}
              />
              <ToggleSwitch
                label="MCP Servers"
                description={`MCP configuration files and directories${uninstallTargets ? ` (${uninstallTargets.mcp.length} found)` : ''}`}
                checked={uninstallOpts.mcp}
                onChange={(v) => setUninstallOpts((o) => ({ ...o, mcp: v }))}
              />
              <ToggleSwitch
                label="Skills & Agents"
                description={`Custom skills, commands, and agent configurations${uninstallTargets ? ` (${uninstallTargets.skills.length} found)` : ''}`}
                checked={uninstallOpts.skills}
                onChange={(v) => setUninstallOpts((o) => ({ ...o, skills: v }))}
              />
            </div>

            {uninstallTargets && (
              <details className="text-xs text-themed-muted">
                <summary className="cursor-pointer hover:text-themed-secondary">Show files to be removed</summary>
                <div className="mt-2 max-h-40 overflow-auto rounded-md bg-primary p-2 font-mono">
                  {uninstallOpts.core && uninstallTargets.core.map((p, i) => <div key={`c${i}`}>{p}</div>)}
                  {uninstallOpts.plugins && uninstallTargets.plugins.map((p, i) => <div key={`p${i}`}>{p}</div>)}
                  {uninstallOpts.mcp && uninstallTargets.mcp.map((p, i) => <div key={`m${i}`}>{p}</div>)}
                  {uninstallOpts.skills && uninstallTargets.skills.map((p, i) => <div key={`s${i}`}>{p}</div>)}
                  {[
                    ...(uninstallOpts.core ? uninstallTargets.core : []),
                    ...(uninstallOpts.plugins ? uninstallTargets.plugins : []),
                    ...(uninstallOpts.mcp ? uninstallTargets.mcp : []),
                    ...(uninstallOpts.skills ? uninstallTargets.skills : [])
                  ].length === 0 && <div>No files found for selected categories.</div>}
                </div>
              </details>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
