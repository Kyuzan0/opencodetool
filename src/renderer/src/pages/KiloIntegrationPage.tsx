import { useState, useEffect } from 'react'
import { useConfigStore } from '../stores'
import { Card, Button, Modal, ToggleSwitch, SelectInput } from '../components/ui'
import {
  Stethoscope, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Download, Cpu, Layers, Shield, Wrench, ChevronDown, ChevronRight
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────

interface DoctorCheck {
  name: string
  status: 'pass' | 'fail' | 'warn' | 'skip'
  message: string
  details: string[]
  issues: { title: string; description: string; severity: string; affects: string[] }[]
  duration: number
}

interface DoctorResult {
  results: DoctorCheck[]
  systemInfo: {
    opencodeVersion: string
    opencodePath: string
    pluginVersion: string | null
    loadedVersion: string | null
    bunVersion: string
    configPath: string
    configValid: boolean
  }
  tools: {
    lspServers: string[]
    astGrepCli: boolean
    astGrepNapi: boolean
    commentChecker: boolean
    ghCli: { installed: boolean; authenticated: boolean; username?: string }
    mcpBuiltin: string[]
    mcpUser: string[]
  }
  summary: { total: number; passed: number; failed: number; warnings: number; skipped: number; duration: number }
}

interface AgentConfig {
  model: string
  variant?: string
  fallback_models?: { model: string; variant?: string }[]
}

interface OhMyConfig {
  $schema?: string
  agents?: Record<string, AgentConfig>
  categories?: Record<string, AgentConfig>
}

// ── Helpers ──────────────────────────────────────────────────────────

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\u001b\[[0-9;]*m/g, '')
}

function StatusIcon({ status }: { status: string }): JSX.Element {
  switch (status) {
    case 'pass': return <CheckCircle size={16} className="text-success" />
    case 'fail': return <XCircle size={16} className="text-danger" />
    case 'warn': return <AlertTriangle size={16} className="text-warning" />
    default: return <AlertTriangle size={16} className="text-themed-muted" />
  }
}

// ── Provider config modal types ─────────────────────────────────────

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
  claude: 'no', openai: 'no', gemini: 'no', copilot: 'no',
  opencodeZen: 'no', zaiCodingPlan: 'no', kimiForCoding: 'no',
  opencodeGo: 'no', vercelAiGateway: 'no', skipAuth: false
}

function buildInstallCommand(config: ProviderConfig): string {
  const flags = [
    'install', '--no-tui',
    `--claude=${config.claude}`, `--openai=${config.openai}`,
    `--gemini=${config.gemini}`, `--copilot=${config.copilot}`,
    `--opencode-zen=${config.opencodeZen}`, `--zai-coding-plan=${config.zaiCodingPlan}`,
    `--kimi-for-coding=${config.kimiForCoding}`, `--opencode-go=${config.opencodeGo}`,
    `--vercel-ai-gateway=${config.vercelAiGateway}`
  ]
  if (config.skipAuth) flags.push('--skip-auth')
  return `bunx oh-my-openagent ${flags.join(' ')}`
}

// ── Main Component ──────────────────────────────────────────────────

