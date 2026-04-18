import type { OpenCodeConfig } from './opencode-config'
import type { AgentPluginConfig } from './agent-config'
import type { ConfigLocation, PluginInfo, SkillInfo, ShellInfo, ProjectInfo, BackupInfo } from './app-types'

// Config IPC
export interface ConfigReadResult {
  data: Record<string, unknown>
  raw: string
  format: 'json' | 'jsonc'
}

export interface ConfigWriteOptions {
  format: 'json' | 'jsonc'
  preserveComments?: boolean
}

export interface ConfigValidationResult {
  valid: boolean
  errors: string[]
}

// Package Manager IPC
export interface PackageManagerInfo {
  bun: { found: boolean; path: string; version: string } | null
  npm: { found: boolean; path: string; version: string }
  preferred: 'bun' | 'npm'
}

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

// IPC Channel Map
export interface IpcChannels {
  // Config
  'config:read': { args: [string]; result: ConfigReadResult }
  'config:write': { args: [string, Record<string, unknown>, ConfigWriteOptions]; result: void }
  'config:validate': { args: [Record<string, unknown>, 'opencode' | 'agent']; result: ConfigValidationResult }
  'config:locations': { args: []; result: ConfigLocation[] }
  'config:create-default': { args: ['opencode' | 'agent', string]; result: void }
  'config:backup': { args: [string]; result: string }

  // Package Manager
  'pm:detect': { args: []; result: PackageManagerInfo }
  'pm:install': { args: [string, string]; result: CommandResult }
  'pm:uninstall': { args: [string, string]; result: CommandResult }
  'pm:list': { args: [string]; result: Record<string, string> }

  // Shell
  'shell:detect': { args: []; result: ShellInfo[] }
  'shell:default': { args: []; result: ShellInfo }

  // Skills
  'skill:list': { args: [string]; result: SkillInfo[] }
  'skill:read': { args: [string]; result: string }
  'skill:write': { args: [string, string]; result: void }
  'skill:delete': { args: [string]; result: void }
  'skill:create': { args: [string, string, string]; result: string }

  // Terminal
  'terminal:create': { args: [ShellInfo, string?]; result: string }
  'terminal:write': { args: [string, string]; result: void }
  'terminal:resize': { args: [string, number, number]; result: void }
  'terminal:destroy': { args: [string]; result: void }

  // Project
  'project:detect': { args: [string[]]; result: ProjectInfo[] }
  'project:select': { args: []; result: string }
  'project:config': { args: [string]; result: { opencode?: OpenCodeConfig; agent?: AgentPluginConfig } }

  // Backup
  'backup:create': { args: [string[], string]; result: string }
  'backup:restore': { args: [string, string]; result: { restored: string[]; skipped: string[] } }
  'backup:list': { args: [string]; result: BackupInfo[] }
  'backup:preview': { args: [string]; result: string[] }

  // Dialog
  'dialog:open-file': { args: [Record<string, unknown>?]; result: string | null }
  'dialog:open-directory': { args: []; result: string | null }
  'dialog:save-file': { args: [Record<string, unknown>?]; result: string | null }
}
