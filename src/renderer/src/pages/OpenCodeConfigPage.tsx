import { useState, useEffect, useMemo } from 'react'
import { useConfigStore } from '../stores'
import {
  Tabs, Card, TextInput, SelectInput, ToggleSwitch,
  KeyValueEditor, ArrayEditor, JsonEditor, Button, Modal
} from '../components/ui'
import { Save, RefreshCw, Upload, Download, Plus, Trash2 } from 'lucide-react'
import type { OpenCodeConfig } from '@shared/types'
import { PERMISSION_KEYS } from '@shared/types'

const TABS = [
  { id: 'providers', label: 'Providers' },
  { id: 'models', label: 'Models' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'general', label: 'General' },
  { id: 'preview', label: 'JSON Preview' }
]

const PERM_DESC: Record<string, string> = {
  bash: 'Execute shell commands',
  read: 'Read files from the filesystem',
  glob: 'Search for files by pattern',
  grep: 'Search file contents',
  list: 'List directory contents',
  external_directory: 'Access directories outside the project',
  edit: 'Edit and write files',
  skill: 'Use skills and commands',
  task: 'Spawn sub-agent tasks'
}

export default function OpenCodeConfigPage(): JSX.Element {
  const {
    openCodeConfig, configPath, isDirty, isLoading,
    setOpenCodeConfig, setConfigPath, setDirty, setLoading, setError
  } = useConfigStore()

  const [activeTab, setActiveTab] = useState('providers')
  const [selProv, setSelProv] = useState('')
  const [addProvOpen, setAddProvOpen] = useState(false)
  const [newProvName, setNewProvName] = useState('')
  const [addModelOpen, setAddModelOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [expandedProviders, setExpandedProviders] = useState<Set<number>>(new Set())

  useEffect(() => { if (!openCodeConfig) loadConfig() }, [])

  useEffect(() => {
    if (openCodeConfig?.provider) {
      const names = Object.keys(openCodeConfig.provider)
      if (names.length > 0 && !selProv) setSelProv(names[0])
    }
  }, [openCodeConfig])

  const modelOpts = useMemo(() => {
    if (!openCodeConfig?.provider) return []
    const opts: { value: string; label: string }[] = []
    for (const [pn, pv] of Object.entries(openCodeConfig.provider)) {
      if (pv.models) for (const mk of Object.keys(pv.models)) {
        opts.push({ value: `${pn}/${mk}`, label: `${pn}/${mk}` })
      }
    }
    return opts
  }, [openCodeConfig])

  const provOpts = useMemo(() => {
    if (!openCodeConfig?.provider) return []
    return Object.keys(openCodeConfig.provider).map((n) => ({ value: n, label: n }))
  }, [openCodeConfig])

  async function loadConfig(): Promise<void> {
    setLoading(true)
    try {
      const locs = await window.api.config.locations()
      const loc = locs.find((l: any) => l.path.includes('opencode.json') && !l.path.includes('oh-my-'))
      if (loc) {
        setConfigPath(loc)
        const r = await window.api.config.read(loc.path)
        setOpenCodeConfig(r.data as OpenCodeConfig)
      }
    } catch (e: any) { setError(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  async function handleSave(): Promise<void> {
    if (!openCodeConfig || !configPath) return
    setSaveLoading(true)
    try {
      await window.api.config.write(configPath.path, openCodeConfig as any, { format: configPath.format || 'json' })
      setDirty(false)
    } catch (e: any) { setError(e.message || 'Failed to save') }
    finally { setSaveLoading(false) }
  }

  async function handleReload(): Promise<void> {
    if (!configPath) return
    setLoading(true)
    try {
      const r = await window.api.config.read(configPath.path)
      setOpenCodeConfig(r.data as OpenCodeConfig)
    } catch (e: any) { setError(e.message || 'Failed to reload') }
    finally { setLoading(false) }
  }

  async function handleImport(): Promise<void> {
    try {
      const fp = await window.api.dialog.openFile({ filters: [{ name: 'JSON', extensions: ['json', 'jsonc'] }] })
      if (fp) {
        const r = await window.api.config.read(fp)
        setOpenCodeConfig(r.data as OpenCodeConfig)
        setDirty(true)
      }
    } catch (e: any) { setError(e.message || 'Import failed') }
  }

  async function handleExport(): Promise<void> {
    if (!openCodeConfig) return
    try {
      const fp = await window.api.dialog.saveFile({ defaultPath: 'opencode.json', filters: [{ name: 'JSON', extensions: ['json'] }] })
      if (fp) await window.api.config.write(fp, openCodeConfig as any, { format: 'json' })
    } catch (e: any) { setError(e.message || 'Export failed') }
  }

  function uc(path: string, value: unknown): void {
    useConfigStore.getState().updateOpenCodeField(path, value)
  }

  function upf(pn: string, field: string, val: unknown): void {
    if (!openCodeConfig?.provider?.[pn]) return
    const p = openCodeConfig.provider[pn]
    uc(`provider.${pn}`, { ...p, [field]: val })
  }

  function addProvider(): void {
    if (!newProvName.trim() || !openCodeConfig) return
    setOpenCodeConfig({
      ...openCodeConfig,
      provider: { ...openCodeConfig.provider, [newProvName.trim()]: { name: newProvName.trim(), options: {}, models: {} } }
    })
    setDirty(true)
    setNewProvName('')
    setAddProvOpen(false)
  }

  function renameProvider(oldKey: string, newKey: string): void {
    if (!openCodeConfig?.provider) return
    if (newKey === oldKey) return
    // Allow empty temporarily while typing, but don't commit empty keys
    if (!newKey) return
    // Block duplicate keys (but allow same key with different case during typing)
    if (newKey !== oldKey && openCodeConfig.provider[newKey]) return
    const entries = Object.entries(openCodeConfig.provider)
    const newProvider: Record<string, any> = {}
    for (const [k, v] of entries) {
      newProvider[k === oldKey ? newKey : k] = v
    }
    setOpenCodeConfig({ ...openCodeConfig, provider: newProvider })
    setDirty(true)
    if (selProv === oldKey) setSelProv(newKey)
  }

  function removeProvider(name: string): void {
    if (!openCodeConfig?.provider) return
    const { [name]: _, ...rest } = openCodeConfig.provider
    setOpenCodeConfig({ ...openCodeConfig, provider: rest })
    setDirty(true)
    if (selProv === name) setSelProv(Object.keys(rest)[0] || '')
  }

  function addModel(): void {
    if (!newModelName.trim() || !selProv || !openCodeConfig?.provider?.[selProv]) return
    const p = openCodeConfig.provider[selProv]
    upf(selProv, 'models', { ...(p.models || {}), [newModelName.trim()]: { name: newModelName.trim(), limit: { context: 200000, output: 16000 } } })
    setNewModelName('')
    setAddModelOpen(false)
  }

  function removeModel(mk: string): void {
    if (!selProv || !openCodeConfig?.provider?.[selProv]?.models) return
    const { [mk]: _, ...rest } = openCodeConfig.provider[selProv].models!
    upf(selProv, 'models', rest)
  }

  function umf(mk: string, field: string, val: unknown): void {
    if (!selProv || !openCodeConfig?.provider?.[selProv]?.models?.[mk]) return
    const p = openCodeConfig.provider[selProv]
    const m = p.models![mk]
    upf(selProv, 'models', { ...p.models, [mk]: { ...m, [field]: val } })
  }

  if (isLoading) return <div className="flex items-center justify-center py-20 text-gray-500">Loading config...</div>
  if (!openCodeConfig) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-gray-500">No config loaded</p>
      <Button onClick={loadConfig}>Load Config</Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">OpenCode Config</h1>
          {configPath && <p className="text-xs text-gray-500 mt-1" title={configPath.path}>{configPath.path}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleImport}><Upload size={16} /> Import</Button>
          <Button variant="secondary" onClick={handleExport}><Download size={16} /> Export</Button>
          <Button variant="secondary" onClick={handleReload}><RefreshCw size={16} /> Reload</Button>
          <Button onClick={handleSave} disabled={!isDirty} loading={saveLoading}><Save size={16} /> Save</Button>
        </div>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'providers' && (
          <div className="space-y-3">
            {Object.entries(openCodeConfig.provider || {}).map(([name, prov], idx) => (
              <Card key={idx} title={name} description={prov.npm || prov.options?.baseURL || ''} collapsible collapsed={!expandedProviders.has(idx)} onToggle={() => setExpandedProviders(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next })}>
                <div className="space-y-3 pt-2">
                  <TextInput label="Provider Key" value={name} onChange={(v) => renameProvider(name, v)} description="Unique identifier used as the JSON key. No spaces allowed." />
                  <TextInput label="Display Name" value={prov.name || name} onChange={(v) => upf(name, 'name', v)} />
                  <TextInput label="NPM Package" value={prov.npm || ''} onChange={(v) => upf(name, 'npm', v)} placeholder="e.g. @ai-sdk/openai" />
                  <TextInput label="Base URL" type="url" value={prov.options?.baseURL || ''} onChange={(v) => {
                    const opts = { ...(prov.options || {}), baseURL: v }
                    upf(name, 'options', opts)
                  }} placeholder="https://api.example.com/v1" />
                  <TextInput label="API Key" type="password" value={prov.options?.apiKey || ''} onChange={(v) => {
                    const opts = { ...(prov.options || {}), apiKey: v }
                    upf(name, 'options', opts)
                  }} />
                  <KeyValueEditor
                    label="Additional Options"
                    pairs={Object.entries(prov.options || {}).filter(([k]) => k !== 'baseURL' && k !== 'apiKey').map(([key, value]) => ({ key, value: String(value) }))}
                    onChange={(pairs) => {
                      const base: Record<string, unknown> = {}
                      if (prov.options?.baseURL) base.baseURL = prov.options.baseURL
                      if (prov.options?.apiKey) base.apiKey = prov.options.apiKey
                      for (const p of pairs) if (p.key) base[p.key] = p.value
                      upf(name, 'options', base)
                    }}
                  />
                  <div className="pt-2 border-t border-border-default">
                    <Button variant="danger" onClick={() => removeProvider(name)}><Trash2 size={14} /> Remove Provider</Button>
                  </div>
                </div>
              </Card>
            ))}
            <Button variant="secondary" onClick={() => setAddProvOpen(true)}><Plus size={16} /> Add Provider</Button>
            <Modal open={addProvOpen} onClose={() => setAddProvOpen(false)} title="Add Provider" actions={<><Button variant="secondary" onClick={() => setAddProvOpen(false)}>Cancel</Button><Button onClick={addProvider}>Add</Button></>}>
              <TextInput label="Provider Name" value={newProvName} onChange={setNewProvName} placeholder="e.g. my-provider" />
            </Modal>
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-4">
            <SelectInput label="Provider" options={provOpts} value={selProv} onChange={setSelProv} placeholder="Select provider" />
            {selProv && openCodeConfig.provider?.[selProv]?.models && (
              <div className="space-y-3">
                {Object.entries(openCodeConfig.provider[selProv].models!).map(([mk, model]) => (
                  <Card key={mk} title={mk} description={model.name || mk} collapsible defaultCollapsed>
                    <div className="space-y-3 pt-2">
                      <TextInput label="Display Name" value={model.name || mk} onChange={(v) => umf(mk, 'name', v)} />
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput label="Context Limit" type="number" value={String(model.limit?.context || '')} onChange={(v) => umf(mk, 'limit', { ...(model.limit || {}), context: parseInt(v) || 0 })} />
                        <TextInput label="Output Limit" type="number" value={String(model.limit?.output || '')} onChange={(v) => umf(mk, 'limit', { ...(model.limit || {}), output: parseInt(v) || 0 })} />
                      </div>
                      <ToggleSwitch label="Reasoning" description="Enable reasoning/thinking mode" checked={model.reasoning || false} onChange={(v) => umf(mk, 'reasoning', v)} />
                      <ArrayEditor label="Input Modalities" items={model.modalities?.input || []} onChange={(items) => umf(mk, 'modalities', { ...(model.modalities || {}), input: items })} placeholder="e.g. text" />
                      <ArrayEditor label="Output Modalities" items={model.modalities?.output || []} onChange={(items) => umf(mk, 'modalities', { ...(model.modalities || {}), output: items })} placeholder="e.g. text" />
                      <div className="pt-2 border-t border-border-default">
                        <Button variant="danger" onClick={() => removeModel(mk)}><Trash2 size={14} /> Remove Model</Button>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="secondary" onClick={() => setAddModelOpen(true)}><Plus size={16} /> Add Model</Button>
                <Modal open={addModelOpen} onClose={() => setAddModelOpen(false)} title="Add Model" actions={<><Button variant="secondary" onClick={() => setAddModelOpen(false)}>Cancel</Button><Button onClick={addModel}>Add</Button></>}>
                  <TextInput label="Model Key" value={newModelName} onChange={setNewModelName} placeholder="e.g. gpt-4o" />
                </Modal>
              </div>
            )}
            {selProv && !openCodeConfig.provider?.[selProv]?.models && <p className="text-gray-500 text-sm">No models configured for this provider.</p>}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-4">Control what actions the AI agent is allowed to perform.</p>
            {PERMISSION_KEYS.map((key) => (
              <ToggleSwitch
                key={key}
                label={key.replace(/_/g, ' ')}
                description={PERM_DESC[key] || ''}
                checked={(openCodeConfig.permission?.[key] || 'ask') === 'allow'}
                onChange={(checked) => {
                  const perms = { ...(openCodeConfig.permission || {}) }
                  perms[key] = checked ? 'allow' : 'ask'
                  uc('permission', perms)
                }}
              />
            ))}
          </div>
        )}

        {activeTab === 'general' && (
          <div className="space-y-4">
            <SelectInput label="Default Model" options={modelOpts} value={openCodeConfig.model || ''} onChange={(v) => uc('model', v)} placeholder="Select model" />
            <SelectInput label="Small Model" options={modelOpts} value={openCodeConfig.small_model || ''} onChange={(v) => uc('small_model', v)} placeholder="Select small model" />
            <ArrayEditor label="Plugins" items={openCodeConfig.plugin || []} onChange={(items) => uc('plugin', items)} placeholder="e.g. oh-my-china" />
            <ArrayEditor label="Disabled Providers" items={openCodeConfig.disabled_providers || []} onChange={(items) => uc('disabled_providers', items)} placeholder="e.g. openai" />
            <Card title="Compaction">
              <div className="space-y-2">
                <ToggleSwitch label="Auto Compaction" description="Automatically compact conversation context" checked={openCodeConfig.compaction?.auto ?? true} onChange={(v) => uc('compaction', { ...(openCodeConfig.compaction || {}), auto: v })} />
                <ToggleSwitch label="Prune" description="Prune old messages from context" checked={openCodeConfig.compaction?.prune ?? false} onChange={(v) => uc('compaction', { ...(openCodeConfig.compaction || {}), prune: v })} />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'preview' && (
          <JsonEditor
            label="opencode.json"
            value={JSON.stringify(openCodeConfig, null, 2)}
            readOnly
          />
        )}
      </div>
    </div>
  )
}
