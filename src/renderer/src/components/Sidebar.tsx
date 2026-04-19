import { useLocation, useNavigate } from 'react-router-dom'
import { useUiStore } from '../stores'
import {
  LayoutDashboard,
  FileJson,
  Bot,
  Puzzle,
  Wand2,
  Settings,
  Cpu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/opencode-config', label: 'OpenCode Config', icon: FileJson },
  { path: '/agent-config', label: 'Agent Config', icon: Bot },
  { path: '/kilo', label: 'Kilo + Openagent', icon: Cpu },
  { path: '/plugins', label: 'Plugins', icon: Puzzle },
  { path: '/skills', label: 'Skills', icon: Wand2 },
  { path: '/settings', label: 'Settings', icon: Settings }
]

export default function Sidebar(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarCollapsed, toggleSidebar } = useUiStore()

  return (
    <aside
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
          className="rounded-lg p-1.5 text-themed-muted hover:bg-white/[0.04] hover:text-themed transition-all"
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
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent/[0.08] text-accent'
                  : 'text-themed-muted hover:bg-white/[0.03] hover:text-themed-secondary'
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

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="border-t border-[var(--color-border-subtle)] px-4 py-3">
          <p className="truncate text-[11px] text-themed-muted font-mono">v1.0.0</p>
        </div>
      )}
    </aside>
  )
}
