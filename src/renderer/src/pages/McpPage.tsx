import { useState, useEffect, useMemo } from 'react'
import { useConfigStore, useMcpStore, useUiStore } from '../stores'
import { Card, TextInput, Button, Modal, ToggleSwitch } from '../components/ui'
import { Plus, Trash2, Download, Server, CheckCircle, AlertCircle, Search, Zap, Puzzle, Activity } from 'lucide-react'
import type { TrendingMcp } from '@shared/types'

export default function McpPage(): JSX.Element {
  const { configPath: openCodeConfigPath, agentConfigPath, setConfigPath, setAgentConfigPath } = useConfigStore()
  const { trending, installed, pluginMcps, isLoading, isInstalling, searchQuery, selectedCategory, setTrending, setInstalled, setPluginMcps, setLoading, setInstalling, setSearchQuery, setSelectedCategory, addInstalled, removeInstalled } = useMcpStore()
  const { addToast } = useUiStore()

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCommand, setCustomCommand] = useState('npx')
  const [customArgs, setCustomArgs] = useState('')
  const [customEnv, setCustomEnv] = useState('')
  const [healthResults, setHealthResults] = useState<Record<string, { status: string; responseTimeMs: number | null; error: string | null }>>({})
  const [healthChecking, setHealthChecking] = useState(false)

  const configPath = openCodeConfigPath?.path || ''
  const pluginConfigPath = agentConfigPath?.path || ''

  // Auto-detect config paths if not already set
  useEffect(() => {
    window.api.config.locations().then((locs) => {
      if (!configPath) {
        const loc = locs.find((l) => l.path.includes('opencode.json') || l.path.includes('opencode.jsonc'))
        if (loc) setConfigPath(loc)
      }
      if (!pluginConfigPath) {
        const agentLoc = locs.find((l) => l.path.includes('oh-my-open'))
        if (agentLoc) setAgentConfigPath(agentLoc)
      }
    })
  }, [])

  // Load trending and installed MCPs on mount
  useEffect(() => {
    loadData()
  }, [configPath, pluginConfigPath])

  async function loadData(): Promise<void> {
    setLoading(true)
    try {
      const [trendingResult, installedResult, pluginResult] = await Promise.all([
        window.api.mcp.trending(),
        configPath ? window.api.mcp.installed(configPath) : Promise.resolve([]),
        pluginConfigPath ? window.api.mcp.pluginInstalled(pluginConfigPath) : Promise.resolve([])
      ])
      setTrending(trendingResult)
      setInstalled(installedResult)
      setPluginMcps(pluginResult)
    } catch (e: unknown) {
      addToast({ type: 'error', message: `Failed to load MCP data: ${e instanceof Error ? e.message : 'unknown'}` })
    } finally {
      setLoading(false)
    }
  }

  // Derive categories from trending list
  const categories = useMemo(() => {
    const cats = new Set(trending.map((m) => m.category))
    return ['All', ...Array.from(cats).sort()]
  }, [trending])

  // Filter trending MCPs
  const filteredTrending = useMemo(() => {
    return trending.filter((m) => {
      const matchesSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [trending, searchQuery, selectedCategory])

  function isInstalled(name: string): boolean {
    return installed.some((m) => m.name.toLowerCase() === name.toLowerCase()) ||
      pluginMcps.some((m) => m.name.toLowerCase() === name.toLowerCase())
  }

  async function handleInstallTrending(mcp: TrendingMcp): Promise<void> {
    if (!configPath) {
      addToast({ type: 'error', message: 'No config file found. Please set up your config first.' })
      return
    }
    setInstalling(true)
    try {
      const result = await window.api.mcp.install(configPath, mcp.name.toLowerCase(), mcp.command, mcp.args, mcp.env)
      if (result.success) {
        addInstalled({ name: mcp.name.toLowerCase(), type: 'local', command: [mcp.command, ...mcp.args], disabled: false })
        addToast({ type: 'success', message: `Installed MCP "${mcp.name}" successfully.` })
      } else {
        addToast({ type: 'error', message: result.message || `Failed to install "${mcp.name}".` })
      }
    } catch (e: unknown) {
      addToast({ type: 'error', message: `Install error: ${e instanceof Error ? e.message : 'unknown'}` })
    } finally {
      setInstalling(false)
    }
  }

  async function handleInstallCustom(): Promise<void> {
    if (!configPath || !customName.trim()) return
    setShowCustomModal(false)
    setInstalling(true)
    try {
      const args = customArgs.split(/\s+/).filter(Boolean)
      let env: Record<string, string> | undefined
      if (customEnv.trim()) {
        env = {}
        customEnv.split('\n').forEach((line) => {
          const [key, ...rest] = line.split('=')
          if (key?.trim()) env![key.trim()] = rest.join('=').trim()
        })
      }
      const result = await window.api.mcp.install(configPath, customName.trim(), customCommand.trim(), args, env)
      if (result.success) {
        addInstalled({ name: customName.trim(), type: 'local', command: [customCommand.trim(), ...args], disabled: false })
        addToast({ type: 'success', message: `Installed MCP "${customName}" successfully.` })
        setCustomName('')
        setCustomCommand('npx')
        setCustomArgs('')
        setCustomEnv('')
      } else {
        addToast({ type: 'error', message: result.message || `Failed to install "${customName}".` })
      }
    } catch (e: unknown) {
      addToast({ type: 'error', message: `Install error: ${e instanceof Error ? e.message : 'unknown'}` })
    } finally {
      setInstalling(false)
    }
  }

  async function handleUninstall(name: string): Promise<void> {
    setConfirmRemove(null)
    if (!configPath) return
    setInstalling(true)
    try {
      const result = await window.api.mcp.uninstall(configPath, name)
      if (result.success) {
        removeInstalled(name)
        addToast({ type: 'success', message: `Removed MCP "${name}".` })
      } else {
        addToast({ type: 'error', message: result.message || `Failed to remove "${name}".` })
      }
    } catch (e: unknown) {
      addToast({ type: 'error', message: `Uninstall error: ${e instanceof Error ? e.message : 'unknown'}` })
    } finally {
      setInstalling(false)
    }
  }

  async function handleToggle(name: string, disabled: boolean): Promise<void> {
    if (!configPath) return
    try {
      const result = await window.api.mcp.toggle(configPath, name, disabled)
      if (result.success) {
        const updatedInstalled = installed.map((m) => m.name === name ? { ...m, disabled } : m)
        setInstalled(updatedInstalled)
      } else {
        addToast({ type: 'error', message: result.message || `Failed to toggle "${name}".` })
      }
    } catch (e: unknown) {
      addToast({ type: 'error', message: `Toggle error: ${e instanceof Error ? e.message : 'unknown'}` })
    }
  }

  async function handlePluginToggle(name: string, disabled: boolean): Promise<void> {
    if (!pluginConfigPath) return
    try {
      const result = await window.api.mcp.pluginToggle(pluginConfigPath, name, disabled)
      if (result.success) {
        const updated = pluginMcps.map((m) => m.name === name ? { ...m, disabled } : m)
        setPluginMcps(updated)
      } else {
        addToast({ type: 'error', message: result.message || `Failed to toggle plugin MCP "${name}".` })
      }
    } catch (e: unknown) {
      addToast({ type: 'error', message: `Toggle error: ${e instanceof Error ? e.message : 'unknown'}` })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-themed">MCP Servers</h1>
        <p className="text-[13px] text-themed-muted mt-1">Install and manage Model Context Protocol servers for your AI agents</p>
      </div>

      {/* Installed MCPs */}
      <Card title="Installed MCP Servers">
        {installed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-themed-muted">
            <Server size={40} className="mb-3 opacity-50" />
            <p className="text-sm">No MCP servers installed. Browse trending servers below.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {installed.map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-4 py-3 hover:border-[var(--color-border-bright)] transition-colors">
                <div className="flex items-center gap-3">
                  {healthResults[m.name] ? (
                    <span className={`w-2 h-2 rounded-full ${
                      healthResults[m.name].status === 'healthy' ? 'bg-success shadow-[0_0_4px_rgba(34,197,94,0.5)]' :
                      healthResults[m.name].status === 'unhealthy' ? 'bg-danger shadow-[0_0_4px_rgba(244,63,94,0.5)]' :
                      'bg-[var(--color-text-muted)]'
                    }`} title={healthResults[m.name].error || healthResults[m.name].status} />
                  ) : null}
                  <Server size={18} className="text-accent" />
                  <div>
                    <span className="text-[13px] font-medium text-themed">{m.name}</span>
                    {m.type === 'remote' && m.url && <span className="ml-2 text-xs text-themed-muted font-mono">{m.url}</span>}
                    {m.type === 'local' && m.command && <span className="ml-2 text-xs text-themed-muted font-mono">{m.command.join(' ')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ToggleSwitch
                    checked={!m.disabled}
                    onChange={(checked) => handleToggle(m.name, !checked)}
                  />
                  <Button variant="danger" className="text-xs" onClick={() => setConfirmRemove(m.name)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => setShowCustomModal(true)} disabled={isInstalling || !configPath}>
            <Plus size={16} /> Add Custom MCP
          </Button>
          <Button variant="secondary" onClick={async () => {
            if (!configPath) return
            setHealthChecking(true)
            try {
              const results = await (window as any).api.mcp.healthCheck(configPath)
              const map: Record<string, { status: string; responseTimeMs: number | null; error: string | null }> = {}
              for (const r of results) {
                map[r.name] = { status: r.status, responseTimeMs: r.responseTimeMs, error: r.error }
              }
              setHealthResults(map)
            } catch { /* ignore */ }
            finally { setHealthChecking(false) }
          }} loading={healthChecking} disabled={installed.length === 0 || !configPath}>
            <Activity size={16} /> Health Check
          </Button>
        </div>
      </Card>

      {/* Plugin MCPs */}
      {pluginMcps.length > 0 && (
        <Card title={<span className="flex items-center gap-2"><Puzzle size={16} className="text-accent" /> Plugin MCP Servers</span>}>
          <p className="text-xs text-themed-muted mb-3">These MCPs are provided by the oh-my-openagent plugin and managed automatically.</p>
          <div className="space-y-2">
            {pluginMcps.map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-4 py-3 hover:border-[var(--color-border-bright)] transition-colors">
                <div className="flex items-center gap-3">
                  <Server size={18} className="text-accent" />
                  <div>
                    <span className="text-[13px] font-medium text-themed">{m.name}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">plugin</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ToggleSwitch
                    checked={!m.disabled}
                    onChange={(checked) => handlePluginToggle(m.name, !checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trending MCPs */}
      <Card title={<span className="flex items-center gap-2"><Zap size={16} className="text-warning" /> Trending MCP Servers</span>}>
        <div className="space-y-3">
          {/* Search and filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-themed-muted" />
              <TextInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search MCP servers..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-accent/20 text-accent'
                    : 'bg-white/5 text-themed-muted hover:bg-white/10 hover:text-themed-secondary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* MCP grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-themed-muted">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent mr-3" />
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredTrending.map((mcp) => {
                const alreadyInstalled = isInstalled(mcp.name)
                return (
                  <div key={mcp.name} className="flex items-start justify-between rounded-lg border border-[var(--color-border-subtle)] px-4 py-3 hover:border-[var(--color-border-bright)] transition-colors">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-themed">{mcp.name}</span>
                        {mcp.verified && <CheckCircle size={12} className="text-success flex-shrink-0" />}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-themed-muted">{mcp.category}</span>
                      </div>
                      <p className="text-xs text-themed-muted mt-1 line-clamp-2">{mcp.description}</p>
                    </div>
                    {alreadyInstalled ? (
                      <span className="text-xs text-success flex items-center gap-1 flex-shrink-0 mt-1">
                        <CheckCircle size={14} /> Installed
                      </span>
                    ) : (
                      <Button variant="secondary" className="text-xs flex-shrink-0 mt-1" onClick={() => handleInstallTrending(mcp)} disabled={isInstalling || !configPath}>
                        <Download size={14} /> Install
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!isLoading && filteredTrending.length === 0 && (
            <div className="text-center py-6 text-themed-muted text-sm">
              No MCP servers match your search.
            </div>
          )}
        </div>
      </Card>

      {/* Confirm Remove Modal */}
      <Modal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="Confirm Remove"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => confirmRemove && handleUninstall(confirmRemove)}>Remove</Button>
          </>
        }
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-warning" />
          <p>Are you sure you want to remove <strong>{confirmRemove}</strong> from your MCP configuration?</p>
        </div>
      </Modal>

      {/* Custom MCP Modal */}
      <Modal
        open={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        title="Add Custom MCP Server"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowCustomModal(false)}>Cancel</Button>
            <Button onClick={handleInstallCustom} disabled={!customName.trim()}>
              <Plus size={16} /> Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextInput
            label="Name"
            value={customName}
            onChange={setCustomName}
            placeholder="e.g. my-mcp-server"
          />
          <TextInput
            label="Command"
            value={customCommand}
            onChange={setCustomCommand}
            placeholder="e.g. npx, uvx, node"
          />
          <TextInput
            label="Arguments (space-separated)"
            value={customArgs}
            onChange={setCustomArgs}
            placeholder="e.g. -y @my/mcp-server --port 3000"
          />
          <TextInput
            label="Environment Variables (KEY=VALUE, one per line)"
            value={customEnv}
            onChange={setCustomEnv}
            placeholder="e.g. API_KEY=your-key"
          />
        </div>
      </Modal>
    </div>
  )
}
