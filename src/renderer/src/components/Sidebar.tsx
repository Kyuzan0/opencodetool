import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUiStore, useSettingsStore, useConfigStore } from '../stores'
import {
  LayoutDashboard,
  FileJson,
  Bot,
  Puzzle,
  Wand2,
  Server,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  FolderOpen
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/opencode-config', label: 'OpenCode Config', icon: FileJson },
  { path: '/agent-config', label: 'Agent Config', icon: Bot },
  { path: '/plugins', label: 'Plugins', icon: Puzzle },
  { path: '/skills', label: 'Skills', icon: Wand2 },
  { path: '/mcp', label: 'MCP Servers', icon: Server },
  { path: '/diagnostics', label: 'Diagnostics', icon: Activity },
  { path: '/logs', label: 'Log Viewer', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings }
]

export default function Sidebar(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarCollapsed, toggleSidebar } = useUiStore()

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={`relative flex h-full flex-col border-r border-[var(--color-border-subtle)] bg-themed-sidebar transition-all duration-300 ease-out ${
        sidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4">
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold text-themed tracking-tight">
            OpenCode Manager
          </span>
        )}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-lg p-1.5 text-themed-muted hover:bg-white/5 hover:text-themed transition-all"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent/[0.08] text-accent'
                  : 'text-themed-muted hover:bg-white/5 hover:text-themed-secondary'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent shadow-[0_0_8px_rgba(0,212,170,0.4)]" />
              )}
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer — Project Switcher */}
      {!sidebarCollapsed && (
        <div className="border-t border-[var(--color-border-subtle)] px-3 py-3 space-y-2">
          <ProjectSwitcher />
          <p className="truncate text-[11px] text-themed-muted font-mono px-1">v1.2.0</p>
        </div>
      )}
    </aside>
  )
}

function ProjectSwitcher(): JSX.Element {
  const { recentProjects, addRecentProject } = useSettingsStore()
  const [open, setOpen] = useState(false)

  async function handleAddProject(): Promise<void> {
    const dir = await (window as any).api.dialog.openDirectory()
    if (dir) {
      addRecentProject(dir)
    }
  }

  async function switchProject(path: string): Promise<void> {
    addRecentProject(path) // moves to top
    setOpen(false)
    // Trigger config reload for the selected project
    try {
      const locations = await (window as any).api.config.projectLocations(path)
      if (locations && locations.length > 0) {
        const store = useConfigStore.getState()
        store.setConfigPath(locations[0])
        const result = await (window as any).api.config.read(locations[0].path)
        store.setOpenCodeConfig(result.data)
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-themed-muted hover:text-themed-secondary hover:bg-white/5 transition-all"
      >
        <FolderOpen size={14} />
        <span className="truncate flex-1 text-left">
          {recentProjects[0] ? recentProjects[0].split(/[/\\]/).pop() : 'No project'}
        </span>
        <ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-40 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-elevated overflow-hidden max-h-48">
            <div className="p-1 max-h-36 overflow-auto">
              {recentProjects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-themed-muted">No recent projects</p>
              ) : (
                recentProjects.map((p, i) => (
                  <button
                    key={p}
                    onClick={() => switchProject(p)}
                    className={`w-full text-left rounded-md px-3 py-1.5 text-xs transition-colors truncate ${
                      i === 0 ? 'text-accent bg-accent/[0.05]' : 'text-themed-secondary hover:bg-white/5'
                    }`}
                    title={p}
                  >
                    {p.split(/[/\\]/).pop()}
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-[var(--color-border-subtle)] p-1">
              <button
                onClick={handleAddProject}
                className="w-full text-left rounded-md px-3 py-1.5 text-xs text-accent hover:bg-accent/[0.05] transition-colors"
              >
                + Add Project
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
