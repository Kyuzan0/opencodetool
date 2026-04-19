import { watch, type FSWatcher } from 'fs'
import { stat } from 'fs/promises'
import { BrowserWindow } from 'electron'

/**
 * File watcher service — watches config files for external changes
 * and notifies the renderer process when a file is modified.
 */

interface WatchEntry {
  watcher: FSWatcher
  filePath: string
  lastMtime: number
}

const watchers = new Map<string, WatchEntry>()

// Debounce to avoid duplicate events (fs.watch fires multiple times per save)
const debounceTimers = new Map<string, NodeJS.Timeout>()
const DEBOUNCE_MS = 500

// Suppress notifications for files being saved by the app itself
const suppressedPaths = new Set<string>()

/**
 * Start watching a file for changes. Sends 'file-watcher:changed' event
 * to all renderer windows when the file is modified externally.
 */
export function watchFile(filePath: string): void {
  // Already watching this file
  if (watchers.has(filePath)) return

  try {
    const watcher = watch(filePath, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        handleFileChange(filePath)
      }
    })

    watcher.on('error', () => {
      unwatchFile(filePath)
    })

    // Store initial mtime
    stat(filePath)
      .then((s) => {
        watchers.set(filePath, { watcher, filePath, lastMtime: s.mtimeMs })
      })
      .catch(() => {
        watchers.set(filePath, { watcher, filePath, lastMtime: 0 })
      })
  } catch {
    // File may not exist or be inaccessible
  }
}

/**
 * Stop watching a file.
 */
export function unwatchFile(filePath: string): void {
  const entry = watchers.get(filePath)
  if (entry) {
    entry.watcher.close()
    watchers.delete(filePath)
  }
  const timer = debounceTimers.get(filePath)
  if (timer) {
    clearTimeout(timer)
    debounceTimers.delete(filePath)
  }
}

/**
 * Stop watching all files. Called on app quit.
 */
export function unwatchAll(): void {
  for (const [filePath] of watchers) {
    unwatchFile(filePath)
  }
}

/**
 * Temporarily suppress change notifications for a file.
 * Used when the app itself writes to a watched config file,
 * so the "external change" banner is not shown.
 */
export function suppressFileChange(filePath: string, durationMs = 2000): void {
  suppressedPaths.add(filePath)
  setTimeout(() => {
    suppressedPaths.delete(filePath)
  }, durationMs)
}

/**
 * Handle a file change event with debouncing.
 */
function handleFileChange(filePath: string): void {
  // Skip if this change was triggered by the app itself
  if (suppressedPaths.has(filePath)) return

  // Clear existing debounce timer
  const existing = debounceTimers.get(filePath)
  if (existing) clearTimeout(existing)

  debounceTimers.set(
    filePath,
    setTimeout(async () => {
      debounceTimers.delete(filePath)

      // Verify the file actually changed by checking mtime
      try {
        const s = await stat(filePath)
        const entry = watchers.get(filePath)
        if (entry && s.mtimeMs > entry.lastMtime) {
          entry.lastMtime = s.mtimeMs
          notifyRenderers(filePath)
        }
      } catch {
        // File may have been deleted
      }
    }, DEBOUNCE_MS)
  )
}

/**
 * Send file change notification to all renderer windows.
 */
function notifyRenderers(filePath: string): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('file-watcher:changed', filePath)
    }
  }
}
