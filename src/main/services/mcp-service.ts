import * as fs from 'fs'
import * as path from 'path'
import { parse as parseJsonc, modify, applyEdits } from 'jsonc-parser'
import type { TrendingMcp, McpInstallResult, McpListEntry } from '@shared/types/mcp-types'

/**
 * Curated list of trending/popular MCP servers.
 * These are well-known, community-vetted MCP servers.
 */
const TRENDING_MCPS: TrendingMcp[] = [
  {
    name: 'Playwright',
    packageName: '@playwright/mcp',
    description: 'Browser automation via Playwright — verification, browsing, web scraping, testing, screenshots.',
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest'],
    category: 'Browser',
    verified: true
  },
  {
    name: 'Filesystem',
    packageName: '@modelcontextprotocol/server-filesystem',
    description: 'Read, write, and manage files on the local filesystem with directory listing and search.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem'],
    category: 'Filesystem',
    verified: true
  },
  {
    name: 'GitHub',
    packageName: '@modelcontextprotocol/server-github',
    description: 'Interact with GitHub repositories, issues, pull requests, and more.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_TOKEN: '' },
    category: 'Developer',
    verified: true
  },
  {
    name: 'PostgreSQL',
    packageName: '@modelcontextprotocol/server-postgres',
    description: 'Connect to PostgreSQL databases for querying and schema inspection.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: { POSTGRES_CONNECTION_STRING: '' },
    category: 'Database',
    verified: true
  },
  {
    name: 'Brave Search',
    packageName: '@anthropic/mcp-server-brave-search',
    description: 'Web search powered by Brave Search API for real-time information retrieval.',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-brave-search'],
    env: { BRAVE_API_KEY: '' },
    category: 'Search',
    verified: true
  },
  {
    name: 'Memory',
    packageName: '@modelcontextprotocol/server-memory',
    description: 'Persistent memory storage using a knowledge graph for long-term context.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    category: 'Memory',
    verified: true
  },
  {
    name: 'Fetch',
    packageName: '@modelcontextprotocol/server-fetch',
    description: 'Fetch and convert web content to markdown for easy consumption by AI.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    category: 'Web',
    verified: true
  },
  {
    name: 'SQLite',
    packageName: '@modelcontextprotocol/server-sqlite',
    description: 'Interact with SQLite databases for querying, schema management, and analysis.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
    category: 'Database',
    verified: true
  },
  {
    name: 'Puppeteer',
    packageName: '@modelcontextprotocol/server-puppeteer',
    description: 'Browser automation via Puppeteer for web scraping, screenshots, and testing.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    category: 'Browser',
    verified: true
  },
  {
    name: 'Sequential Thinking',
    packageName: '@modelcontextprotocol/server-sequential-thinking',
    description: 'Dynamic problem-solving through structured sequential thinking and reflection.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    category: 'Reasoning',
    verified: true
  },
  {
    name: 'Slack',
    packageName: '@modelcontextprotocol/server-slack',
    description: 'Interact with Slack workspaces — read messages, post updates, manage channels.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: { SLACK_BOT_TOKEN: '' },
    category: 'Communication',
    verified: true
  },
  {
    name: 'Google Maps',
    packageName: '@modelcontextprotocol/server-google-maps',
    description: 'Access Google Maps for geocoding, directions, place search, and distance calculations.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    env: { GOOGLE_MAPS_API_KEY: '' },
    category: 'Maps',
    verified: true
  }
]

export function getTrendingMcps(): TrendingMcp[] {
  return TRENDING_MCPS
}

export function getInstalledMcps(configPath: string): McpListEntry[] {
  try {
    if (!fs.existsSync(configPath)) return []
    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = parseJsonc(raw)
    // Support both 'mcp' (opencode.json) and 'mcps' (oh-my-openagent.json) keys
    const mcpRecord: Record<string, unknown> = config?.mcp || config?.mcps || {}
    return Object.entries(mcpRecord).map(([name, cfg]) => {
      const entry = cfg as Record<string, unknown>
      const type = entry.type as string | undefined

      if (type === 'remote') {
        return {
          name,
          type: 'remote' as const,
          url: entry.url as string | undefined,
          headers: entry.headers as Record<string, string> | undefined,
          timeout: entry.timeout as number | undefined,
          disabled: entry.disabled as boolean | undefined
        }
      }

      // Local MCP: command can be array or string
      let command: string[] | undefined
      if (Array.isArray(entry.command)) {
        command = entry.command as string[]
      } else if (typeof entry.command === 'string') {
        // Legacy format: command + args separate
        command = [entry.command as string, ...((entry.args as string[]) || [])]
      }

      return {
        name,
        type: 'local' as const,
        command,
        env: entry.env as Record<string, string> | undefined,
        disabled: entry.disabled as boolean | undefined
      }
    })
  } catch {
    return []
  }
}

