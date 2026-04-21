import { create } from 'zustand'
import type { UpdateInfo, UpdateDownloadProgress } from '@shared/types'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error'

interface UpdateState {
  status: UpdateStatus
  info: UpdateInfo | null
  progress: UpdateDownloadProgress | null
  installerPath: string | null
  error: string | null
  dismissed: boolean
}

interface UpdateActions {
  checkForUpdate: () => Promise<void>
  downloadUpdate: () => Promise<void>
  cancelDownload: () => Promise<void>
  installUpdate: () => void
  dismiss: () => void
  reset: () => void
}

export const useUpdateStore = create<UpdateState & UpdateActions>()((set, get) => ({
  status: 'idle',
  info: null,
  progress: null,
  installerPath: null,
  error: null,
  dismissed: false,

  checkForUpdate: async () => {
    set({ status: 'checking', error: null })
    try {
      const result = await window.api.update.check()
      if (result.error) {
        set({ status: 'error', error: result.error })
        return
      }
      if (result.hasUpdate && result.info) {
        set({ status: 'available', info: result.info, dismissed: false })
      } else {
        set({ status: 'idle', info: result.info || null })
      }
    } catch (e: unknown) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'Update check failed' })
    }
  },

  downloadUpdate: async () => {
    const { info } = get()
    if (!info?.downloadUrl) {
      set({ status: 'error', error: 'No download URL available' })
      return
    }

    set({ status: 'downloading', progress: { percent: 0, transferredBytes: 0, totalBytes: 0 } })

    // Listen for progress events
    window.api.update.onDownloadProgress((progress) => {
      set({ progress })
    })

    try {
      const result = await window.api.update.download(info.downloadUrl)
      window.api.update.removeListeners()

      if (result.success && result.filePath) {
        set({ status: 'downloaded', installerPath: result.filePath, progress: null })
      } else {
        set({ status: 'error', error: result.error || 'Download failed', progress: null })
      }
    } catch (e: unknown) {
      window.api.update.removeListeners()
      set({ status: 'error', error: e instanceof Error ? e.message : 'Download failed', progress: null })
    }
  },

  cancelDownload: async () => {
    window.api.update.removeListeners()
    await window.api.update.cancelDownload()
    set({ status: 'available', progress: null })
  },

  installUpdate: () => {
    const { installerPath } = get()
    if (!installerPath) {
      set({ status: 'error', error: 'No installer file available' })
      return
    }

    set({ status: 'installing' })
    const result = window.api.update.install(installerPath)
    // If install returns an error (app didn't quit), show it
    result.then((r) => {
      if (!r.success) {
        set({ status: 'error', error: r.error || 'Install failed' })
      }
      // If success, app will quit — this code won't run
    })
  },

  dismiss: () => set({ dismissed: true }),

  reset: () => set({
    status: 'idle',
    info: null,
    progress: null,
    installerPath: null,
    error: null,
    dismissed: false
  })
}))
