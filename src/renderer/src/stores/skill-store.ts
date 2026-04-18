import { create } from 'zustand'
import type { SkillInfo } from '@shared/types'

interface SkillState {
  skills: SkillInfo[]
  selectedSkill: SkillInfo | null
  isLoading: boolean
}

interface SkillActions {
  setSkills: (skills: SkillInfo[]) => void
  setSelectedSkill: (skill: SkillInfo | null) => void
  setLoading: (loading: boolean) => void
  addSkill: (skill: SkillInfo) => void
  updateSkill: (name: string, updates: Partial<SkillInfo>) => void
  removeSkill: (name: string) => void
  reorderSkills: (orderedNames: string[]) => void
}

export const useSkillStore = create<SkillState & SkillActions>()((set) => ({
  skills: [],
  selectedSkill: null,
  isLoading: false,

  setSkills: (skills) => set({ skills }),
  setSelectedSkill: (skill) => set({ selectedSkill: skill }),
  setLoading: (loading) => set({ isLoading: loading }),

  addSkill: (skill) => set((s) => ({ skills: [...s.skills, skill] })),

  updateSkill: (name, updates) =>
    set((s) => ({
      skills: s.skills.map((sk) => (sk.name === name ? { ...sk, ...updates } : sk))
    })),

  removeSkill: (name) =>
    set((s) => ({
      skills: s.skills.filter((sk) => sk.name !== name),
      selectedSkill: s.selectedSkill?.name === name ? null : s.selectedSkill
    })),

  reorderSkills: (orderedNames) =>
    set((s) => {
      const map = new Map(s.skills.map((sk) => [sk.name, sk]))
      const reordered = orderedNames
        .map((name, i) => {
          const sk = map.get(name)
          return sk ? { ...sk, priority: i } : null
        })
        .filter(Boolean) as SkillInfo[]
      return { skills: reordered }
    })
}))
