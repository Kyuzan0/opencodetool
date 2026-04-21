import { app } from 'electron'
import { createWriteStream, existsSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import https from 'https'
import http from 'http'
import type { UpdateInfo, UpdateCheckResult, UpdateDownloadResult, UpdateInstallResult } from '../../shared/types'

const GITHUB_OWNER = 'Kyuzan0'
const GITHUB_REPO = 'opencodetool'
const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

let downloadAbortController: AbortController | null = null

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

function getCurrentVersion(): string {
  return app.getVersion()
}

function isPortable(): boolean {
  // Portable exe runs from a standalone path (not inside Program Files / AppData install dirs)
  const exePath = process.execPath
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const localAppData = process.env['LOCALAPPDATA'] || ''

  return (
    !exePath.startsWith(programFiles) &&
    !exePath.startsWith(programFilesX86) &&
    !exePath.startsWith(localAppData)
  )
}

function httpsGet(url: string): Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { headers: { 'User-Agent': 'OpenCode-Manager' } }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location).then(resolve).catch(reject)
        return
      }

      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers as Record<string, string | string[] | undefined>,
          body
        })
      })
    })
    req.on('error', reject)
    req.end()
  })
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const response = await httpsGet(RELEASES_API)

    if (response.statusCode !== 200) {
      return { hasUpdate: false, error: `GitHub API returned ${response.statusCode}` }
    }

    const release = JSON.parse(response.body) as {
      tag_name: string
      html_url: string
      body: string
      published_at: string
      assets: Array<{ name: string; browser_download_url: string }>
    }

    const latestVersion = release.tag_name.replace(/^v/, '')
    const currentVersion = getCurrentVersion()
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    // Find the NSIS setup exe (not portable)
    const setupAsset = release.assets.find(
      (a) => a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe')
    )

    const downloadUrl = setupAsset?.browser_download_url || ''

    const info: UpdateInfo = {
      currentVersion,
      latestVersion,
      hasUpdate,
      releaseUrl: release.html_url,
      downloadUrl,
      releaseNotes: release.body || '',
      publishedAt: release.published_at
    }

    return { hasUpdate, info }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { hasUpdate: false, error: message }
  }
}

export function downloadUpdate(
  downloadUrl: string,
  onProgress: (percent: number, transferred: number, total: number) => void
): Promise<UpdateDownloadResult> {
  return new Promise((resolve) => {
    if (!downloadUrl) {
      resolve({ success: false, error: 'No download URL provided' })
      return
    }

    downloadAbortController = new AbortController()
    const fileName = downloadUrl.split('/').pop() || 'OpenCode-Manager-Setup.exe'
    const filePath = join(tmpdir(), fileName)

    // Clean up any previous download
    if (existsSync(filePath)) {
      try { unlinkSync(filePath) } catch { /* ignore */ }
    }

    const file = createWriteStream(filePath)
    let aborted = false

    function doRequest(url: string): void {
      const client = url.startsWith('https') ? https : http
      const req = client.get(url, { headers: { 'User-Agent': 'OpenCode-Manager' } }, (res) => {
        // Follow redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location)
          return
        }

        if (res.statusCode !== 200) {
          file.close()
          try { unlinkSync(filePath) } catch { /* ignore */ }
          resolve({ success: false, error: `Download failed with status ${res.statusCode}` })
          return
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
        let transferredBytes = 0

        res.on('data', (chunk: Buffer) => {
          if (aborted) return
          transferredBytes += chunk.length
          const percent = totalBytes > 0 ? Math.round((transferredBytes / totalBytes) * 100) : 0
          onProgress(percent, transferredBytes, totalBytes)
        })

        res.pipe(file)

        file.on('finish', () => {
          file.close()
          if (!aborted) {
            resolve({ success: true, filePath })
          }
        })

        file.on('error', (err) => {
          file.close()
          try { unlinkSync(filePath) } catch { /* ignore */ }
          resolve({ success: false, error: err.message })
        })
      })

      req.on('error', (err) => {
        file.close()
        try { unlinkSync(filePath) } catch { /* ignore */ }
        if (!aborted) {
          resolve({ success: false, error: err.message })
        }
      })

      // Wire up abort
      if (downloadAbortController) {
        downloadAbortController.signal.addEventListener('abort', () => {
          aborted = true
          req.destroy()
          file.close()
          try { unlinkSync(filePath) } catch { /* ignore */ }
          resolve({ success: false, error: 'Download cancelled' })
        })
      }
    }

    doRequest(downloadUrl)
  })
}

export function cancelDownload(): void {
  if (downloadAbortController) {
    downloadAbortController.abort()
    downloadAbortController = null
  }
}

export function installUpdate(installerPath: string): UpdateInstallResult {
  try {
    if (!existsSync(installerPath)) {
      return { success: false, error: 'Installer file not found' }
    }

    const portable = isPortable()
    const portableExePath = portable ? process.execPath : null

    // Spawn the NSIS installer with /S (silent) flag
    // Use detached + unref so it survives app.quit()
    const child = spawn(installerPath, ['/S'], {
      detached: true,
      stdio: 'ignore',
      shell: false
    })
    child.unref()

    // If running portable, create a batch script to clean up the old exe after a delay
    if (portable && portableExePath) {
      spawnPortableCleanup(portableExePath)
    }

    // Quit the app so the installer can replace files
    setTimeout(() => {
      app.quit()
    }, 500)

    return { success: true }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, error: message }
  }
}

function spawnPortableCleanup(portableExePath: string): void {
  // Create a batch script that waits, then deletes the old portable exe
  const batContent = [
    '@echo off',
    'timeout /t 5 /nobreak >nul',
    `del /f /q "${portableExePath}"`,
    // Self-delete the batch file
    `del /f /q "%~f0"`
  ].join('\r\n')

  const batPath = join(tmpdir(), 'opencode-manager-cleanup.bat')
  writeFileSync(batPath, batContent, 'utf-8')

  const child = spawn('cmd.exe', ['/c', batPath], {
    detached: true,
    stdio: 'ignore',
    shell: false,
    windowsHide: true
  })
  child.unref()
}
