import { HashRouter, Routes, Route } from 'react-router-dom'
import { useEffect, Component, type ReactNode } from 'react'
import MainLayout from './layouts/MainLayout'
import DashboardPage from './pages/DashboardPage'
import OpenCodeConfigPage from './pages/OpenCodeConfigPage'
import AgentConfigPage from './pages/AgentConfigPage'
import PluginsPage from './pages/PluginsPage'
import SkillsPage from './pages/SkillsPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsStore, useUiStore } from './stores'
import { applyTheme } from './lib/theme'
import { ToastContainer } from './components/ui/Toast'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useUnsavedWarning } from './hooks/useUnsavedWarning'
import UpdateNotification from './components/UpdateNotification'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-primary p-8">
          <div className="max-w-lg rounded-lg border border-danger/30 bg-danger/5 p-6">
            <h2 className="text-lg font-bold text-danger">Something went wrong</h2>
            <p className="mt-2 text-sm text-themed-secondary">{this.state.error.message}</p>
            <button onClick={() => this.setState({ error: null })} className="mt-4 rounded bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover">
              Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ToastLayer(): JSX.Element {
  const { toasts, removeToast } = useUiStore()
  return <ToastContainer toasts={toasts} onDismiss={removeToast} />
}

function AppShell(): JSX.Element {
  useKeyboardShortcuts()
  useUnsavedWarning()
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/opencode-config" element={<OpenCodeConfigPage />} />
          <Route path="/agent-config" element={<AgentConfigPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <ToastLayer />
      <UpdateNotification />
    </>
  )
}

function App(): JSX.Element {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <ErrorBoundary>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App
