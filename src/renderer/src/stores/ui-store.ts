import { create } from 'zustand'
import type { Toast, Modal } from '@shared/types'

interface UiState {
  sidebarCollapsed: boolean
  activePage: string
  toasts: Toast[]
  modals: Modal[]
  terminalVisible: boolean
}

interface UiActions {
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  navigate: (page: string) => void
  addToast: (toast: Toast) => void
  removeToast: (id: string) => void
  openModal: (modal: Modal) => void
  closeModal: (id: string) => void
  toggleTerminal: () => void
  setTerminalVisible: (visible: boolean) => void
}

export const useUiStore = create<UiState & UiActions>()((set) => ({
  sidebarCollapsed: false,
  activePage: '/',
  toasts: [],
  modals: [],
  terminalVisible: false,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  navigate: (page) => set({ activePage: page }),

  addToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  openModal: (modal) => set((s) => ({ modals: [...s.modals, modal] })),
  closeModal: (id) => set((s) => ({ modals: s.modals.filter((m) => m.id !== id) })),

  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  setTerminalVisible: (visible) => set({ terminalVisible: visible })
}))
