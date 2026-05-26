import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TerminalPanel from '../components/Terminal/TerminalPanel'
import NotificationCenter from '../components/NotificationCenter'

export default function MainLayout(): JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-mesh">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar with notification center */}
        <div className="flex items-center justify-end px-6 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/50 backdrop-blur-sm">
          <NotificationCenter />
        </div>
        <main className="relative flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
        <TerminalPanel />
      </div>
    </div>
  )
}
