import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

export interface ConfigTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  openCodeConfig: Record<string, unknown>
  agentConfig?: Record<string, unknown>
}

export const BUILTIN_TEMPLATES: ConfigTemplate[] = [
  {
    id: 'code-review',
    name: 'Code Review Assistant',
    description: 'Optimized for code review with read-only permissions and high-quality models',
    icon: '📝',
    category: 'Development',
    openCodeConfig: {
      $schema: 'https://opencode.ai/config.json',
      permission: { bash: 'deny', read: 'allow', edit: 'deny', glob: 'allow', grep: 'allow' },
      model: '',
      plugin: [],
      compaction: { auto: true, prune: false }
    },
    agentConfig: {
      categories: {
        deep: { model: '' },
        quick: { model: '' }
      }
    }
  },
  {
    id: 'full-stack-dev',
    name: 'Full Stack Developer',
    description: 'Full permissions for active development with bash, edit, and read access',
    icon: '🚀',
    category: 'Development',
    openCodeConfig: {
      $schema: 'https://opencode.ai/config.json',
      permission: { bash: 'allow', read: 'allow', edit: 'allow', glob: 'allow', grep: 'allow', skill: 'allow', task: 'allow' },
      model: '',
      plugin: ['oh-my-openagent'],
      compaction: { auto: true, prune: false }
    },
    agentConfig: {
      categories: {
        'visual-engineering': { model: '' },
        ultrabrain: { model: '' },
        deep: { model: '' },
        artistry: { model: '' },
        quick: { model: '' },
        'unspecified-low': { model: '' },
        'unspecified-high': { model: '' },
        writing: { model: '' }
      }
    }
  },
  {
    id: 'cautious',
    name: 'Cautious Mode',
    description: 'Ask permission for everything — ideal for learning or sensitive codebases',
    icon: '🛡️',
    category: 'Safety',
    openCodeConfig: {
      $schema: 'https://opencode.ai/config.json',
      permission: { bash: 'ask', read: 'ask', edit: 'ask', glob: 'allow', grep: 'allow', skill: 'ask', task: 'ask' },
      model: '',
      plugin: [],
      compaction: { auto: true, prune: false }
    }
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Configured for data analysis with bash access for running scripts and notebooks',
    icon: '🔬',
    category: 'Specialized',
    openCodeConfig: {
      $schema: 'https://opencode.ai/config.json',
      permission: { bash: 'allow', read: 'allow', edit: 'allow', glob: 'allow', grep: 'allow' },
      model: '',
      plugin: [],
      compaction: { auto: true, prune: true }
    }
  },
  {
    id: 'minimal',
    name: 'Minimal / Custom',
    description: 'Bare minimum config — start from scratch and configure everything yourself',
    icon: '⚡',
    category: 'Basic',
    openCodeConfig: {
      $schema: 'https://opencode.ai/config.json',
      permission: { bash: 'ask', read: 'allow', edit: 'ask' },
      model: '',
      plugin: [],
      compaction: { auto: true, prune: false }
    }
  }
]

export function getTemplates(): ConfigTemplate[] {
  return BUILTIN_TEMPLATES
}

export async function applyTemplate(
  templateId: string,
  configPath: string,
  agentConfigPath?: string
): Promise<{ success: boolean; message: string }> {
  const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    return { success: false, message: `Template "${templateId}" not found` }
  }

  try {
    // Write opencode config
    const dir = dirname(configPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    await writeFile(configPath, JSON.stringify(template.openCodeConfig, null, 2) + '\n', 'utf-8')

    // Write agent config if template has one and path is provided
    if (template.agentConfig && agentConfigPath) {
      const agentDir = dirname(agentConfigPath)
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true })
      await writeFile(agentConfigPath, JSON.stringify(template.agentConfig, null, 2) + '\n', 'utf-8')
    }

    return { success: true, message: `Template "${template.name}" applied successfully` }
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : 'Failed to apply template' }
  }
}
