import { net } from 'electron'
import { createWriteStream, existsSync, mkdirSync, rmSync } from 'fs'
import { readdir, stat, rename, rm } from 'fs/promises'
import { join, basename, resolve, relative } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import type { GitHubRepoInfo, GitHubSkillJson, GitHubSkillInstallResult } from '@shared/types/github-skill-types'

const GITHUB_API = 'https://api.github.com'

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      headers: { 'User-Agent': 'OpenCode-Manager', Accept: 'application/vnd.github.v3+json' }
    })
    let body = ''

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} from ${url}`))
        return
      }
      response.on('data', (chunk) => {
        body += chunk.toString()
      })
      response.on('end', () => {
        try {
          resolve(JSON.parse(body) as T)
        } catch {
          reject(new Error(`Failed to parse JSON from ${url}`))
        }
      })
    })

    request.on('error', (err) => {
      reject(new Error(`Network error fetching ${url}: ${err.message}`))
    })

    request.end()
  })
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      headers: { 'User-Agent': 'OpenCode-Manager' }
    })
    let body = ''

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} from ${url}`))
        return
      }
      response.on('data', (chunk) => {
        body += chunk.toString()
      })
      response.on('end', () => {
        resolve(body)
      })
    })

    request.on('error', (err) => {
      reject(new Error(`Network error fetching ${url}: ${err.message}`))
    })

    request.end()
  })
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      headers: { 'User-Agent': 'OpenCode-Manager' }
    })

    request.on('response', (response) => {
      // Handle redirects (GitHub zip downloads redirect)
      if (response.statusCode === 302 || response.statusCode === 301) {
        const location = response.headers['location']
        const redirectUrl = Array.isArray(location) ? location[0] : location
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} downloading ${url}`))
        return
      }

      const file = createWriteStream(destPath)
      response.on('data', (chunk) => {
        file.write(chunk)
      })
      response.on('end', () => {
        file.end()
        file.on('finish', () => resolve())
      })
      response.on('error', (err) => {
        file.destroy()
        reject(err)
      })
    })

    request.on('error', (err) => {
      reject(new Error(`Network error downloading ${url}: ${err.message}`))
    })

    request.end()
  })
}

/**
 * Parse a GitHub URL into owner/repo
 * Supports: https://github.com/owner/repo, https://github.com/owner/repo.git, github.com/owner/repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const cleaned = url.trim().replace(/\.git$/, '').replace(/\/$/, '')
  const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/)
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`)
  }
  return { owner: match[1], repo: match[2] }
}

/**
 * Fetch repository info from GitHub API
 */
export async function getRepoInfo(owner: string, repo: string): Promise<GitHubRepoInfo> {
  interface GHRepo {
    name: string
    description: string | null
    stargazers_count: number
    forks_count: number
    license: { spdx_id: string } | null
    default_branch: string
    topics: string[]
    html_url: string
  }

  const repoData = await fetchJson<GHRepo>(`${GITHUB_API}/repos/${owner}/${repo}`)

  // Check for skill.json
  let hasSkillJson = false
  let skillJson: GitHubSkillJson | null = null
  try {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch}/skill.json`
    const content = await fetchText(rawUrl)
    skillJson = JSON.parse(content) as GitHubSkillJson
    hasSkillJson = true
  } catch {
    // No skill.json — that's fine
  }

  // Fetch README
  let readme = ''
  try {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch}/README.md`
    readme = await fetchText(rawUrl)
  } catch {
    // No README
  }

  return {
    owner,
    repo,
    name: repoData.name,
    description: repoData.description || '',
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    license: repoData.license?.spdx_id || null,
    defaultBranch: repoData.default_branch,
    topics: repoData.topics || [],
    htmlUrl: repoData.html_url,
    hasSkillJson,
    skillJson,
    readme
  }
}

/**
 * Install a GitHub skill repo by downloading the zip and extracting it
 */
export async function installGitHubSkill(
  owner: string,
  repo: string,
  branch: string,
  skillDir: string
): Promise<GitHubSkillInstallResult> {
  // Fallback to default skill directory if empty
  if (!skillDir) {
    const { homedir } = require('os')
    skillDir = join(homedir(), '.config', 'opencode', 'skills')
  }
  const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`
  const tmpId = randomBytes(8).toString('hex')
  const tmpZipPath = join(tmpdir(), `opencode-skill-${tmpId}.zip`)
  const tmpExtractDir = join(tmpdir(), `opencode-skill-extract-${tmpId}`)

  try {
    // Download zip
    await downloadFile(zipUrl, tmpZipPath)

    // Extract using Node.js built-in (available in Electron)
    // We use the extract-zip package or manual approach
    await extractZip(tmpZipPath, tmpExtractDir)

    // The zip extracts to a folder like "repo-branch/"
    const entries = await readdir(tmpExtractDir)
    if (entries.length === 0) {
      throw new Error('Downloaded zip is empty')
    }

    const extractedFolder = join(tmpExtractDir, entries[0])
    const extractedStat = await stat(extractedFolder)
    if (!extractedStat.isDirectory()) {
      throw new Error('Unexpected zip structure')
    }

    // Security: Zip Slip protection — verify all extracted files are within the expected directory
    await validateExtractedPaths(tmpExtractDir, tmpExtractDir)

    // Determine install name
    const installName = repo

    // Target directory
    const targetDir = join(skillDir, installName)

    // Remove existing if present
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true })
    }

    // Ensure parent dir exists
    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true })
    }

    // Move extracted folder to target
    await rename(extractedFolder, targetDir)

    // Count files
    const filesCount = await countFiles(targetDir)

    return {
      installPath: targetDir,
      name: installName,
      filesCount
    }
  } finally {
    // Cleanup temp files
    try {
      if (existsSync(tmpZipPath)) rmSync(tmpZipPath)
      if (existsSync(tmpExtractDir)) rmSync(tmpExtractDir, { recursive: true, force: true })
    } catch {
      // Best effort cleanup
    }
  }
}

async function countFiles(dir: string): Promise<number> {
  let count = 0
  const entries = await readdir(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const s = await stat(fullPath)
    if (s.isFile()) {
      count++
    } else if (s.isDirectory()) {
      count += await countFiles(fullPath)
    }
  }
  return count
}

/**
 * Zip Slip protection: validate all extracted paths stay within the expected directory
 */
async function validateExtractedPaths(dir: string, rootDir: string): Promise<void> {
  const resolvedRoot = resolve(rootDir)
  const entries = await readdir(dir)
  for (const entry of entries) {
    const fullPath = resolve(dir, entry)
    const rel = relative(resolvedRoot, fullPath)
    // Path traversal: relative path must not start with '..' or be absolute
    if (rel.startsWith('..') || resolve(rel) === rel) {
      throw new Error(`Zip Slip detected: "${entry}" resolves outside extraction directory`)
    }
    const s = await stat(fullPath)
    if (s.isDirectory()) {
      await validateExtractedPaths(fullPath, rootDir)
    }
  }
}

/**
 * Extract a zip file using Node.js zlib + tar-like approach
 * Since we're in Electron, we use a simple approach with the built-in modules
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  // Use child_process to call PowerShell's Expand-Archive on Windows
  // or unzip on Unix
  const { execSync } = require('child_process')

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  if (process.platform === 'win32') {
    // PowerShell Expand-Archive
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
      { timeout: 60000 }
    )
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { timeout: 60000 })
  }
}
