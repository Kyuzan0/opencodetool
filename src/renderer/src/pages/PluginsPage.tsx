import { useState, useEffect } from 'react'
import { useConfigStore, usePluginStore } from '../stores'
import { Card, TextInput, Button, Modal, ToggleSwitch, SelectInput } from '../components/ui'
import { Plus, Trash2, Download, Package, AlertCircle } from 'lucide-react'
import type { PluginInfo } from '@shared/types'

const KNOWN_PLUGINS = [
  { name: 'oh-my-china', description: 'Chinese language support and optimizations' },
  { name: '@tarquinen/opencode-dcp', description: 'Dynamic context protocol plugin' },
  { name: 'opencode-antigravity-auth', description: 'Authentication provider plugin' },
  { name: 'oh-my-openagent', description: 'Agent orchestration with model provider configuration', command: 'bunx oh-my-openagent install' }
]

const PROVIDER_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' }
]

const CLAUDE_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'max20', label: 'Max 20' }
]

interface ProviderConfig {
  claude: string
  openai: string
  gemini: string
  copilot: string
  opencodeZen: string
  zaiCodingPlan: string
  kimiForCoding: string
  opencodeGo: string
  vercelAiGateway: string
  skipAuth: boolean
}

const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  claude: 'no',
  openai: 'no',
  gemini: 'no',
  copilot: 'no',
  opencodeZen: 'no',
  zaiCodingPlan: 'no',
  kimiForCoding: 'no',
  opencodeGo: 'no',
  vercelAiGateway: 'no',
  skipAuth: false
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\u001b\[[0-9;]*m/g, '')
}

function formatLogOutput(raw: string): string[] {
  const clean = stripAnsi(raw)
  return clean.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0)
}

function isOhMyOpenagentCommand(input: string): boolean {
  const lower = input.trim().toLowerCase()
  return lower.includes('oh-my-openagent') || lower.includes('oh-my-opencode')
}

function buildOhMyOpenagentCommand(config: ProviderConfig): string {
  const flags = [
    'install',
    '--no-tui',
    `--claude=${config.claude}`,
    `--openai=${config.openai}`,
    `--gemini=${config.gemini}`,
    `--copilot=${config.copilot}`,
    `--opencode-zen=${config.opencodeZen}`,
    `--zai-coding-plan=${config.zaiCodingPlan}`,
    `--kimi-for-coding=${config.kimiForCoding}`,
    `--opencode-go=${config.opencodeGo}`,
    `--vercel-ai-gateway=${config.vercelAiGateway}`
  ]
  if (config.skipAuth) flags.push('--skip-auth')
  return `bunx oh-my-openagent ${flags.join(' ')}`
}

