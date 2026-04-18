import { useLocation, useNavigate } from 'react-router-dom'
import { useUiStore } from '../stores'
import {
  LayoutDashboard,
  FileJson,
  Bot,
  Puzzle,
  Wand2,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/opencode-config', label: 'OpenCode Config', icon: FileJson },
  { path: '/agent-config', label: 'Agent Config', icon: Bot },
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
      className={`flex h-full flex-col border-r border-themed bg-themed-sidebar transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b border-themed px-4">
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold text-themed">OpenCode Manager</span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded p-1 text-themed-muted hover:bg-black/10 dark:hover:bg-white/10 hover:text-themed"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-accent/20 text-accent'
                  : 'text-themed-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-themed'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {!sidebarCollapsed && (
        <div className="border-t border-border-default p-3">
          <p className="truncate text-xs text-gray-500">v1.0.0</p>
        </div>
      )}
    </aside>
  )
}
