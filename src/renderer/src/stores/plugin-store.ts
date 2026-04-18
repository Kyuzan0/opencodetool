import { create } from 'zustand'
import type { PluginInfo } from '@shared/types'

interface PluginState {
  plugins: PluginInfo[]
  isInstalling: boolean
  installProgress: string
  isLoading: boolean
}

interface PluginActions {
  setPlugins: (plugins: PluginInfo[]) => void
  setInstalling: (installing: boolean) => void
  setInstallProgress: (progress: string) => void
  setLoading: (loading: boolean) => void
  updatePlugin: (name: string, updates: Partial<PluginInfo>) => void
  addPlugin: (plugin: PluginInfo) => void
  removePlugin: (name: string) => void
}

export const usePluginStore = create<PluginState & PluginActions>()((set) => ({
  plugins: [],
  isInstalling: false,
  installProgress: '',
  isLoading: false,

  setPlugins: (plugins) => set({ plugins }),
  setInstalling: (installing) => set({ isInstalling: installing }),
  setInstallProgress: (progress) => set({ installProgress: progress }),
  setLoading: (loading) => set({ isLoading: loading }),

  updatePlugin: (name, updates) =>
    set((s) => ({
      plugins: s.plugins.map((p) => (p.name === name ? { ...p, ...updates } : p))
    })),

  addPlugin: (plugin) => set((s) => ({ plugins: [...s.plugins, plugin] })),
  removePlugin: (name) => set((s) => ({ plugins: s.plugins.filter((p) => p.name !== name) }))
}))
