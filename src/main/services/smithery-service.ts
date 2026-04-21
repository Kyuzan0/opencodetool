import { net } from 'electron'
import type { SmitherySkill, SmitheryListResponse } from '@shared/types/smithery-types'

const API_BASE = 'https://api.smithery.ai'

function fetchJsonOnce<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
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
        } catch (e) {
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

async function fetchJson<T>(url: string, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchJsonOnce<T>(url)
    } catch (e: unknown) {
      if (attempt === retries) throw e
      // Wait before retry (500ms, 1500ms)
      await new Promise((r) => setTimeout(r, 500 + attempt * 1000))
    }
  }
  throw new Error(`Failed after ${retries + 1} attempts: ${url}`)
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
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

export async function listSmitherySkills(
  namespace: string,
  page: number = 1
): Promise<SmitheryListResponse> {
  const url = `${API_BASE}/skills?namespace=${encodeURIComponent(namespace)}&page=${page}`
  return fetchJson<SmitheryListResponse>(url)
}

export async function listAllSmitherySkills(
  namespace: string
): Promise<SmitherySkill[]> {
  const first = await listSmitherySkills(namespace, 1)
  const allSkills = [...first.skills]
  const totalPages = first.pagination.totalPages

  if (totalPages > 1) {
    const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
    const results = await Promise.allSettled(
      remaining.map((p) => listSmitherySkills(namespace, p))
    )
    for (const res of results) {
      if (res.status === 'fulfilled') {
        allSkills.push(...res.value.skills)
      } else {
        console.warn(`Smithery: failed to fetch page — ${res.reason}`)
      }
    }
  }

  // Deduplicate by skill id (API may return duplicates across pages)
  const seen = new Set<string>()
  return allSkills.filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
}

export async function getSmitherySkill(
  namespace: string,
  slug: string
): Promise<SmitherySkill> {
  const url = `${API_BASE}/skills/${encodeURIComponent(namespace)}/${encodeURIComponent(slug)}`
  return fetchJson<SmitherySkill>(url)
}

export async function fetchSkillContent(gitUrl: string): Promise<string> {
  // gitUrl is like https://github.com/user/repo/tree/main/path/to/skill
  // We need to convert to raw.githubusercontent.com URL for SKILL.md
  const rawUrl = convertGitUrlToRaw(gitUrl)
  return fetchText(rawUrl)
}

function convertGitUrlToRaw(gitUrl: string): string {
  // Handle various GitHub URL formats:
  // https://github.com/user/repo/tree/main/path → https://raw.githubusercontent.com/user/repo/main/path/SKILL.md
  // https://github.com/user/repo → https://raw.githubusercontent.com/user/repo/main/SKILL.md
  try {
    const url = new URL(gitUrl)
    const parts = url.pathname.split('/').filter(Boolean)

    if (parts.length < 2) {
      throw new Error(`Invalid GitHub URL: ${gitUrl}`)
    }

    const owner = parts[0]
    const repo = parts[1]

    // Check if URL has /tree/branch/path format
    if (parts[2] === 'tree' && parts.length >= 4) {
      const branch = parts[3]
      const path = parts.slice(4).join('/')
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}/SKILL.md`
    }

    // Default: assume main branch, root SKILL.md
    return `https://raw.githubusercontent.com/${owner}/${repo}/main/SKILL.md`
  } catch (e) {
    throw new Error(`Failed to parse git URL "${gitUrl}": ${e}`)
  }
}
