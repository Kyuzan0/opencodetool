import { readFile, writeFile, unlink, readdir, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename, extname } from 'path'
import { homedir } from 'os'
import type { SkillInfo } from '@shared/types/app-types'

/**
 * Detect a directory-based skill (e.g. GitHub repo with skill.json or README.md)
 */
async function detectDirectorySkill(dirPath: string, dirName: string): Promise<SkillInfo | null> {
  // Check for skill.json first
  const skillJsonPath = join(dirPath, 'skill.json')
  if (existsSync(skillJsonPath)) {
    try {
      const raw = await readFile(skillJsonPath, 'utf-8')
      const meta = JSON.parse(raw)
      return {
        name: dirName,
        path: dirPath,
        description: meta.displayName || meta.description || dirName,
        priority: 0,
        content: `[Directory skill] ${meta.displayName || dirName}\n${meta.description || ''}\nVersion: ${meta.version || 'unknown'}`
      }
    } catch {
      // Invalid skill.json, fall through
    }
  }

  // Check for README.md
  const readmePath = join(dirPath, 'README.md')
  if (existsSync(readmePath)) {
    try {
      const content = await readFile(readmePath, 'utf-8')
      const firstLine = content.split('\n').find((l) => l.trim().length > 0) || ''
      const description = firstLine.replace(/^#+\s*/, '').trim()
      return {
        name: dirName,
        path: dirPath,
        description: description || dirName,
        priority: 0,
        content: content
      }
    } catch {
      // Can't read README
    }
  }

  // Check for any .md file inside
  try {
    const entries = await readdir(dirPath)
    const mdFile = entries.find((e) => extname(e) === '.md')
    if (mdFile) {
      const mdPath = join(dirPath, mdFile)
      const content = await readFile(mdPath, 'utf-8')
      const firstLine = content.split('\n').find((l) => l.trim().length > 0) || ''
      const description = firstLine.replace(/^#+\s*/, '').trim()
      return {
        name: dirName,
        path: dirPath,
        description: description || dirName,
        priority: 0,
        content: content
      }
    }
  } catch {
    // Skip
  }

  return null
}

export async function listSkills(skillDir: string): Promise<SkillInfo[]> {
  const skills: SkillInfo[] = []
  const dirs = [skillDir]

  // Also check global skill dirs
  const globalDirs = [
    join(homedir(), '.config', 'opencode', 'skills'),
    join(homedir(), '.config', 'kilo', 'skill')
  ]
  for (const d of globalDirs) {
    if (existsSync(d) && !dirs.includes(d)) dirs.push(d)
  }

  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    try {
      const entries = await readdir(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const s = await stat(fullPath)
        if (s.isFile() && extname(entry) === '.md') {
          // Single .md skill file
          const content = await readFile(fullPath, 'utf-8')
          const firstLine = content.split('\n').find((l) => l.trim().length > 0) || ''
          const description = firstLine.replace(/^#+\s*/, '').trim()
          skills.push({
            name: basename(entry, '.md'),
            path: fullPath,
            description,
            priority: skills.length,
            content
          })
        } else if (s.isDirectory()) {
          // Directory-based skill (e.g. installed from GitHub)
          const dirSkill = await detectDirectorySkill(fullPath, entry)
          if (dirSkill) {
            skills.push({ ...dirSkill, priority: skills.length })
          }
        }
      }
    } catch {
      // Skip inaccessible dirs
    }
  }

  return skills
}

function validateSkillPath(filePath: string): void {
  const resolved = require('path').resolve(filePath)
  const home = homedir()
  const allowedPrefixes = [
    join(home, '.config', 'opencode'),
    join(home, '.config', 'kilo'),
    join(home, '.opencode')
  ]
  const isAllowed = allowedPrefixes.some((p) => resolved.startsWith(p)) ||
    (resolved.includes('.opencode') && (extname(resolved) === '.md' || existsSync(resolved)))
  if (!isAllowed) {
    throw new Error(`Access denied: path "${filePath}" is outside allowed skill directories`)
  }
}

export async function readSkill(filePath: string): Promise<string> {
  validateSkillPath(filePath)
  return readFile(filePath, 'utf-8')
}

export async function writeSkill(filePath: string, content: string): Promise<void> {
  validateSkillPath(filePath)
  await writeFile(filePath, content, 'utf-8')
}

export async function deleteSkill(filePath: string): Promise<void> {
  validateSkillPath(filePath)
  await unlink(filePath)
}

export async function createSkill(
  dir: string,
  name: string,
  content: string
): Promise<string> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const filePath = join(dir, `${name}.md`)
  await writeFile(filePath, content, 'utf-8')
  return filePath
}
