import { readFile, writeFile, readdir, stat, access } from 'fs/promises'
import { existsSync, mkdirSync, createWriteStream, createReadStream } from 'fs'
import { join, basename, dirname, relative } from 'path'
import { homedir } from 'os'
import archiver from 'archiver'
import extractZip from 'extract-zip'

export interface BundleManifest {
  version: string
  exportedAt: string
  appVersion: string
  platform: string
  contents: {
    settings: boolean
    openCodeConfig: boolean
    agentConfig: boolean
    skills: boolean
    mcpConfig: boolean
  }
}

export interface BundleExportOptions {
  outputPath: string
  includeSettings: boolean
  includeOpenCodeConfig: boolean
  includeAgentConfig: boolean
  includeSkills: boolean
  includeMcpConfig: boolean
  appSettings?: Record<string, unknown>
}

export interface BundleImportResult {
  success: boolean
  message: string
  imported: string[]
  errors: string[]
}

function getConfigDir(): string {
  return join(homedir(), '.config', 'opencode')
}

export async function exportBundle(options: BundleExportOptions): Promise<{ success: boolean; message: string; path: string }> {
  const configDir = getConfigDir()

  return new Promise((resolve) => {
    const output = createWriteStream(options.outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      resolve({ success: true, message: `Bundle exported (${archive.pointer()} bytes)`, path: options.outputPath })
    })

    archive.on('error', (err) => {
      resolve({ success: false, message: err.message, path: '' })
    })

    archive.pipe(output)

    // Manifest
    const manifest: BundleManifest = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appVersion: '1.1.0',
      platform: process.platform,
      contents: {
        settings: options.includeSettings,
        openCodeConfig: options.includeOpenCodeConfig,
        agentConfig: options.includeAgentConfig,
        skills: options.includeSkills,
        mcpConfig: options.includeMcpConfig
      }
    }
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

    // App settings (from renderer localStorage — passed as parameter)
    if (options.includeSettings && options.appSettings) {
      archive.append(JSON.stringify(options.appSettings, null, 2), { name: 'settings/app-settings.json' })
    }

    // OpenCode config
    if (options.includeOpenCodeConfig) {
      const candidates = ['opencode.json', 'opencode.jsonc']
      for (const file of candidates) {
        const filePath = join(configDir, file)
        if (existsSync(filePath)) {
          archive.file(filePath, { name: `config/${file}` })
        }
      }
    }

    // Agent config
    if (options.includeAgentConfig) {
      const candidates = ['oh-my-openagent.json', 'oh-my-openagent.jsonc', 'oh-my-opencode.json', 'oh-my-opencode.jsonc']
      for (const file of candidates) {
        const filePath = join(configDir, file)
        if (existsSync(filePath)) {
          archive.file(filePath, { name: `config/${file}` })
        }
      }
    }

    // Skills
    if (options.includeSkills) {
      const skillDir = join(configDir, 'skills')
      if (existsSync(skillDir)) {
        archive.directory(skillDir, 'skills')
      }
    }

    // MCP config (part of opencode config, but also check for standalone mcp.json)
    if (options.includeMcpConfig) {
      const mcpCandidates = ['mcp.json', 'mcp.jsonc']
      for (const file of mcpCandidates) {
        const filePath = join(configDir, file)
        if (existsSync(filePath)) {
          archive.file(filePath, { name: `mcp/${file}` })
        }
      }
    }

    archive.finalize()
  })
}

