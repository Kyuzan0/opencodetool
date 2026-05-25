export interface TrendingMcp {
  name: string
  packageName: string
  description: string
  command: string
  args: string[]
  env?: Record<string, string>
  category: string
  stars?: number
  verified?: boolean
}

export interface McpInstallRequest {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  configPath: string
}

export interface McpInstallResult {
  success: boolean
  name: string
  message?: string
}

export interface McpListEntry {
  name: string
  type?: 'local' | 'remote'
  /** Local MCP: command array (e.g. ["npx", "-y", "package"]) */
  command?: string[]
  /** Remote MCP: URL endpoint */
  url?: string
  /** Remote MCP: custom headers */
  headers?: Record<string, string>
  /** Remote MCP: timeout in ms */
  timeout?: number
  /** Environment variables */
  env?: Record<string, string>
  disabled?: boolean
  /** Whether this MCP is managed by a plugin (read-only from user config perspective) */
  source?: 'config' | 'plugin'
}
