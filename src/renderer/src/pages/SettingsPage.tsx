import { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores'
import { Card, TextInput, SelectInput, ToggleSwitch, Button } from '../components/ui'
import { Moon, Sun, FolderOpen, ExternalLink } from 'lucide-react'
import type { ShellInfo } from '@shared/types'

export default function SettingsPage(): JSX.Element {
  const {
    theme, language, defaultConfigPath, preferredShell, bunPath, autoBackup,
    setTheme, setLanguage, setDefaultPath, setPreferredShell, setBunPath, setAutoBackup
  } = useSettingsStore()
  const [shells, setShells] = useState<ShellInfo[]>([])

  useEffect(() => {
    window.api.shell.detect().then(setShells).catch(() => {})
  }, [])

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
    </div>
  )
}
