import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TerminalPanel from '../components/Terminal/TerminalPanel'

export default function MainLayout(): JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <TerminalPanel />
      </div>
    </div>
  )
}