export function installMcp(
  configPath: string,
  name: string,
  command: string,
  args: string[],
  env?: Record<string, string>
): McpInstallResult {
  try {
    // Ensure config file exists
    if (!fs.existsSync(configPath)) {
      const dir = path.dirname(configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(configPath, '{}', 'utf-8')
    }

    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = parseJsonc(raw)

    // Detect which key the config uses: 'mcp' or 'mcps'
    const mcpKey = config?.mcp ? 'mcp' : config?.mcps ? 'mcps' : 'mcp'

    // Check if already installed
    if (config?.[mcpKey]?.[name]) {
      return { success: false, name, message: `MCP "${name}" is already installed.` }
    }

    // Build the MCP config entry in opencode.json format
    const mcpEntry: Record<string, unknown> = {
      type: 'local',
      command: [command, ...args]
    }
    if (env && Object.keys(env).length > 0) {
      mcpEntry.env = env
    }

    // Use jsonc-parser to modify while preserving comments
    const edits = modify(raw, [mcpKey, name], mcpEntry, {
      formattingOptions: { tabSize: 2, insertSpaces: true }
    })
    const result = applyEdits(raw, edits)
    fs.writeFileSync(configPath, result, 'utf-8')

    return { success: true, name }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, name, message }
  }
}

export function uninstallMcp(configPath: string, name: string): McpInstallResult {
  try {
    if (!fs.existsSync(configPath)) {
      return { success: false, name, message: 'Config file not found.' }
    }

    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = parseJsonc(raw)

    const mcpKey = config?.mcp ? 'mcp' : config?.mcps ? 'mcps' : 'mcp'

    if (!config?.[mcpKey]?.[name]) {
      return { success: false, name, message: `MCP "${name}" is not installed.` }
    }

    // Remove the MCP entry using jsonc-parser
    const edits = modify(raw, [mcpKey, name], undefined, {
      formattingOptions: { tabSize: 2, insertSpaces: true }
    })
    const result = applyEdits(raw, edits)
    fs.writeFileSync(configPath, result, 'utf-8')

    return { success: true, name }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, name, message }
  }
}

export function toggleMcp(configPath: string, name: string, disabled: boolean): McpInstallResult {
  try {
    if (!fs.existsSync(configPath)) {
      return { success: false, name, message: 'Config file not found.' }
    }

    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = parseJsonc(raw)

    const mcpKey = config?.mcp ? 'mcp' : config?.mcps ? 'mcps' : 'mcp'

    if (!config?.[mcpKey]?.[name]) {
      return { success: false, name, message: `MCP "${name}" is not installed.` }
    }

    const edits = modify(raw, [mcpKey, name, 'disabled'], disabled, {
      formattingOptions: { tabSize: 2, insertSpaces: true }
    })
    const result = applyEdits(raw, edits)
    fs.writeFileSync(configPath, result, 'utf-8')

    return { success: true, name }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, name, message }
  }
}

/**
 * Built-in MCPs provided by the oh-my-openagent/oh-my-china plugin.
 * These are hardcoded in the plugin and always available.
 */
const PLUGIN_BUILTIN_MCPS = ['context7', 'grep_app', 'websearch']

/**
 * Get MCPs that are provided by the oh-my-openagent plugin.
 * Reads the plugin config to check disabled_mcps.
 */
export function getPluginMcps(pluginConfigPath: string): McpListEntry[] {
  try {
    let disabledMcps: string[] = []
    if (fs.existsSync(pluginConfigPath)) {
      const raw = fs.readFileSync(pluginConfigPath, 'utf-8')
      const config = parseJsonc(raw)
      disabledMcps = Array.isArray(config?.disabled_mcps) ? config.disabled_mcps : []
    }

    return PLUGIN_BUILTIN_MCPS.map((name) => ({
      name,
      type: 'local' as const,
      disabled: disabledMcps.includes(name),
      source: 'plugin' as const
    }))
  } catch {
    return PLUGIN_BUILTIN_MCPS.map((name) => ({
      name,
      type: 'local' as const,
      disabled: false,
      source: 'plugin' as const
    }))
  }
}

/**
 * Toggle a plugin MCP by adding/removing from disabled_mcps array in oh-my-openagent.json
 */
export function togglePluginMcp(pluginConfigPath: string, name: string, disabled: boolean): McpInstallResult {
  try {
    if (!PLUGIN_BUILTIN_MCPS.includes(name)) {
      return { success: false, name, message: `"${name}" is not a plugin MCP.` }
    }

    if (!fs.existsSync(pluginConfigPath)) {
      return { success: false, name, message: 'Plugin config file not found.' }
    }

    const raw = fs.readFileSync(pluginConfigPath, 'utf-8')
    const config = parseJsonc(raw)
    const currentDisabled: string[] = Array.isArray(config?.disabled_mcps) ? [...config.disabled_mcps] : []

    let newDisabled: string[]
    if (disabled) {
      // Add to disabled list
      if (!currentDisabled.includes(name)) {
        newDisabled = [...currentDisabled, name]
      } else {
        newDisabled = currentDisabled
      }
    } else {
      // Remove from disabled list
      newDisabled = currentDisabled.filter((n) => n !== name)
    }

    const edits = modify(raw, ['disabled_mcps'], newDisabled, {
      formattingOptions: { tabSize: 2, insertSpaces: true }
    })
    const result = applyEdits(raw, edits)
    fs.writeFileSync(pluginConfigPath, result, 'utf-8')

    return { success: true, name }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, name, message }
  }
}