export default function KiloIntegrationPage(): JSX.Element {
  const { agentConfigPath } = useConfigStore()

  // Doctor state
  const [doctorResult, setDoctorResult] = useState<DoctorResult | null>(null)
  const [doctorLoading, setDoctorLoading] = useState(false)
  const [doctorError, setDoctorError] = useState<string | null>(null)
  const [openagentVersion, setOpenagentVersion] = useState<string | null>(null)

  // Config state
  const [ohMyConfig, setOhMyConfig] = useState<OhMyConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Install state
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>({ ...DEFAULT_PROVIDER_CONFIG })
  const [installing, setInstalling] = useState(false)
  const [installLog, setInstallLog] = useState<string[]>([])

  useEffect(() => {
    loadOpenagentVersion()
    loadOhMyConfig()
  }, [])

  // ── Data loading ────────────────────────────────────────────────

  async function loadOpenagentVersion(): Promise<void> {
    try {
      const result = await window.api.pm.openagentVersion()
      if (result.exitCode === 0) {
        setOpenagentVersion(stripAnsi(result.stdout).trim())
      }
    } catch { /* not installed */ }
  }

  async function runDoctor(): Promise<void> {
    setDoctorLoading(true)
    setDoctorError(null)
    try {
      const result = await window.api.pm.openagentDoctor()
      if (result.exitCode === 0) {
        const clean = stripAnsi(result.stdout)
        const parsed = JSON.parse(clean) as DoctorResult
        setDoctorResult(parsed)
      } else {
        setDoctorError(stripAnsi(result.stderr || 'Doctor check failed'))
      }
    } catch (e: any) {
      setDoctorError(e.message || 'Failed to run doctor')
    } finally {
      setDoctorLoading(false)
    }
  }

  async function loadOhMyConfig(): Promise<void> {
    setConfigLoading(true)
    try {
      const locations = await window.api.config.locations()
      const ohMyLoc = locations.find((l: any) =>
        l.path.includes('oh-my-openagent') && l.exists
      )
      if (ohMyLoc) {
        const result = await window.api.config.read(ohMyLoc.path)
        setOhMyConfig(result.data as OhMyConfig)
      }
    } catch { /* ignore */ }
    finally { setConfigLoading(false) }
  }

  // ── Install handler ─────────────────────────────────────────────

  async function handleInstall(): Promise<void> {
    setInstalling(true)
    const command = buildInstallCommand(providerConfig)
    setInstallLog([`> ${command}...`])
    try {
      const configDir = agentConfigPath?.path
        ? agentConfigPath.path.replace(/[/\\][^/\\]+$/, '')
        : ''
      const result = await window.api.pm.install(command, configDir)
      const lines = stripAnsi(result.stdout || '').split('\n').filter((l) => l.trim())
      setInstallLog((prev) => [...prev, ...lines])
      if (result.exitCode === 0) {
        setInstallLog((prev) => [...prev, '', 'Installation complete!'])
        await loadOpenagentVersion()
        await loadOhMyConfig()
      } else {
        const errLines = stripAnsi(result.stderr || '').split('\n').filter((l) => l.trim())
        setInstallLog((prev) => [...prev, ...errLines.map((l) => `Error: ${l}`)])
      }
    } catch (e: any) {
      setInstallLog((prev) => [...prev, `Error: ${e.message || 'Install failed'}`])
    } finally {
      setInstalling(false)
    }
  }

  // ── Toggle helpers ──────────────────────────────────────────────

  function toggleAgent(name: string): void {
    setExpandedAgents((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleCategory(name: string): void {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-themed">Kilo + oh-my-openagent</h1>
        <p className="text-[13px] text-themed-muted mt-1">Manage oh-my-openagent integration and diagnostics</p>
      </div>

      {/* ── Status Overview ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="animate-stagger-in stagger-1">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/[0.08] p-2.5"><Cpu size={20} className="text-accent" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-themed-muted">oh-my-openagent</p>
              {openagentVersion ? (
                <div className="flex items-center gap-1">
                  <CheckCircle size={14} className="text-success" />
                  <span className="text-xl font-bold tabular-nums text-themed">v{openagentVersion}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <XCircle size={14} className="text-danger" />
                  <span className="text-sm font-medium text-danger">Not installed</span>
                </div>
              )}
            </div>
          </div>
        </Card>
        <Card className="animate-stagger-in stagger-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/[0.08] p-2.5"><Layers size={20} className="text-accent" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-themed-muted">Agents Configured</p>
              <span className="text-xl font-bold tabular-nums text-themed">{ohMyConfig?.agents ? Object.keys(ohMyConfig.agents).length : 0}</span>
            </div>
          </div>
        </Card>
        <Card className="animate-stagger-in stagger-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/[0.08] p-2.5"><Shield size={20} className="text-accent" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-themed-muted">Categories Configured</p>
              <span className="text-xl font-bold tabular-nums text-themed">{ohMyConfig?.categories ? Object.keys(ohMyConfig.categories).length : 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-themed-muted uppercase tracking-wider">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={runDoctor} loading={doctorLoading}>
            <Stethoscope size={16} /> Run Doctor
          </Button>
          <Button variant="secondary" onClick={() => { setProviderConfig({ ...DEFAULT_PROVIDER_CONFIG }); setInstallLog([]); setShowInstallModal(true) }}>
            <Download size={16} /> Install / Reconfigure
          </Button>
          <Button variant="secondary" onClick={loadOhMyConfig} loading={configLoading}>
            <RefreshCw size={16} /> Reload Config
          </Button>
        </div>
      </div>

      {/* ── Doctor Results ───────────────────────────────────────── */}
      {(doctorResult || doctorError) && (
        <Card title="Doctor Diagnostics">
          {doctorError ? (
            <div className="flex items-center gap-2 text-danger">
              <XCircle size={16} />
              <span className="text-sm">{doctorError}</span>
            </div>
          ) : doctorResult && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex items-center gap-4 rounded-xl bg-surface/30 p-4">
                <div className="flex items-center gap-1">
                  <CheckCircle size={14} className="text-success" />
                  <span className="text-xs text-themed-secondary">{doctorResult.summary.passed} passed</span>
                </div>
                {doctorResult.summary.warnings > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={14} className="text-warning" />
                    <span className="text-xs text-themed-secondary">{doctorResult.summary.warnings} warnings</span>
                  </div>
                )}
                {doctorResult.summary.failed > 0 && (
                  <div className="flex items-center gap-1">
                    <XCircle size={14} className="text-danger" />
                    <span className="text-xs text-themed-secondary">{doctorResult.summary.failed} failed</span>
                  </div>
                )}
                <span className="text-xs text-themed-muted ml-auto">{(doctorResult.summary.duration / 1000).toFixed(1)}s</span>
              </div>

              {/* System info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between rounded-lg bg-surface/30 px-3 py-2.5">
                  <span className="text-themed-muted">OpenCode</span>
                  <span className="text-themed font-medium">{doctorResult.systemInfo.opencodeVersion}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-surface/30 px-3 py-2.5">
                  <span className="text-themed-muted">Bun</span>
                  <span className="text-themed font-medium">{doctorResult.systemInfo.bunVersion}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-surface/30 px-3 py-2.5">
                  <span className="text-themed-muted">GH CLI</span>
                  <span className="text-themed font-medium">
                    {doctorResult.tools.ghCli.installed
                      ? `${doctorResult.tools.ghCli.username || 'yes'}${doctorResult.tools.ghCli.authenticated ? ' (auth)' : ''}`
                      : 'not installed'}
                  </span>
                </div>
                <div className="flex justify-between rounded-lg bg-surface/30 px-3 py-2.5">
                  <span className="text-themed-muted">MCP Servers</span>
                  <span className="text-themed font-medium">{doctorResult.tools.mcpBuiltin.length} builtin, {doctorResult.tools.mcpUser.length} user</span>
                </div>
              </div>

              {/* Check results */}
              <div className="space-y-2">
                {doctorResult.results.map((check) => (
                  <div key={check.name} className="rounded-lg border border-[var(--color-border-subtle)] p-3 hover:border-[var(--color-border-bright)] transition-colors">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={check.status} />
                      <span className="text-sm font-medium text-themed">{check.name}</span>
                      <span className="text-xs text-themed-muted ml-auto">{check.message}</span>
                    </div>
                    {check.issues.length > 0 && (
                      <div className="mt-2 space-y-1 pl-6">
                        {check.issues.map((issue, i) => (
                          <div key={i} className="text-xs">
                            <span className={issue.severity === 'warning' ? 'text-warning' : 'text-danger'}>{issue.title}</span>
                            <p className="text-themed-muted">{issue.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Agent Configuration ──────────────────────────────────── */}
      {ohMyConfig?.agents && Object.keys(ohMyConfig.agents).length > 0 && (
        <Card title="Agent Model Assignments">
          <div className="space-y-1">
            {Object.entries(ohMyConfig.agents).map(([name, config]) => (
              <div key={name} className="rounded-lg border border-[var(--color-border-subtle)] hover:border-[var(--color-border-bright)] transition-colors">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface/30 transition-colors"
                  onClick={() => toggleAgent(name)}
                >
                  {expandedAgents.has(name) ? <ChevronDown size={14} className="text-themed-muted" /> : <ChevronRight size={14} className="text-themed-muted" />}
                  <Cpu size={14} className="text-accent" />
                  <span className="text-sm font-medium text-themed">{name}</span>
                  <span className="text-xs text-themed-muted ml-auto">{config.model}{config.variant ? ` (${config.variant})` : ''}</span>
                </button>
                {expandedAgents.has(name) && (
                  <div className="border-t border-[var(--color-border-subtle)] px-3 py-2 pl-9 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-themed-muted w-16">Primary:</span>
                      <span className="text-themed font-mono">{config.model}</span>
                      {config.variant && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">{config.variant}</span>}
                    </div>
                    {config.fallback_models?.map((fb, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-themed-muted w-16">Fallback {i + 1}:</span>
                        <span className="text-themed-secondary font-mono">{fb.model}</span>
                        {fb.variant && <span className="rounded bg-warning/10 px-1.5 py-0.5 text-warning">{fb.variant}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Category Configuration ───────────────────────────────── */}
      {ohMyConfig?.categories && Object.keys(ohMyConfig.categories).length > 0 && (
        <Card title="Category Model Assignments">
          <div className="space-y-1">
            {Object.entries(ohMyConfig.categories).map(([name, config]) => (
              <div key={name} className="rounded-lg border border-[var(--color-border-subtle)] hover:border-[var(--color-border-bright)] transition-colors">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface/30 transition-colors"
                  onClick={() => toggleCategory(name)}
                >
                  {expandedCategories.has(name) ? <ChevronDown size={14} className="text-themed-muted" /> : <ChevronRight size={14} className="text-themed-muted" />}
                  <Layers size={14} className="text-accent" />
                  <span className="text-sm font-medium text-themed">{name}</span>
                  <span className="text-xs text-themed-muted ml-auto">{config.model}{config.variant ? ` (${config.variant})` : ''}</span>
                </button>
                {expandedCategories.has(name) && (
                  <div className="border-t border-[var(--color-border-subtle)] px-3 py-2 pl-9 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-themed-muted w-16">Primary:</span>
                      <span className="text-themed font-mono">{config.model}</span>
                      {config.variant && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">{config.variant}</span>}
                    </div>
                    {config.fallback_models?.map((fb, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-themed-muted w-16">Fallback {i + 1}:</span>
                        <span className="text-themed-secondary font-mono">{fb.model}</span>
                        {fb.variant && <span className="rounded bg-warning/10 px-1.5 py-0.5 text-warning">{fb.variant}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Install / Reconfigure Modal ──────────────────────────── */}
      <Modal
        open={showInstallModal}
        onClose={() => !installing && setShowInstallModal(false)}
        title="Install oh-my-openagent"
        className="max-w-2xl"
        actions={
          installLog.some((l) => l.includes('Installation complete')) ? (
            <Button variant="secondary" onClick={() => setShowInstallModal(false)}>Close</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowInstallModal(false)} disabled={installing}>Cancel</Button>
              <Button onClick={handleInstall} loading={installing}>
                <Download size={16} /> Install
              </Button>
            </>
          )
        }
      >
        {installLog.length > 0 ? (
          <div className="max-h-64 overflow-auto rounded-xl bg-primary p-4 border border-[var(--color-border-subtle)] font-mono text-xs text-themed-secondary whitespace-pre-wrap">
            {installLog.map((line, i) => (
              <div key={i} className={line.startsWith('Error') ? 'text-danger' : line.includes('complete') ? 'text-success font-medium' : ''}>{line || '\u00A0'}</div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-themed-muted">Select model providers for Kilo Code integration. Priority: Native &gt; Copilot &gt; OpenCode Zen &gt; Z.ai &gt; Kimi &gt; Vercel</p>
            <div className="grid grid-cols-2 gap-3">
              <SelectInput label="Assistant" description="anthropic/ models" options={CLAUDE_OPTIONS} value={providerConfig.claude} onChange={(v) => setProviderConfig((c) => ({ ...c, claude: v }))} />
              <SelectInput label="OpenAI" description="openai/ models" options={PROVIDER_OPTIONS} value={providerConfig.openai} onChange={(v) => setProviderConfig((c) => ({ ...c, openai: v }))} />
              <SelectInput label="Gemini" description="google/ models" options={PROVIDER_OPTIONS} value={providerConfig.gemini} onChange={(v) => setProviderConfig((c) => ({ ...c, gemini: v }))} />
              <SelectInput label="GitHub Copilot" description="github-copilot/ models" options={PROVIDER_OPTIONS} value={providerConfig.copilot} onChange={(v) => setProviderConfig((c) => ({ ...c, copilot: v }))} />
              <SelectInput label="OpenCode Zen" description="opencode/ models" options={PROVIDER_OPTIONS} value={providerConfig.opencodeZen} onChange={(v) => setProviderConfig((c) => ({ ...c, opencodeZen: v }))} />
              <SelectInput label="Z.ai Coding Plan" description="zai-coding-plan/" options={PROVIDER_OPTIONS} value={providerConfig.zaiCodingPlan} onChange={(v) => setProviderConfig((c) => ({ ...c, zaiCodingPlan: v }))} />
              <SelectInput label="Kimi For Coding" description="kimi-for-coding/" options={PROVIDER_OPTIONS} value={providerConfig.kimiForCoding} onChange={(v) => setProviderConfig((c) => ({ ...c, kimiForCoding: v }))} />
              <SelectInput label="OpenCode Go" description="OpenCode Go" options={PROVIDER_OPTIONS} value={providerConfig.opencodeGo} onChange={(v) => setProviderConfig((c) => ({ ...c, opencodeGo: v }))} />
              <SelectInput label="Vercel AI Gateway" description="vercel/ models" options={PROVIDER_OPTIONS} value={providerConfig.vercelAiGateway} onChange={(v) => setProviderConfig((c) => ({ ...c, vercelAiGateway: v }))} />
            </div>
            <ToggleSwitch label="Skip Authentication Setup" description="Skip auth setup hints" checked={providerConfig.skipAuth} onChange={(v) => setProviderConfig((c) => ({ ...c, skipAuth: v }))} />
          </div>
        )}
      </Modal>
    </div>
  )
}
