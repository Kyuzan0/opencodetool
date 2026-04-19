import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  theme: 'dark' | 'light'
  language: string
  defaultConfigPath: string
  recentProjects: string[]
  preferredShell: string
  bunPath: string
  autoBackup: boolean
  openCodeWebPort: string
}

interface SettingsActions {
  setTheme: (theme: 'dark' | 'light') => void
  setLanguage: (lang: string) => void
  setDefaultPath: (path: string) => void
  addRecentProject: (path: string) => void
  removeRecentProject: (path: string) => void
  setPreferredShell: (shell: string) => void
  setBunPath: (path: string) => void
  setAutoBackup: (enabled: boolean) => void
  setOpenCodeWebPort: (port: string) => void
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      defaultConfigPath: '',
      recentProjects: [],
      preferredShell: 'powershell',
      bunPath: '',
      autoBackup: true,
      openCodeWebPort: '3000',

      setTheme: (theme) => set({ theme }),
      setLanguage: (lang) => set({ language: lang }),
      setDefaultPath: (path) => set({ defaultConfigPath: path }),
      addRecentProject: (path) =>
        set((s) => ({
          recentProjects: [path, ...s.recentProjects.filter((p) => p !== path)].slice(0, 10)
        })),
      removeRecentProject: (path) =>
        set((s) => ({ recentProjects: s.recentProjects.filter((p) => p !== path) })),
      setPreferredShell: (shell) => set({ preferredShell: shell }),
      setBunPath: (path) => set({ bunPath: path }),
      setAutoBackup: (enabled) => set({ autoBackup: enabled }),
      setOpenCodeWebPort: (port) => set({ openCodeWebPort: port })
    }),
    { name: 'opencode-manager-settings' }
  )
)
