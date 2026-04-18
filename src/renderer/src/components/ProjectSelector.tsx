import { useState, useEffect } from 'react'
import { useConfigStore, useSettingsStore } from '../stores'
import { Button } from './ui'
import { FolderOpen, ChevronDown, Check, Search } from 'lucide-react'
import type { ProjectInfo, OpenCodeConfig, AgentPluginConfig } from '@shared/types'

export default function ProjectSelector(): JSX.Element {
  const { setOpenCodeConfig, setConfigPath, setAgentConfig, setAgentConfigPath, setDirty, setAgentDirty } = useConfigStore()
  const { recentProjects, addRecentProject } = useSettingsStore()
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { detectProjects() }, [])

  async function detectProjects(): Promise<void> {
    setLoading(true)
    try {
      const detected = await window.api.project.detect(recentProjects)
      setProjects(detected)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function selectProject(path: string): Promise<void> {
    setOpen(false)
    addRecentProject(path)
    try {
      const cfg = await window.api.project.config(path)
      if (cfg.opencode) {
        setOpenCodeConfig(cfg.opencode as OpenCodeConfig)
        setConfigPath({ type: 'project', path: `${path}/.opencode/opencode.json`, exists: true, format: 'json' })
        setDirty(false)
      }
      if (cfg.agent) {
        setAgentConfig(cfg.agent as AgentPluginConfig)
        setAgentConfigPath({ type: 'project', path: `${path}/.opencode/oh-my-openagent.json`, exists: true, format: 'json' })
        setAgentDirty(false)
      }
    } catch (e) { console.error('Failed to load project config:', e) }
  }

  async function browseProject(): Promise<void> {
    setOpen(false)
    try {
      const dir = await window.api.project.select()
      if (dir) await selectProject(dir)
    } catch { /* ignore */ }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md border border-border-default px-3 py-1.5 text-xs text-gray-400 hover:border-accent/50 hover:text-gray-200 transition-colors"
      >
        <FolderOpen size={14} />
        <span className="flex-1 truncate text-left">Select Project</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-72 rounded-md border border-border-default bg-card shadow-xl">
          <div className="max-h-64 overflow-auto p-1">
            {loading && <p className="px-3 py-2 text-xs text-gray-500">Scanning...</p>}
            {!loading && projects.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">No projects detected</p>
            )}
            {projects.map((p) => (
              <button
                key={p.path}
                onClick={() => selectProject(p.path)}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-white/5"
              >
                <FolderOpen size={14} className="shrink-0 text-gray-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-200">{p.name}</div>
                  <div className="truncate text-gray-500">{p.path}</div>
                </div>
                <div className="flex gap-1">
                  {p.hasOpenCodeConfig && <span className="rounded bg-accent/10 px-1 text-[10px] text-accent">OC</span>}
                  {p.hasAgentConfig && <span className="rounded bg-success/10 px-1 text-[10px] text-success">AG</span>}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-border-default p-1">
            <button
              onClick={browseProject}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-200"
            >
              <Search size={14} /> Browse for project...
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
