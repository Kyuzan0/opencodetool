import { useState, useEffect } from 'react'
import { useConfigStore, usePluginStore } from '../stores'
import { Card, TextInput, Button, Modal, ToggleSwitch } from '../components/ui'
import { Plus, Trash2, Download, Package, AlertCircle } from 'lucide-react'
import type { PluginInfo } from '@shared/types'

const KNOWN_PLUGINS = [
  { name: 'oh-my-china', description: 'Chinese language support and optimizations' },
  { name: '@tarquinen/opencode-dcp', description: 'Dynamic context protocol plugin' },
  { name: 'opencode-antigravity-auth', description: 'Authentication provider plugin' }
]

export default function PluginsPage(): JSX.Element {
  const { openCodeConfig, configPath, setOpenCodeConfig, setDirty, setError } = useConfigStore()
  const { plugins, setPlugins, isInstalling, setInstalling, installProgress, setInstallProgress, addPlugin, removePlugin: removeFromStore } = usePluginStore()
  const [installName, setInstallName] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])

  useEffect(() => {
    if (openCodeConfig?.plugin) {
      const current = openCodeConfig.plugin.map((name) => {
        const existing = plugins.find((p) => p.name === name)
        return existing || { name, version: '', enabled: true, installed: true }
      })
      setPlugins(current)
    }
  }, [openCodeConfig?.plugin])

  function updatePluginList(newList: string[]): void {
    if (!openCodeConfig) return
    setOpenCodeConfig({ ...openCodeConfig, plugin: newList })
    setDirty(true)
  }

  async function handleInstall(name: string): Promise<void> {
    if (!name.trim()) return
    setInstalling(true)
    setInstallProgress(`Installing ${name}...`)
    setLogLines((prev) => [...prev, `> Installing ${name}...`])
    try {
      const configDir = configPath?.path ? configPath.path.replace(/[/\\][^/\\]+$/, '') : ''
      const result = await window.api.pm.install(name.trim(), configDir)
      if (result.exitCode === 0) {
        setLogLines((prev) => [...prev, result.stdout || 'Installed successfully', ''])
        const newPlugin: PluginInfo = { name: name.trim(), version: '', enabled: true, installed: true }
        addPlugin(newPlugin)
        const currentPlugins = openCodeConfig?.plugin || []
        if (!currentPlugins.includes(name.trim())) {
          updatePluginList([...currentPlugins, name.trim()])
        }
        setInstallName('')
      } else {
        setLogLines((prev) => [...prev, `Error: ${result.stderr || 'Install failed'}`, ''])
      }
    } catch (e: any) {
      setLogLines((prev) => [...prev, `Error: ${e.message || 'Install failed'}`, ''])
    } finally {
      setInstalling(false)
      setInstallProgress('')
    }
  }

  async function handleUninstall(name: string): Promise<void> {
    setConfirmRemove(null)
    setInstalling(true)
    setLogLines((prev) => [...prev, `> Uninstalling ${name}...`])
    try {
      const configDir = configPath?.path ? configPath.path.replace(/[/\\][^/\\]+$/, '') : ''
      await window.api.pm.uninstall(name, configDir)
      removeFromStore(name)
      const currentPlugins = openCodeConfig?.plugin || []
      updatePluginList(currentPlugins.filter((p) => p !== name))
      setLogLines((prev) => [...prev, `Uninstalled ${name}`, ''])
    } catch (e: any) {
      setLogLines((prev) => [...prev, `Error: ${e.message || 'Uninstall failed'}`, ''])
    } finally { setInstalling(false) }
  }

  function togglePlugin(name: string, enabled: boolean): void {
    const currentPlugins = openCodeConfig?.plugin || []
    if (enabled && !currentPlugins.includes(name)) {
      updatePluginList([...currentPlugins, name])
    } else if (!enabled) {
      updatePluginList(currentPlugins.filter((p) => p !== name))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Plugin Manager</h1>

      <Card title="Installed Plugins">
        {plugins.length === 0 ? (
          <p className="text-sm text-gray-500">No plugins installed. Add one below.</p>
        ) : (
          <div className="space-y-2">
            {plugins.map((p) => (
              <div key={p.name} className="flex items-center justify-between rounded-md border border-border-default px-4 py-3">
                <div className="flex items-center gap-3">
                  <Package size={18} className="text-accent" />
                  <div>
                    <span className="text-sm font-medium text-gray-200">{p.name}</span>
                    {p.version && <span className="ml-2 text-xs text-gray-500">v{p.version}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ToggleSwitch
                    checked={(openCodeConfig?.plugin || []).includes(p.name)}
                    onChange={(checked) => togglePlugin(p.name, checked)}
                  />
                  <Button variant="danger" className="text-xs" onClick={() => setConfirmRemove(p.name)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Install New Plugin">
        <div className="space-y-3">
          <div className="flex gap-2">
            <TextInput
              value={installName}
              onChange={setInstallName}
              placeholder="npm package name (e.g. oh-my-china)"
              className="flex-1"
              disabled={isInstalling}
            />
            <Button onClick={() => handleInstall(installName)} loading={isInstalling} disabled={!installName.trim()}>
              <Download size={16} /> Install
            </Button>
          </div>
          {installProgress && <p className="text-xs text-accent">{installProgress}</p>}
        </div>
      </Card>

      <Card title="Known Plugins">
        <div className="space-y-2">
          {KNOWN_PLUGINS.map((kp) => {
            const installed = plugins.some((p) => p.name === kp.name)
            return (
              <div key={kp.name} className="flex items-center justify-between rounded-md border border-border-default px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-200">{kp.name}</span>
                  <p className="text-xs text-gray-500">{kp.description}</p>
                </div>
                {installed ? (
                  <span className="text-xs text-success">Installed</span>
                ) : (
                  <Button variant="secondary" className="text-xs" onClick={() => handleInstall(kp.name)} disabled={isInstalling}>
                    <Plus size={14} /> Install
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {logLines.length > 0 && (
        <Card title="Install Log">
          <div className="max-h-48 overflow-auto rounded-md bg-primary p-3 font-mono text-xs text-gray-400">
            {logLines.map((line, i) => (
              <div key={i} className={line.startsWith('Error') ? 'text-danger' : ''}>{line || '\u00A0'}</div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="Confirm Uninstall"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => confirmRemove && handleUninstall(confirmRemove)}>Uninstall</Button>
          </>
        }
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-warning" />
          <p>Are you sure you want to uninstall <strong>{confirmRemove}</strong>?</p>
        </div>
      </Modal>
    </div>
  )
}
