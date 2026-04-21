import type { SmitherySkill, GitHubRepoInfo, GitHubSkillInstallResult, ShellInfo } from '../../shared/types'

/**
 * Typed window.api interface matching preload/index.ts exactly.
 * All return types use Promise<unknown> where the actual shape varies,
 * or specific types where known.
 */
export interface ElectronAPI {
  config: {
    read: (filePath: string) => Promise<Record<string, unknown>>
    write: (
      filePath: string,
      data: Record<string, unknown>,
      options: { format: string; preserveComments?: boolean }
    ) => Promise<void | { error: true; message: string }>
    validate: (data: Record<string, unknown>, schema: string) => Promise<unknown>
    locations: () => Promise<
      Array<{ path: string; format: string; type: string; exists: boolean }>
    >
    projectLocations: (projectPath: string) => Promise<
      Array<{ path: string; format: string; type: string; exists: boolean }>
    >
    createDefault: (type: string, path?: string) => Promise<string>
    backup: (filePath: string) => Promise<string>
    openExternal: (filePath: string) => Promise<string>
  }
  pm: {
    detect: () => Promise<{
      bun: { path: string; version: string } | null
      npm: { path: string; version: string } | null
      preferred: string
    }>
    install: (pluginName: string, configDir: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
    uninstall: (pluginName: string, configDir: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
    list: (configDir: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
    detectOpenCode: () => Promise<{ installed: boolean; version?: string; path?: string }>
    detectOpenCodeApp: () => Promise<{ installed: boolean; path?: string }>
    installOpenCode: (pm: 'npm' | 'bun') => Promise<{ stdout: string; stderr: string; exitCode: number }>
  }
  shell: {
    detect: () => Promise<ShellInfo[]>
    default: () => Promise<ShellInfo | null>
  }
  skill: {
    list: (skillDir: string) => Promise<Array<{ name: string; path: string; description?: string; version?: string }>>
    read: (filePath: string) => Promise<string>
    write: (filePath: string, content: string) => Promise<void>
    delete: (filePath: string) => Promise<void>
    create: (dir: string, name: string, content: string) => Promise<string>
  }
  terminal: {
    create: (shellPath: string, cwd?: string) => Promise<string>
    write: (id: string, data: string) => Promise<void>
    resize: (id: string, cols: number, rows: number) => Promise<void>
    destroy: (id: string) => Promise<void>
    onData: (callback: (id: string, data: string) => void) => void
    onExit: (callback: (id: string, code: number | null) => void) => void
    removeListeners: () => void
  }
  backup: {
    create: (configPaths: string[], outputPath: string) => Promise<unknown>
    restore: (zipPath: string, targetDir: string) => Promise<unknown>
    list: (backupDir: string) => Promise<unknown>
    preview: (zipPath: string) => Promise<unknown>
  }
  project: {
    detect: (searchPaths: string[]) => Promise<Array<{ path: string; name: string; hasConfig: boolean }>>
    select: () => Promise<string | null>
    config: (projectPath: string) => Promise<Record<string, unknown>>
  }
  uninstall: {
    scan: () => Promise<unknown>
    perform: (options: {
      cli: boolean
      core: boolean
      plugins: boolean
      mcp: boolean
      skills: boolean
      sessions: boolean
      projectData: boolean
      projectPaths?: string[]
    }) => Promise<unknown>
    desktopCheck: () => Promise<{ found: boolean; path: string; installPath: string }>
    desktopRun: () => Promise<{ success: boolean; message: string }>
  }
  opencode: {
    status: () => Promise<unknown>
    start: (mode: 'cli' | 'web', port?: number, force?: boolean) => Promise<unknown>
    stop: (mode: 'cli' | 'web', port?: number) => Promise<unknown>
    restart: (mode: 'cli' | 'web', port?: number) => Promise<unknown>
  }
  dialog: {
    openFile: (options?: Record<string, unknown>) => Promise<string | null>
    openDirectory: () => Promise<string | null>
    saveFile: (options?: Record<string, unknown>) => Promise<string | null>
  }
  githubSkill: {
    info: (url: string) => Promise<GitHubRepoInfo>
    install: (url: string, skillDir: string) => Promise<GitHubSkillInstallResult>
  }
  smithery: {
    list: (namespace: string) => Promise<SmitherySkill[]>
    get: (namespace: string, slug: string) => Promise<SmitherySkill>
    fetchContent: (gitUrl: string) => Promise<string>
    install: (skillDir: string, name: string, gitUrl: string) => Promise<{ filePath: string; content: string }>
  }
  fileWatcher: {
    watch: (filePath: string) => Promise<void>
    unwatch: (filePath: string) => Promise<void>
    onChanged: (callback: (filePath: string) => void) => void
    removeListeners: () => void
  }
}

export interface ElectronWindow {
  platform: string
  process: {
    versions: {
      node: string
      chrome: string
      electron: string
    }
  }
}

declare global {
  interface Window {
    api: ElectronAPI
    electron: ElectronWindow
  }
}
