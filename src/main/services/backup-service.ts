import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { readFile, readdir, stat, copyFile } from 'fs/promises'
import { join, basename, dirname } from 'path'

function getBackupDir(baseDir: string): string {
  const now = new Date()
  const dateFolder = now.toISOString().slice(0, 10)
  const timeFolder = now.toTimeString().slice(0, 8).replace(/:/g, '-')
  const bakDir = join(baseDir, 'bak', dateFolder, timeFolder)
  if (!existsSync(bakDir)) {
    mkdirSync(bakDir, { recursive: true })
  }
  return bakDir
}
import archiver from 'archiver'
import extractZip from 'extract-zip'
import type { BackupInfo } from '@shared/types/app-types'

export async function createBackup(configPaths: string[], outputPath: string): Promise<string> {
  const dir = dirname(outputPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve(outputPath))
    archive.on('error', reject)
    archive.pipe(output)

    // Add metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0',
      files: configPaths
    }
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' })

    // Add config files
    for (const fp of configPaths) {
      if (existsSync(fp)) {
        archive.file(fp, { name: basename(fp) })
      }
    }

    archive.finalize()
  })
}

export async function restoreBackup(
  zipPath: string,
  targetDir: string
): Promise<{ restored: string[]; skipped: string[] }> {
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })

  const tempDir = join(targetDir, '.backup-restore-temp')
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

  await extractZip(zipPath, { dir: tempDir })

  const restored: string[] = []
  const skipped: string[] = []
  const entries = await readdir(tempDir)

  for (const entry of entries) {
    if (entry === 'metadata.json') continue
    const src = join(tempDir, entry)
    const dest = join(targetDir, entry)

    // Backup existing before overwrite — save to bak/ subfolder
    if (existsSync(dest)) {
      const bakDir = getBackupDir(targetDir)
      await copyFile(dest, join(bakDir, entry))
    }

    await copyFile(src, dest)
    restored.push(entry)
  }

  // Cleanup temp
  const { rm } = await import('fs/promises')
  await rm(tempDir, { recursive: true, force: true })

  return { restored, skipped }
}

export async function listBackups(backupDir: string): Promise<BackupInfo[]> {
  if (!existsSync(backupDir)) return []
  const entries = await readdir(backupDir)
  const backups: BackupInfo[] = []

  for (const entry of entries) {
    if (!entry.endsWith('.zip')) continue
    const fp = join(backupDir, entry)
    const s = await stat(fp)
    backups.push({
      path: fp,
      date: s.mtime.toISOString(),
      size: s.size,
      fileCount: 0 // Would need to read zip to count
    })
  }

  return backups.sort((a, b) => b.date.localeCompare(a.date))
}

export async function previewBackup(zipPath: string): Promise<string[]> {
  const tempDir = join(dirname(zipPath), '.backup-preview-temp')
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

  await extractZip(zipPath, { dir: tempDir })
  const entries = await readdir(tempDir)
  const files = entries.filter((e) => e !== 'metadata.json')

  const { rm } = await import('fs/promises')
  await rm(tempDir, { recursive: true, force: true })

  return files
}
