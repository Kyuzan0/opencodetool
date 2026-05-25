import { create } from 'zustand'
import type { TrendingMcp, McpListEntry } from '@shared/types'

interface McpState {
  trending: TrendingMcp[]
  installed: McpListEntry[]
  pluginMcps: McpListEntry[]
  isLoading: boolean
  isInstalling: boolean
  searchQuery: string
  selectedCategory: string
}

interface McpActions {
  setTrending: (trending: TrendingMcp[]) => void
  setInstalled: (installed: McpListEntry[]) => void
  setPluginMcps: (mcps: McpListEntry[]) => void
  setLoading: (loading: boolean) => void
  setInstalling: (installing: boolean) => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string) => void
  addInstalled: (entry: McpListEntry) => void
  removeInstalled: (name: string) => void
  updateInstalled: (name: string, updates: Partial<McpListEntry>) => void
}

export const useMcpStore = create<McpState & McpActions>()((set) => ({
  trending: [],
  installed: [],
  pluginMcps: [],
  isLoading: false,
  isInstalling: false,
  searchQuery: '',
  selectedCategory: 'All',

  setTrending: (trending) => set({ trending }),
  setInstalled: (installed) => set({ installed }),
  setPluginMcps: (mcps) => set({ pluginMcps: mcps }),
  setLoading: (loading) => set({ isLoading: loading }),
  setInstalling: (installing) => set({ isInstalling: installing }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  addInstalled: (entry) => set((s) => ({ installed: [...s.installed, entry] })),
  removeInstalled: (name) => set((s) => ({ installed: s.installed.filter((m) => m.name !== name) })),
  updateInstalled: (name, updates) =>
    set((s) => ({
      installed: s.installed.map((m) => (m.name === name ? { ...m, ...updates } : m))
    }))
}))
