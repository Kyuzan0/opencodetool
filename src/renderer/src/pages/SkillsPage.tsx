import { useState, useEffect, useRef } from 'react'
import { useSkillStore, useSettingsStore } from '../stores'
import { Card, TextInput, TextArea, Button, Modal, Tabs } from '../components/ui'
import { Plus, Trash2, Save, FileText, GripVertical, Copy, Search, Download, Star, Shield, ChevronLeft, ChevronRight, ExternalLink, Package, Github, Globe, Tag, GitFork, AlertCircle, CheckCircle2, FolderGit2 } from 'lucide-react'
import type { SkillInfo, SmitherySkill, GitHubRepoInfo } from '@shared/types'

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
  const [activeTab, setActiveTab] = useState('my-skills')

  // Smithery Store State
  const [allStoreSkills, setAllStoreSkills] = useState<SmitherySkill[]>([])
  const [storeLoading, setStoreLoading] = useState(false)
  const [storeSearch, setStoreSearch] = useState('')
  const [storePage, setStorePage] = useState(1)
  const [previewSkill, setPreviewSkill] = useState<SmitherySkill | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const STORE_PAGE_SIZE = 12
  const storeLoadedRef = useRef(false)

  // GitHub State
  const [githubUrl, setGithubUrl] = useState('')
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubRepoInfo, setGithubRepoInfo] = useState<GitHubRepoInfo | null>(null)
  const [githubInstalling, setGithubInstalling] = useState(false)
  const [githubError, setGithubError] = useState('')
  const [githubInstalled, setGithubInstalled] = useState(false)

  // Listen for Ctrl+S save shortcut
  useEffect(() => {
    const onSave = (): void => { if (editDirty && selectedSkill) handleSave() }
    window.addEventListener('menu:save', onSave)
    return () => window.removeEventListener('menu:save', onSave)
  })

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
    } catch (e: unknown) {
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
    } catch (e: unknown) {
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
    } catch (e: unknown) {
      console.error('Failed to delete skill:', e)
    }
  }

  function handleDuplicate(): void {
    if (!selectedSkill) return
    setNewName(`${selectedSkill.name}-copy`)
    setNewContent(editContent || selectedSkill.content || '')
    setCreateOpen(true)
  }

  // Smithery Store Functions
  useEffect(() => {
    if (activeTab !== 'smithery-store') return
    if (storeLoadedRef.current) return
    storeLoadedRef.current = true

    let cancelled = false
    setStoreLoading(true)

    window.api.smithery.list('fractary')
      .then((skills) => {
        if (!cancelled) setAllStoreSkills(skills)
      })
      .catch((e) => {
        console.error('Failed to load smithery skills:', e)
        if (!cancelled) storeLoadedRef.current = false // allow retry on error
      })
      .finally(() => {
        if (!cancelled) setStoreLoading(false)
      })

    return () => { cancelled = true }
  }, [activeTab])

  // Client-side search + pagination
  const filteredStoreSkills = allStoreSkills.filter((s) => {
    if (!storeSearch.trim()) return true
    const words = storeSearch.toLowerCase().split(/\s+/).filter(Boolean)
    const haystack = [
      s.displayName,
      s.slug,
      s.description,
      ...(s.categories || [])
    ].filter(Boolean).join(' ').toLowerCase()
    return words.every((w) => haystack.includes(w))
  })
  const storeTotalPages = Math.max(1, Math.ceil(filteredStoreSkills.length / STORE_PAGE_SIZE))
  const storeSkills = filteredStoreSkills.slice(
    (storePage - 1) * STORE_PAGE_SIZE,
    storePage * STORE_PAGE_SIZE
  )

  function handleStoreSearch(e: React.FormEvent) {
    e.preventDefault()
    setStorePage(1) // reset to page 1 on new search
  }

  async function handlePreviewSkill(skill: SmitherySkill) {
    setPreviewSkill(skill)
    setPreviewContent('')
    setPreviewLoading(true)
    try {
      const content = await window.api.smithery.fetchContent(skill.gitUrl)
      setPreviewContent(content)
    } catch (e) {
      console.error('Failed to fetch skill content:', e)
      setPreviewContent('# Error\nFailed to load skill content.')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleInstallSkill() {
    if (!previewSkill) return
    setInstalling(true)
    try {
      const skillDir = defaultConfigPath ? `${defaultConfigPath}/.opencode/skills` : ''
      await window.api.smithery.install(skillDir, previewSkill.slug || previewSkill.name, previewSkill.gitUrl)
      await loadSkills()
      setPreviewSkill(null)
    } catch (e) {
      console.error('Failed to install skill:', e)
      alert('Failed to install skill')
    } finally {
      setInstalling(false)
    }
  }

  const isSkillInstalled = (slugOrName: string) => {
    return skills.some(s => s.name === slugOrName)
  }

  async function handleFetchGitHub() {
    if (!githubUrl.trim()) return
    setGithubLoading(true)
    setGithubError('')
    setGithubRepoInfo(null)
    setGithubInstalled(false)
    try {
      const info = await window.api.githubSkill.info(githubUrl.trim())
      setGithubRepoInfo(info)
    } catch (e: unknown) {
      setGithubError(e instanceof Error ? e.message : 'Failed to fetch repository info')
    } finally {
      setGithubLoading(false)
    }
  }

  async function handleInstallGitHub() {
    if (!githubRepoInfo) return
    setGithubInstalling(true)
    setGithubError('')
    try {
      const skillDir = defaultConfigPath ? `${defaultConfigPath}/.opencode/skills` : ''
      await window.api.githubSkill.install(githubUrl.trim(), skillDir)
      setGithubInstalled(true)
      await loadSkills() // refresh skill list
    } catch (e: unknown) {
      setGithubError(e instanceof Error ? e.message : 'Failed to install skill')
    } finally {
      setGithubInstalling(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-themed">Skill Manager</h1>
        {activeTab === 'my-skills' && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleDuplicate} disabled={!selectedSkill}>
              <Copy size={16} /> Duplicate
            </Button>
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> New Skill
            </Button>
          </div>
        )}
      </div>

      <Tabs 
        tabs={[
          { id: 'my-skills', label: 'My Skills' },
          { id: 'smithery-store', label: 'Smithery Store' },
          { id: 'github', label: 'GitHub' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'my-skills' ? (
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
      ) : activeTab === 'smithery-store' ? (
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <TextInput
              value={storeSearch}
              onChange={(v) => { setStoreSearch(v); setStorePage(1) }}
              placeholder="Search skills by name, description, or category..."
              className="max-w-lg"
            />
            {storeSearch && (
              <span className="text-sm text-themed-muted pb-2">
                {filteredStoreSkills.length} of {allStoreSkills.length} skills
              </span>
            )}
          </div>

          {storeLoading ? (
            <div className="flex h-64 items-center justify-center text-themed-muted">
              Loading skills...
            </div>
          ) : (
            <>
              {storeSkills.length === 0 && !storeLoading && (
                <div className="flex h-40 items-center justify-center text-themed-muted">
                  {storeSearch ? 'No skills match your search.' : 'No skills available.'}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {storeSkills.map((skill, i) => (
                  <div 
                    key={skill.id} 
                    className={`flex flex-col cursor-pointer border border-[var(--color-border-subtle)] bg-surface/20 rounded-xl hover:border-[var(--color-border)] transition-colors animate-stagger-in stagger-${(i % 6) + 1}`}
                    onClick={() => handlePreviewSkill(skill)}
                  >
                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-themed truncate" title={skill.displayName || skill.name}>
                          {skill.displayName || skill.name}
                        </h3>
                        {skill.verified && (
                          <Shield size={16} className="text-accent shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-themed-muted line-clamp-2 flex-1" title={skill.description}>
                        {skill.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-themed-secondary mt-2">
                        <div className="flex items-center gap-1">
                          <Download size={14} />
                          <span>{skill.totalActivations || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500" />
                          <span>{skill.externalStars || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package size={14} />
                          <span>v{skill.qualityScore ? (skill.qualityScore * 10).toFixed(0) : '0'}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--color-border-subtle)] mt-2 flex justify-between items-center">
                        <div className="flex gap-1 flex-wrap">
                          {skill.categories?.slice(0, 2).map(cat => (
                            <span key={cat} className="text-[10px] bg-surface/40 px-1.5 py-0.5 rounded text-themed-secondary">
                              {cat}
                            </span>
                          ))}
                        </div>
                        {isSkillInstalled(skill.slug || skill.name) && (
                          <span className="text-[10px] bg-accent/[0.08] text-accent px-1.5 py-0.5 rounded font-medium">
                            Installed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {storeTotalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <Button 
                    variant="secondary" 
                    disabled={storePage === 1 || storeLoading}
                    onClick={() => setStorePage(storePage - 1)}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-sm text-themed-secondary">
                    Page {storePage} of {storeTotalPages}
                  </span>
                  <Button 
                    variant="secondary" 
                    disabled={storePage === storeTotalPages || storeLoading}
                    onClick={() => setStorePage(storePage + 1)}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      ) : activeTab === 'github' ? (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="flex gap-2">
            <TextInput
              value={githubUrl}
              onChange={setGithubUrl}
              placeholder="https://github.com/owner/repo"
              className="flex-1"
            />
            <Button onClick={handleFetchGitHub} loading={githubLoading} disabled={!githubUrl.trim()}>
              <Search size={16} /> Fetch Info
            </Button>
          </div>

          {githubError && (
            <div className="flex items-center gap-2 p-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg text-sm">
              <AlertCircle size={16} />
              {githubError}
            </div>
          )}

          {githubInstalled && (
            <div className="flex items-center gap-2 p-3 text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg text-sm">
              <CheckCircle2 size={16} />
              Skill installed successfully! You can now find it in the "My Skills" tab.
            </div>
          )}

          {githubRepoInfo && !githubInstalled && (
            <div className="border border-[var(--color-border-subtle)] bg-surface/20 rounded-xl p-5 space-y-4 animate-stagger-in">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-themed flex items-center gap-2">
                    <Github size={20} className="text-themed-muted" />
                    {githubRepoInfo.name}
                  </h2>
                  {githubRepoInfo.description && (
                    <p className="text-themed-secondary mt-1">{githubRepoInfo.description}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-themed-muted border-y border-[var(--color-border-subtle)] py-3">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-500" />
                  <span>{githubRepoInfo.stars.toLocaleString()} stars</span>
                </div>
                <div className="flex items-center gap-1">
                  <GitFork size={14} />
                  <span>{githubRepoInfo.forks.toLocaleString()} forks</span>
                </div>
                {githubRepoInfo.license && (
                  <div className="flex items-center gap-1">
                    <Tag size={14} />
                    <span>{githubRepoInfo.license}</span>
                  </div>
                )}
              </div>

              {githubRepoInfo.topics && githubRepoInfo.topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {githubRepoInfo.topics.map(topic => (
                    <span key={topic} className="px-2 py-1 text-xs rounded-md bg-surface/40 text-themed-secondary">
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              <div className="bg-surface/40 p-4 rounded-lg">
                {githubRepoInfo.hasSkillJson && githubRepoInfo.skillJson ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-themed flex items-center gap-2">
                      <FolderGit2 size={16} className="text-accent" />
                      Valid Skill Package Found
                    </h3>
                    <ul className="text-sm text-themed-secondary space-y-1">
                      {githubRepoInfo.skillJson.version && (
                        <li><span className="text-themed-muted">Version:</span> {githubRepoInfo.skillJson.version}</li>
                      )}
                      {githubRepoInfo.skillJson.author && (
                        <li><span className="text-themed-muted">Author:</span> {githubRepoInfo.skillJson.author}</li>
                      )}
                      {githubRepoInfo.skillJson.platforms && (
                        <li><span className="text-themed-muted">Platforms:</span> {githubRepoInfo.skillJson.platforms.join(', ')}</li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="text-sm text-themed-secondary flex items-start gap-2">
                    <FolderGit2 size={16} className="text-themed-muted shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-themed mb-1">Standard Repository</p>
                      <p>This repository doesn't have a skill.json file. It will be installed as a raw directory in your skills folder.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                {isSkillInstalled(githubRepoInfo.repo) ? (
                  <Button disabled>
                    <Package size={16} /> Already Installed
                  </Button>
                ) : (
                  <Button onClick={handleInstallGitHub} loading={githubInstalling}>
                    <Download size={16} /> Install Skill
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

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

      {/* Preview Modal */}
      <Modal
        open={!!previewSkill}
        onClose={() => setPreviewSkill(null)}
        title={previewSkill?.displayName || previewSkill?.name || 'Skill Preview'}
        actions={
          <>
            <Button variant="secondary" onClick={() => setPreviewSkill(null)}>Close</Button>
            {previewSkill && !isSkillInstalled(previewSkill.slug || previewSkill.name) ? (
              <Button onClick={handleInstallSkill} loading={installing}>
                <Download size={16} /> Install
              </Button>
            ) : (
              <Button disabled>
                <Package size={16} /> Installed
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {previewSkill && (
            <div className="flex flex-wrap gap-2 text-sm text-themed-secondary mb-2">
              <a href={previewSkill.gitUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-accent transition-colors">
                <ExternalLink size={14} /> Repository
              </a>
              {previewSkill.categories?.map(cat => (
                <span key={cat} className="bg-surface/40 px-2 py-0.5 rounded text-xs">{cat}</span>
              ))}
            </div>
          )}
          
          {previewLoading ? (
            <div className="flex h-40 items-center justify-center text-themed-muted">
              Fetching skill content...
            </div>
          ) : (
            <TextArea 
              value={previewContent} 
              onChange={() => {}} // readOnly shim
              monospace 
              rows={15} 
              className="w-full opacity-80"
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
