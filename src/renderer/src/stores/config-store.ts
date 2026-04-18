import { create } from 'zustand'
import type { OpenCodeConfig, AgentPluginConfig, ConfigLocation } from '@shared/types'

interface ConfigState {
  openCodeConfig: OpenCodeConfig | null
  agentConfig: AgentPluginConfig | null
  configPath: ConfigLocation | null
  agentConfigPath: ConfigLocation | null
  isLoading: boolean
  isDirty: boolean
  isAgentDirty: boolean
  lastError: string | null
}

interface ConfigActions {
  setOpenCodeConfig: (config: OpenCodeConfig | null) => void
  setAgentConfig: (config: AgentPluginConfig | null) => void
  setConfigPath: (location: ConfigLocation | null) => void
  setAgentConfigPath: (location: ConfigLocation | null) => void
  updateOpenCodeField: (path: string, value: unknown) => void
  updateAgentField: (path: string, value: unknown) => void
  setDirty: (dirty: boolean) => void
  setAgentDirty: (dirty: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetChanges: () => void
}

const initialState: ConfigState = {
  openCodeConfig: null,
  agentConfig: null,
  configPath: null,
  agentConfigPath: null,
  isLoading: false,
  isDirty: false,
  isAgentDirty: false,
  lastError: null
}

export const useConfigStore = create<ConfigState & ConfigActions>()((set, get) => ({
  ...initialState,

  setOpenCodeConfig: (config) => set({ openCodeConfig: config, isDirty: false }),
  setAgentConfig: (config) => set({ agentConfig: config, isAgentDirty: false }),
  setConfigPath: (location) => set({ configPath: location }),
  setAgentConfigPath: (location) => set({ agentConfigPath: location }),

  updateOpenCodeField: (path, value) => {
    const config = get().openCodeConfig
    if (!config) return
    const updated = setNestedValue({ ...config }, path, value)
    set({ openCodeConfig: updated as OpenCodeConfig, isDirty: true })
  },

  updateAgentField: (path, value) => {
    const config = get().agentConfig
    if (!config) return
    const updated = setNestedValue({ ...config }, path, value)
    set({ agentConfig: updated as AgentPluginConfig, isAgentDirty: true })
  },

  setDirty: (dirty) => set({ isDirty: dirty }),
  setAgentDirty: (dirty) => set({ isAgentDirty: dirty }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ lastError: error }),
  resetChanges: () => set({ isDirty: false, isAgentDirty: false })
}))

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current[key] = { ...(current[key] as Record<string, unknown>) }
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
  return obj
}
