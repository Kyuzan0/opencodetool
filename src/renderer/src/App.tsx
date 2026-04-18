import { HashRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import MainLayout from './layouts/MainLayout'
import DashboardPage from './pages/DashboardPage'
import OpenCodeConfigPage from './pages/OpenCodeConfigPage'
import AgentConfigPage from './pages/AgentConfigPage'
import PluginsPage from './pages/PluginsPage'
import SkillsPage from './pages/SkillsPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsStore } from './stores'
import { applyTheme } from './lib/theme'

function App(): JSX.Element {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <HashRouter>
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
    </HashRouter>
  )
}

export default App
