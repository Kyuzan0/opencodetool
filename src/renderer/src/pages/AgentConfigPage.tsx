import { useState, useEffect, useRef } from 'react'
import { useConfigStore } from '../stores'
import {
  Tabs, Card, TextInput, SelectInput, ToggleSwitch,
  KeyValueEditor, ArrayEditor, JsonEditor, Button, Modal, TextArea
} from '../components/ui'
import { Save, RefreshCw, Upload, Download, Plus, Trash2, ExternalLink, FilePlus } from 'lucide-react'
import type { AgentPluginConfig, AgentOverride, CategoryConfig, McpConfig } from '@shared/types'
import { BUILTIN_AGENTS, CATEGORIES } from '@shared/types'

const TABS = [
  { id: 'agents', label: 'Agents' },
  { id: 'categories', label: 'Categories' },
  { id: 'background', label: 'Background Tasks' },
  { id: 'hooks', label: 'Hooks' },
  { id: 'mcps', label: 'MCPs' },
  { id: 'experimental', label: 'Experimental' },
  { id: 'preview', label: 'JSON Preview' }
]

const VARIANTS = [
  { value: 'default', label: 'Default' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'max', label: 'Max' }
]

export default function AgentConfigPage(): JSX.Element {
  const {
    agentConfig, agentConfigPath, isAgentDirty, isLoading,
    setAgentConfig, setAgentConfigPath, setAgentDirty, setLoading, setError
  } = useConfigStore()

  const [activeTab, setActiveTab] = useState('agents')
  const [saveLoading, setSaveLoading] = useState(false)
  const [addMcpOpen, setAddMcpOpen] = useState(false)
  const [newMcpName, setNewMcpName] = useState('')
  const [externalChangeDetected, setExternalChangeDetected] = useState(false)
  const watchedPathRef = useRef<string | null>(null)

  // File watcher: detect external changes
  useEffect(() => {
    const fileWatcherApi = (window.api as any).fileWatcher
    if (!fileWatcherApi) return

    const handleChange = (changedPath: string): void => {
      if (agentConfigPath && changedPath === agentConfigPath.path) {
        setExternalChangeDetected(true)
      }
    }

    fileWatcherApi.onChanged(handleChange)
    return () => {
      fileWatcherApi.removeListeners()
    }
  }, [agentConfigPath])

  // Start/stop watching when agentConfigPath changes
  useEffect(() => {
    const fileWatcherApi = (window.api as any).fileWatcher
    if (!fileWatcherApi) return

    if (watchedPathRef.current && watchedPathRef.current !== agentConfigPath?.path) {
      fileWatcherApi.unwatch(watchedPathRef.current)
      watchedPathRef.current = null
    }

    if (agentConfigPath?.path && agentConfigPath.exists) {
      fileWatcherApi.watch(agentConfigPath.path)
      watchedPathRef.current = agentConfigPath.path
    }

    return () => {
      if (watchedPathRef.current) {
        fileWatcherApi.unwatch(watchedPathRef.current)
        watchedPathRef.current = null
      }
    }
  }, [agentConfigPath?.path])

  useEffect(() => { if (!agentConfig) loadConfig() }, [])

  async function loadConfig(): Promise<void> {
    setLoading(true)
    try {
      const locs = await window.api.config.locations()
      const loc = locs.find((l: any) => l.path.includes('oh-my-open'))
      if (loc) {
        setAgentConfigPath(loc)
        const r = await window.api.config.read(loc.path)
        setAgentConfig(r.data as AgentPluginConfig)
      } else {
        setAgentConfig({ agents: {}, categories: {} })
      }
    } catch (e: any) { setError(e.message || 'Failed to load agent config') }
    finally { setLoading(false) }
  }

  async function handleSave(): Promise<void> {
    if (!agentConfig || !agentConfigPath) return
    setSaveLoading(true)
    try {
      await window.api.config.write(agentConfigPath.path, agentConfig as any, { format: agentConfigPath.format || 'json' })
      setAgentDirty(false)
    } catch (e: any) { setError(e.message || 'Failed to save') }
    finally { setSaveLoading(false) }
  }

  async function handleReload(): Promise<void> {
    if (!agentConfigPath) return
    setLoading(true)
    try {
      const r = await window.api.config.read(agentConfigPath.path)
      setAgentConfig(r.data as AgentPluginConfig)
      setExternalChangeDetected(false)
      setAgentDirty(false)
    } catch (e: any) { setError(e.message || 'Failed to reload') }
    finally { setLoading(false) }
  }

  async function handleOpenExternal(): Promise<void> {
    if (!agentConfigPath?.path) return
    try {
      const configApi = window.api.config as any
      const error = await configApi.openExternal(agentConfigPath.path)
      if (error) setError(`Gagal membuka editor: ${error}`)
    } catch (e: any) {
      setError(e.message || 'Gagal membuka file di editor eksternal')
    }
  }

  async function handleImport(): Promise<void> {
    try {
      const fp = await window.api.dialog.openFile({ filters: [{ name: 'JSON', extensions: ['json', 'jsonc'] }] })
      if (fp) {
        const r = await window.api.config.read(fp)
        setAgentConfig(r.data as AgentPluginConfig)
        setAgentDirty(true)
      }
    } catch (e: any) { setError(e.message || 'Import failed') }
  }

  async function handleExport(): Promise<void> {
    if (!agentConfig) return
    try {
      const fp = await window.api.dialog.saveFile({ defaultPath: 'oh-my-openagent.json', filters: [{ name: 'JSON', extensions: ['json'] }] })
      if (fp) await window.api.config.write(fp, agentConfig as any, { format: 'json' })
    } catch (e: any) { setError(e.message || 'Export failed') }
  }

  function uc(path: string, value: unknown): void {
    useConfigStore.getState().updateAgentField(path, value)
  }

  function updateAgent(name: string, override: AgentOverride): void {
    const agents = { ...(agentConfig?.agents || {}), [name]: override }
    uc('agents', agents)
  }

  function removeAgentOverride(name: string): void {
    if (!agentConfig?.agents) return
    const { [name]: _, ...rest } = agentConfig.agents
    uc('agents', rest)
  }

  function updateCategory(name: string, cfg: CategoryConfig): void {
    const cats = { ...(agentConfig?.categories || {}), [name]: cfg }
    uc('categories', cats)
  }

  function addMcp(): void {
    if (!newMcpName.trim()) return
    const mcps = { ...(agentConfig?.mcps || {}), [newMcpName.trim()]: { command: '', args: [], env: {} } }
    uc('mcps', mcps)
    setNewMcpName('')
    setAddMcpOpen(false)
  }

  function removeMcp(name: string): void {
    if (!agentConfig?.mcps) return
    const { [name]: _, ...rest } = agentConfig.mcps
    uc('mcps', rest)
  }

  function updateMcp(name: string, cfg: McpConfig): void {
    const mcps = { ...(agentConfig?.mcps || {}), [name]: cfg }
    uc('mcps', mcps)
  }

  async function handleCreateAgentConfig(): Promise<void> {
    setLoading(true)
    try {
      const configApi = window.api.config as any
      const createdPath: string = await configApi.createDefault('agent')
      await loadConfig()
    } catch (e: any) {
      setError(e.message || 'Gagal membuat agent config')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center py-20 text-themed-muted">Loading config...</div>

  if (!agentConfig && !agentConfigPath) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-themed-muted">File agent config tidak ditemukan</p>
      <p className="text-xs text-themed-muted max-w-md text-center">
        Buat file <code className="rounded bg-primary px-1 py-0.5">oh-my-openagent.json</code> default
        di <code className="rounded bg-primary px-1 py-0.5">~/.config/opencode/</code> dengan template agents dan categories siap pakai.
      </p>
      <div className="flex gap-2">
        <Button onClick={handleCreateAgentConfig}><FilePlus size={16} /> Buat Agent Config Default</Button>
        <Button variant="secondary" onClick={loadConfig}>Coba Muat Ulang</Button>
      </div>
    </div>
  )

  const config = agentConfig || { agents: {}, categories: {} }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-themed">Agent Config</h1>
          {agentConfigPath && <p className="truncate font-mono text-[11px] text-themed-muted mt-1" title={agentConfigPath.path}>{agentConfigPath.path}</p>}
          {!agentConfigPath && <p className="text-[11px] text-themed-muted mt-1">No config file found — editing in memory</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Button variant="secondary" onClick={handleOpenExternal} disabled={!agentConfigPath?.path}><ExternalLink size={16} /> Open in Editor</Button>
          <Button variant="secondary" onClick={handleImport}><Upload size={16} /> Import</Button>
          <Button variant="secondary" onClick={handleExport}><Download size={16} /> Export</Button>
          <Button variant="secondary" onClick={handleReload}><RefreshCw size={16} /> Reload</Button>
          <Button onClick={handleSave} disabled={!isAgentDirty} loading={saveLoading}><Save size={16} /> Save</Button>
        </div>
      </div>

      {externalChangeDetected && (
        <div className="flex items-center justify-between rounded-md border border-warning/50 bg-warning/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-warning" />
            <span className="text-sm text-warning">File telah diubah di luar aplikasi. Reload untuk melihat perubahan terbaru.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="text-xs" onClick={() => setExternalChangeDetected(false)}>Abaikan</Button>
            <Button className="text-xs" onClick={handleReload}>Reload Sekarang</Button>
          </div>
        </div>
      )}

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'agents' && (
          <div className="space-y-3">
            <p className="text-sm text-themed-secondary mb-2">Override settings for built-in agents. Only agents with overrides are shown.</p>
            {BUILTIN_AGENTS.map((name) => {
              const override = config.agents?.[name]
              if (!override) return (
                <div key={name} className="flex items-center justify-between rounded-md border border-border-default px-4 py-2">
                  <span className="text-sm text-themed-secondary">{name}</span>
                  <Button variant="secondary" className="text-xs" onClick={() => updateAgent(name, {})}><Plus size={14} /> Add Override</Button>
                </div>
              )
              return (
                <Card key={name} title={name} description={override.model || 'default'} collapsible defaultCollapsed>
                  <div className="space-y-3 pt-2">
                    <TextInput label="Model" value={override.model || ''} onChange={(v) => updateAgent(name, { ...override, model: v })} placeholder="e.g. openai/gpt-4o" />
                    <SelectInput label="Variant" options={VARIANTS} value={override.variant || 'default'} onChange={(v) => updateAgent(name, { ...override, variant: v as any })} />
                    <TextInput label="Temperature" type="number" value={String(override.temperature ?? '')} onChange={(v) => updateAgent(name, { ...override, temperature: parseFloat(v) || undefined })} placeholder="0.0 - 2.0" />
                    <TextInput label="Top P" type="number" value={String(override.top_p ?? '')} onChange={(v) => updateAgent(name, { ...override, top_p: parseFloat(v) || undefined })} placeholder="0.0 - 1.0" />
                    <TextArea label="Prompt Append" monospace value={override.prompt_append || ''} onChange={(v) => updateAgent(name, { ...override, prompt_append: v })} placeholder="Additional prompt text..." rows={4} />
                    <div className="pt-2 border-t border-border-default">
                      <Button variant="danger" onClick={() => removeAgentOverride(name)}><Trash2 size={14} /> Remove Override</Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-3">
            <p className="text-sm text-themed-secondary mb-2">Configure model and settings for each task category.</p>
            {CATEGORIES.map((name) => {
              const cat = config.categories?.[name] || {}
              return (
                <Card key={name} title={name} description={cat.model || 'default'} collapsible defaultCollapsed>
                  <div className="space-y-3 pt-2">
                    <TextInput label="Model" value={cat.model || ''} onChange={(v) => updateCategory(name, { ...cat, model: v })} placeholder="e.g. openai/gpt-4o" />
                    <SelectInput label="Variant" options={VARIANTS} value={cat.variant || 'default'} onChange={(v) => updateCategory(name, { ...cat, variant: v as any })} />
                    <TextInput label="Temperature" type="number" value={String(cat.temperature ?? '')} onChange={(v) => updateCategory(name, { ...cat, temperature: parseFloat(v) || undefined })} placeholder="0.0 - 2.0" />
                    <TextInput label="Top P" type="number" value={String(cat.top_p ?? '')} onChange={(v) => updateCategory(name, { ...cat, top_p: parseFloat(v) || undefined })} placeholder="0.0 - 1.0" />
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {activeTab === 'background' && (
          <div className="space-y-4">
            <TextInput label="Default Concurrency" type="number" value={String(config.background_task?.defaultConcurrency ?? '')} onChange={(v) => uc('background_task', { ...(config.background_task || {}), defaultConcurrency: parseInt(v) || undefined })} placeholder="e.g. 3" />
            <KeyValueEditor
              label="Provider Concurrency"
              pairs={Object.entries(config.background_task?.providerConcurrency || {}).map(([k, v]) => ({ key: k, value: String(v) }))}
              onChange={(pairs) => {
                const pc: Record<string, number> = {}
                for (const p of pairs) if (p.key) pc[p.key] = parseInt(p.value) || 1
                uc('background_task', { ...(config.background_task || {}), providerConcurrency: pc })
              }}
              keyPlaceholder="Provider name"
              valuePlaceholder="Max concurrent"
            />
            <KeyValueEditor
              label="Model Concurrency"
              pairs={Object.entries(config.background_task?.modelConcurrency || {}).map(([k, v]) => ({ key: k, value: String(v) }))}
              onChange={(pairs) => {
                const mc: Record<string, number> = {}
                for (const p of pairs) if (p.key) mc[p.key] = parseInt(p.value) || 1
                uc('background_task', { ...(config.background_task || {}), modelConcurrency: mc })
              }}
              keyPlaceholder="Model name"
              valuePlaceholder="Max concurrent"
            />
          </div>
        )}

        {activeTab === 'hooks' && (
          <div className="space-y-2">
            <p className="text-sm text-themed-secondary mb-4">Enable or disable lifecycle hooks.</p>
            {Object.entries(config.hooks || {}).length === 0 && <p className="text-sm text-themed-muted">No hooks configured. Hooks are defined in the config file.</p>}
            {Object.entries(config.hooks || {}).map(([name, hook]) => (
              <ToggleSwitch
                key={name}
                label={name}
                checked={hook.enabled !== false}
                onChange={(checked) => {
                  const hooks = { ...(config.hooks || {}), [name]: { ...hook, enabled: checked } }
                  uc('hooks', hooks)
                }}
              />
            ))}
          </div>
        )}

        {activeTab === 'mcps' && (
          <div className="space-y-3">
            <p className="text-sm text-themed-secondary mb-2">Configure MCP (Model Context Protocol) servers.</p>
            {Object.entries(config.mcps || {}).map(([name, mcp]) => (
              <Card key={name} title={name} description={mcp.command || ''} collapsible defaultCollapsed>
                <div className="space-y-3 pt-2">
                  <TextInput label="Command" value={mcp.command || ''} onChange={(v) => updateMcp(name, { ...mcp, command: v })} placeholder="e.g. npx" />
                  <ArrayEditor label="Arguments" items={mcp.args || []} onChange={(items) => updateMcp(name, { ...mcp, args: items })} placeholder="e.g. -y @modelcontextprotocol/server" />
                  <KeyValueEditor
                    label="Environment Variables"
                    pairs={Object.entries(mcp.env || {}).map(([k, v]) => ({ key: k, value: v }))}
                    onChange={(pairs) => {
                      const env: Record<string, string> = {}
                      for (const p of pairs) if (p.key) env[p.key] = p.value
                      updateMcp(name, { ...mcp, env })
                    }}
                  />
                  <ToggleSwitch label="Disabled" checked={mcp.disabled || false} onChange={(v) => updateMcp(name, { ...mcp, disabled: v })} />
                  <div className="pt-2 border-t border-border-default">
                    <Button variant="danger" onClick={() => removeMcp(name)}><Trash2 size={14} /> Remove MCP</Button>
                  </div>
                </div>
              </Card>
            ))}
            <Button variant="secondary" onClick={() => setAddMcpOpen(true)}><Plus size={16} /> Add MCP</Button>
            <Modal open={addMcpOpen} onClose={() => setAddMcpOpen(false)} title="Add MCP Server" actions={<><Button variant="secondary" onClick={() => setAddMcpOpen(false)}>Cancel</Button><Button onClick={addMcp}>Add</Button></>}>
              <TextInput label="MCP Name" value={newMcpName} onChange={setNewMcpName} placeholder="e.g. my-mcp-server" />
            </Modal>
          </div>
        )}

        {activeTab === 'experimental' && (
          <div className="space-y-2">
            <p className="text-sm text-themed-secondary mb-4">Toggle experimental features.</p>
            {Object.entries(config.experimental || {}).length === 0 && <p className="text-sm text-themed-muted">No experimental flags configured.</p>}
            {Object.entries(config.experimental || {}).map(([key, val]) => (
              <ToggleSwitch
                key={key}
                label={key.replace(/_/g, ' ')}
                checked={val}
                onChange={(checked) => {
                  uc('experimental', { ...(config.experimental || {}), [key]: checked })
                }}
              />
            ))}
          </div>
        )}

        {activeTab === 'preview' && (
          <JsonEditor
            label="oh-my-openagent.json"
            value={JSON.stringify(config, null, 2)}
            readOnly
          />
        )}
      </div>
    </div>
  )
}