export async function importBundle(zipPath: string, targetDir?: string): Promise<BundleImportResult> {
  const configDir = targetDir || getConfigDir()
  const tempDir = join(configDir, '.bundle-import-temp')
  const imported: string[] = []
  const errors: string[] = []

  try {
    // Extract to temp
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })
    await extractZip(zipPath, { dir: tempDir })

    // Read manifest
    const manifestPath = join(tempDir, 'manifest.json')
    if (!existsSync(manifestPath)) {
      return { success: false, message: 'Invalid bundle: manifest.json not found', imported: [], errors: [] }
    }
    const manifest: BundleManifest = JSON.parse(await readFile(manifestPath, 'utf-8'))

    // Import configs
    const configSrc = join(tempDir, 'config')
    if (existsSync(configSrc)) {
      const files = await readdir(configSrc)
      for (const file of files) {
        try {
          const src = join(configSrc, file)
          const dest = join(configDir, file)
          const content = await readFile(src, 'utf-8')
          if (!existsSync(dirname(dest))) mkdirSync(dirname(dest), { recursive: true })
          await writeFile(dest, content, 'utf-8')
          imported.push(`config/${file}`)
        } catch (e: unknown) {
          errors.push(`Failed to import ${file}: ${e instanceof Error ? e.message : 'unknown'}`)
        }
      }
    }

    // Import skills
    const skillsSrc = join(tempDir, 'skills')
    if (existsSync(skillsSrc)) {
      const skillDir = join(configDir, 'skills')
      if (!existsSync(skillDir)) mkdirSync(skillDir, { recursive: true })
      await copyDirRecursive(skillsSrc, skillDir, imported, errors)
    }

    // Import MCP
    const mcpSrc = join(tempDir, 'mcp')
    if (existsSync(mcpSrc)) {
      const files = await readdir(mcpSrc)
      for (const file of files) {
        try {
          const src = join(mcpSrc, file)
          const dest = join(configDir, file)
          const content = await readFile(src, 'utf-8')
          await writeFile(dest, content, 'utf-8')
          imported.push(`mcp/${file}`)
        } catch (e: unknown) {
          errors.push(`Failed to import MCP ${file}: ${e instanceof Error ? e.message : 'unknown'}`)
        }
      }
    }

    // Import app settings (return as data, renderer will apply)
    const settingsPath = join(tempDir, 'settings', 'app-settings.json')
    if (existsSync(settingsPath)) {
      imported.push('settings/app-settings.json')
    }

    // Cleanup temp
    await cleanupDir(tempDir)

    return { success: true, message: `Imported ${imported.length} items`, imported, errors }
  } catch (e: unknown) {
    await cleanupDir(tempDir).catch(() => {})
    return { success: false, message: e instanceof Error ? e.message : 'Import failed', imported, errors }
  }
}

export async function previewBundle(zipPath: string): Promise<{ manifest: BundleManifest | null; files: string[] }> {
  const tempDir = join(homedir(), '.config', 'opencode', '.bundle-preview-temp')
  try {
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })
    await extractZip(zipPath, { dir: tempDir })

    const manifestPath = join(tempDir, 'manifest.json')
    let manifest: BundleManifest | null = null
    if (existsSync(manifestPath)) {
      manifest = JSON.parse(await readFile(manifestPath, 'utf-8'))
    }

    const files = await listFilesRecursive(tempDir)
    const relativeFiles = files.map((f) => relative(tempDir, f)).filter((f) => f !== 'manifest.json')

    await cleanupDir(tempDir)
    return { manifest, files: relativeFiles }
  } catch (e: unknown) {
    await cleanupDir(tempDir).catch(() => {})
    return { manifest: null, files: [] }
  }
}

async function copyDirRecursive(src: string, dest: string, imported: string[], errors: string[]): Promise<void> {
  const entries = await readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true })
      await copyDirRecursive(srcPath, destPath, imported, errors)
    } else {
      try {
        const content = await readFile(srcPath, 'utf-8')
        await writeFile(destPath, content, 'utf-8')
        imported.push(`skills/${entry.name}`)
      } catch (e: unknown) {
        errors.push(`Failed to copy ${entry.name}: ${e instanceof Error ? e.message : 'unknown'}`)
      }
    }
  }
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

async function cleanupDir(dir: string): Promise<void> {
  const { rm } = await import('fs/promises')
  await rm(dir, { recursive: true, force: true })
}
