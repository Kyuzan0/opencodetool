export interface AgentPluginConfig {
  $schema?: string
  agents?: Record<string, AgentOverride>
  categories?: Record<string, CategoryConfig>
  background_task?: BackgroundTaskConfig
  experimental?: Record<string, boolean>
  tmux?: TmuxConfig
  hooks?: Record<string, HookConfig>
  mcps?: Record<string, McpConfig>
  lsp?: Record<string, LspConfig>
  skills?: Record<string, SkillConfig>
  [key: string]: unknown
}

export interface AgentOverride {
  model?: string
  variant?: AgentVariant
  temperature?: number
  top_p?: number
  prompt_append?: string
  permissions?: AgentPermissions
  [key: string]: unknown
}

export type AgentVariant = 'default' | 'high' | 'low' | 'max'

export interface AgentPermissions {
  edit?: 'ask' | 'allow' | 'deny'
  [key: string]: unknown
}

export interface CategoryConfig {
  model?: string
  variant?: AgentVariant
  temperature?: number
  top_p?: number
  [key: string]: unknown
}

export interface BackgroundTaskConfig {
  defaultConcurrency?: number
  providerConcurrency?: Record<string, number>
  modelConcurrency?: Record<string, number>
  [key: string]: unknown
}

export interface TmuxConfig {
  enabled?: boolean
  [key: string]: unknown
}

export interface HookConfig {
  enabled?: boolean
  [key: string]: unknown
}

export interface McpConfig {
  command?: string
  args?: string[]
  env?: Record<string, string>
  initialization?: Record<string, unknown>
  disabled?: boolean
  [key: string]: unknown
}

export interface LspConfig {
  command?: string
  args?: string[]
  env?: Record<string, string>
  initialization?: Record<string, unknown>
  disabled?: boolean
  [key: string]: unknown
}

export interface SkillConfig {
  enabled?: boolean
  [key: string]: unknown
}

export const BUILTIN_AGENTS = [
  'sisyphus', 'hephaestus', 'oracle', 'librarian', 'explore',
  'atlas', 'prometheus', 'metis', 'momus', 'multimodal-looker', 'sisyphus-junior'
] as const

export type BuiltinAgentName = (typeof BUILTIN_AGENTS)[number]

export const CATEGORIES = [
  'quick', 'visual-engineering', 'ultrabrain', 'artistry',
  'deep', 'unspecified-low', 'unspecified-high', 'writing'
] as const

export type CategoryName = (typeof CATEGORIES)[number]