export default function PluginsPage(): JSX.Element {
  const { openCodeConfig, configPath, setOpenCodeConfig, setDirty, setError } = useConfigStore()
  const { plugins, setPlugins, isInstalling, setInstalling, installProgress, setInstallProgress, addPlugin, removePlugin: removeFromStore } = usePluginStore()
  const [installName, setInstallName] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>({ ...DEFAULT_PROVIDER_CONFIG })
  const [pendingInstallName, setPendingInstallName] = useState('')

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

  function extractPluginName(input: string): string {
    const trimmed = input.trim()
    const parts = trimmed.split(/\s+/)
    const runner = parts[0]?.toLowerCase()
    if ((runner === 'bunx' || runner === 'npx') && parts.length >= 2) {
      return parts[1]
    }
    return trimmed
  }

  function initiateInstall(name: string): void {
    if (!name.trim()) return
    if (isOhMyOpenagentCommand(name)) {
      setPendingInstallName(name)
      setProviderConfig({ ...DEFAULT_PROVIDER_CONFIG })
      setShowProviderModal(true)
      return
    }
    handleInstall(name)
  }

  async function handleProviderInstall(): Promise<void> {
    setShowProviderModal(false)
    const command = buildOhMyOpenagentCommand(providerConfig)
    await handleInstall(command)
  }

  async function handleInstall(name: string): Promise<void> {
    if (!name.trim()) return
    setInstalling(true)
    setInstallProgress(`Installing ${name}...`)
    setLogLines((prev) => [...prev, `> ${name}...`])
    try {
      const configDir = configPath?.path ? configPath.path.replace(/[/\\][^/\\]+$/, '') : ''
      const result = await window.api.pm.install(name.trim(), configDir)
      if (result.exitCode === 0) {
        const lines = formatLogOutput(result.stdout || 'Installed successfully')
        setLogLines((prev) => [...prev, ...lines, ''])
        const pluginName = extractPluginName(name)
        const newPlugin: PluginInfo = { name: pluginName, version: '', enabled: true, installed: true }
        addPlugin(newPlugin)
        const currentPlugins = openCodeConfig?.plugin || []
        if (!currentPlugins.includes(pluginName)) {
          updatePluginList([...currentPlugins, pluginName])
        }
        setInstallName('')
      } else {
        const errLines = formatLogOutput(result.stderr || 'Install failed')
        setLogLines((prev) => [...prev, ...errLines.map((l) => `Error: ${l}`), ''])
      }
    } catch (e: any) {
      const errLines = formatLogOutput(e.message || 'Install failed')
      setLogLines((prev) => [...prev, ...errLines.map((l) => `Error: ${l}`), ''])
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
      <h1 className="text-2xl font-bold text-themed">Plugin Manager</h1>

      <Card title="Installed Plugins">
        {plugins.length === 0 ? (
          <p className="text-sm text-themed-muted">No plugins installed. Add one below.</p>
        ) : (
          <div className="space-y-2">
            {plugins.map((p) => (
              <div key={p.name} className="flex items-center justify-between rounded-md border border-border-default px-4 py-3">
                <div className="flex items-center gap-3">
                  <Package size={18} className="text-accent" />
                  <div>
                    <span className="text-sm font-medium text-themed">{p.name}</span>
                    {p.version && <span className="ml-2 text-xs text-themed-muted">v{p.version}</span>}
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
              placeholder="package name or command (e.g. oh-my-china, bunx oh-my-openagent install)"
              className="flex-1"
              disabled={isInstalling}
            />
            <Button onClick={() => initiateInstall(installName)} loading={isInstalling} disabled={!installName.trim()}>
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
                  <span className="text-sm font-medium text-themed">{kp.name}</span>
                  <p className="text-xs text-themed-muted">{kp.description}</p>
                </div>
                {installed ? (
                  <span className="text-xs text-success">Installed</span>
                ) : (
                  <Button variant="secondary" className="text-xs" onClick={() => initiateInstall(kp.command || kp.name)} disabled={isInstalling}>
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
          <div className="max-h-96 overflow-auto rounded-md bg-primary p-3 font-mono text-xs text-themed-secondary whitespace-pre-wrap">
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

      <Modal
        open={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        title="Configure oh-my-openagent"
        className="max-w-2xl"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowProviderModal(false)}>Cancel</Button>
            <Button onClick={handleProviderInstall}>
              <Download size={16} /> Install
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-themed-muted">Select which model providers you have access to. Priority: Native &gt; Copilot &gt; OpenCode Zen &gt; Z.ai &gt; Kimi &gt; Vercel</p>
          <div className="grid grid-cols-2 gap-3">
            <SelectInput
              label="Claude"
              description="Native anthropic/ models (Opus, Sonnet, Haiku)"
              options={CLAUDE_OPTIONS}
              value={providerConfig.claude}
              onChange={(v) => setProviderConfig((c) => ({ ...c, claude: v }))}
            />
            <SelectInput
              label="OpenAI"
              description="Native openai/ models (GPT-5.4 for Oracle)"
              options={PROVIDER_OPTIONS}
              value={providerConfig.openai}
              onChange={(v) => setProviderConfig((c) => ({ ...c, openai: v }))}
            />
            <SelectInput
              label="Gemini"
              description="Native google/ models (Gemini 3.1 Pro, Flash)"
              options={PROVIDER_OPTIONS}
              value={providerConfig.gemini}
              onChange={(v) => setProviderConfig((c) => ({ ...c, gemini: v }))}
            />
            <SelectInput
              label="GitHub Copilot"
              description="github-copilot/ models (fallback)"
              options={PROVIDER_OPTIONS}
              value={providerConfig.copilot}
              onChange={(v) => setProviderConfig((c) => ({ ...c, copilot: v }))}
            />
            <SelectInput
              label="OpenCode Zen"
              description="opencode/ models (claude-opus-4-6, etc.)"
              options={PROVIDER_OPTIONS}
              value={providerConfig.opencodeZen}
              onChange={(v) => setProviderConfig((c) => ({ ...c, opencodeZen: v }))}
            />
            <SelectInput
              label="Z.ai Coding Plan"
              description="zai-coding-plan/glm-5 (visual fallback)"
              options={PROVIDER_OPTIONS}
              value={providerConfig.zaiCodingPlan}
              onChange={(v) => setProviderConfig((c) => ({ ...c, zaiCodingPlan: v }))}
            />
            <SelectInput
              label="Kimi For Coding"
              description="kimi-for-coding/k2p5 (Sisyphus fallback)"
              options={PROVIDER_OPTIONS}
              value={providerConfig.kimiForCoding}
              onChange={(v) => setProviderConfig((c) => ({ ...c, kimiForCoding: v }))}
            />
            <SelectInput
              label="OpenCode Go"
              description="OpenCode Go subscription"
              options={PROVIDER_OPTIONS}
              value={providerConfig.opencodeGo}
              onChange={(v) => setProviderConfig((c) => ({ ...c, opencodeGo: v }))}
            />
            <SelectInput
              label="Vercel AI Gateway"
              description="vercel/ models (universal proxy, last fallback)"
              options={PROVIDER_OPTIONS}
              value={providerConfig.vercelAiGateway}
              onChange={(v) => setProviderConfig((c) => ({ ...c, vercelAiGateway: v }))}
            />
          </div>
          <ToggleSwitch
            label="Skip Authentication Setup"
            description="Skip authentication setup hints"
            checked={providerConfig.skipAuth}
            onChange={(v) => setProviderConfig((c) => ({ ...c, skipAuth: v }))}
          />
        </div>
      </Modal>
    </div>
  )
}
