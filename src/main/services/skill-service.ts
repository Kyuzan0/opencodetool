import { readFile, writeFile, unlink, readdir, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename, extname } from 'path'
import { homedir } from 'os'
import type { SkillInfo } from '@shared/types/app-types'

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
        }
      }
    } catch {
      // Skip inaccessible dirs
    }
  }

  return skills
}

export async function readSkill(filePath: string): Promise<string> {
  return readFile(filePath, 'utf-8')
}

export async function writeSkill(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8')
}

export async function deleteSkill(filePath: string): Promise<void> {
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
