export interface AppSettings {
  theme: 'dark' | 'light'
  language: string
  defaultConfigPath: string
  recentProjects: string[]
  preferredShell: string
  bunPath: string
}

export interface ConfigLocation {
  type: 'global' | 'project'
  path: string
  exists: boolean
  format: 'json' | 'jsonc'
  lastModified?: string
}

export interface PluginInfo {
  name: string
  version: string
  enabled: boolean
  installed: boolean
}

export interface SkillInfo {
  name: string
  path: string
  description: string
  priority: number
  content?: string
}

export interface ShellInfo {
  name: string
  path: string
  available: boolean
}

export interface ProjectInfo {
  path: string
  name: string
  hasOpenCodeConfig: boolean
  hasAgentConfig: boolean
}

export interface BackupInfo {
  path: string
  date: string
  size: number
  fileCount: number
}

export interface OpenCodeRuntimeStatus {
  mode: 'cli' | 'web'
  running: boolean
  pid: number | null
  startedAt: string | null
  port: number | null
  command: string | null
  args: string[]
  error: string | null
}

export interface OpenCodeRuntimeOverview {
  cli: OpenCodeRuntimeStatus
  web: OpenCodeRuntimeStatus
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export interface Modal {
  id: string
  title: string
  content?: string
  onConfirm?: () => void
  onCancel?: () => void
}
