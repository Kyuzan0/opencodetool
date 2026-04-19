import { useState, useEffect } from 'react'
import { useSkillStore, useSettingsStore } from '../stores'
import { Card, TextInput, TextArea, Button, Modal } from '../components/ui'
import { Plus, Trash2, Save, FileText, GripVertical, Copy } from 'lucide-react'
import type { SkillInfo } from '@shared/types'

export default function SkillsPage(): JSX.Element {
  const { skills, selectedSkill, setSkills, setSelectedSkill, setLoading, addSkill, removeSkill, reorderSkills } = useSkillStore()
  const { defaultConfigPath } = useSettingsStore()
  const [editContent, setEditContent] = useState('')
  const [editDirty, setEditDirty] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('# New Skill\n\nSkill description here...\n')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)

  useEffect(() => { loadSkills() }, [])

  useEffect(() => {
    if (selectedSkill?.content !== undefined) {
      setEditContent(selectedSkill.content || '')
      setEditDirty(false)
    }
  }, [selectedSkill])

  async function loadSkills(): Promise<void> {
    setLoading(true)
    try {
      const skillDir = defaultConfigPath
        ? `${defaultConfigPath}/.opencode/skills`
        : ''
      const result = await window.api.skill.list(skillDir || '')
      setSkills(result)
      if (result.length > 0 && !selectedSkill) {
        setSelectedSkill(result[0])
      }
    } catch (e) {
      console.error('Failed to load skills:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(): Promise<void> {
    if (!selectedSkill) return
    setSaveLoading(true)
    try {
      await window.api.skill.write(selectedSkill.path, editContent)
      const updated = { ...selectedSkill, content: editContent }
      setSelectedSkill(updated)
      setEditDirty(false)
    } catch (e: any) {
      console.error('Failed to save skill:', e)
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleCreate(): Promise<void> {
    if (!newName.trim()) return
    try {
      const skillDir = defaultConfigPath
        ? `${defaultConfigPath}/.opencode/skills`
        : `${process.env.USERPROFILE || ''}/.config/opencode/skills`
      const path = await window.api.skill.create(skillDir, newName.trim(), newContent)
      const newSkill: SkillInfo = {
        name: newName.trim(),
        path,
        description: newContent.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '') || '',
        priority: skills.length,
        content: newContent
      }
      addSkill(newSkill)
      setSelectedSkill(newSkill)
      setNewName('')
      setNewContent('# New Skill\n\nSkill description here...\n')
      setCreateOpen(false)
    } catch (e: any) {
      console.error('Failed to create skill:', e)
    }
  }

  async function handleDelete(name: string): Promise<void> {
    setConfirmDelete(null)
    const skill = skills.find((s) => s.name === name)
    if (!skill) return
    try {
      await window.api.skill.delete(skill.path)
      removeSkill(name)
      if (selectedSkill?.name === name) {
        const remaining = skills.filter((s) => s.name !== name)
        setSelectedSkill(remaining[0] || null)
      }
    } catch (e: any) {
      console.error('Failed to delete skill:', e)
    }
  }

  function handleDuplicate(): void {
    if (!selectedSkill) return
    setNewName(`${selectedSkill.name}-copy`)
    setNewContent(editContent || selectedSkill.content || '')
    setCreateOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-themed">Skill Manager</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleDuplicate} disabled={!selectedSkill}>
            <Copy size={16} /> Duplicate
          </Button>
          <Button variant="secondary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New Skill
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 min-h-[500px]">
        {/* Skill List */}
        <div className="w-full md:w-64 md:shrink-0 space-y-1 overflow-auto rounded-xl border border-[var(--color-border-subtle)] bg-surface/20 p-2 max-h-64 md:max-h-none">
          {skills.length === 0 && (
            <p className="p-4 text-center text-sm text-themed-muted">No skills found</p>
          )}
          {skills.map((skill, i) => (
            <div
              key={skill.name}
              onClick={() => {
                if (editDirty && selectedSkill) {
                  if (!confirm('Discard unsaved changes?')) return
                }
                setSelectedSkill(skill)
              }}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                selectedSkill?.name === skill.name
                  ? 'bg-accent/[0.08] text-accent'
                  : 'text-themed-secondary hover:bg-surface/40 hover:text-themed'
              }`}
            >
              <GripVertical size={14} className="text-themed-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[13px]">{skill.name}</div>
                <div className="truncate text-xs text-themed-muted">{skill.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Skill Editor */}
        <div className="flex-1 space-y-3">
          {selectedSkill ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-themed">{selectedSkill.name}</h2>
                  <p className="font-mono text-[11px] text-themed-muted" title={selectedSkill.path}>{selectedSkill.path}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditContent(selectedSkill.content || '')
                      setEditDirty(false)
                    }}
                    disabled={!editDirty}
                  >
                    Discard
                  </Button>
                  <Button onClick={handleSave} disabled={!editDirty} loading={saveLoading}>
                    <Save size={16} /> Save
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmDelete(selectedSkill.name)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <TextArea
                value={editContent}
                onChange={(v) => { setEditContent(v); setEditDirty(true) }}
                monospace
                rows={20}
                className="flex-1"
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-themed-muted">
              <div className="text-center">
                <FileText size={40} className="mx-auto mb-4 text-themed-muted opacity-50" />
                <p>Select a skill to edit or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Skill"
        actions={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <TextInput label="Skill Name" value={newName} onChange={setNewName} placeholder="e.g. my-custom-skill" />
          <TextArea label="Initial Content" value={newContent} onChange={setNewContent} monospace rows={6} />
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Skill"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</Button>
          </>
        }
      >
        <p>Are you sure you want to delete <strong>{confirmDelete}</strong>? This cannot be undone.</p>
      </Modal>
    </div>
  )
}
