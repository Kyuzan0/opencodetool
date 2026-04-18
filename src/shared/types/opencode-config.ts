export interface OpenCodeConfig {
  $schema?: string
  plugin?: string[]
  disabled_providers?: string[]
  provider?: Record<string, ProviderConfig>
  permission?: Record<string, PermissionValue>
  model?: string
  small_model?: string
  compaction?: CompactionConfig
  [key: string]: unknown
}

export type PermissionValue = 'allow' | 'ask' | 'deny'

export interface ProviderConfig {
  name: string
  npm?: string
  options?: ProviderOptions
  models?: Record<string, ModelConfig>
  [key: string]: unknown
}

export interface ProviderOptions {
  baseURL?: string
  apiKey?: string
  [key: string]: unknown
}

export interface ModelConfig {
  name: string
  limit?: ModelLimits
  modalities?: ModelModalities
  reasoning?: boolean
  [key: string]: unknown
}

export interface ModelLimits {
  context?: number
  output?: number
}

export interface ModelModalities {
  input?: string[]
  output?: string[]
}

export interface CompactionConfig {
  auto?: boolean
  prune?: boolean
}

export const PERMISSION_KEYS = [
  'bash', 'read', 'glob', 'grep', 'list',
  'external_directory', 'edit', 'skill', 'task'
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]
