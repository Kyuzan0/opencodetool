import { useEffect, useState } from 'react'
import { useUpdateStore } from '../stores'
import { Modal, Button } from './ui'
import { Download, RefreshCw, ArrowUpCircle, X, ExternalLink } from 'lucide-react'

export default function UpdateNotification(): JSX.Element | null {
  const {
    status, info, progress, error, dismissed,
    checkForUpdate, downloadUpdate, cancelDownload, installUpdate, dismiss, reset
  } = useUpdateStore()

  const [showModal, setShowModal] = useState(false)

  // Check for updates on mount
  useEffect(() => {
    checkForUpdate()
  }, [])

  // Show modal automatically when update is available
  useEffect(() => {
    if (status === 'available' && !dismissed) {
      setShowModal(true)
    }
  }, [status, dismissed])

  function handleClose(): void {
    if (status === 'downloading') return
    setShowModal(false)
    if (status === 'available') dismiss()
  }

  function handleDownload(): void {
    downloadUpdate()
  }

  function handleInstall(): void {
    installUpdate()
  }

  function handleRetry(): void {
    reset()
    checkForUpdate()
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  // Floating banner when update available but modal dismissed
  const showBanner = status === 'available' && dismissed && !showModal

  return (
    <>
      {/* Floating update banner */}
      {showBanner && (
        <div className="fixed bottom-4 right-4 z-40 animate-slide-up">
          <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-[var(--color-bg-surface)] px-4 py-3 shadow-elevated">
            <ArrowUpCircle size={18} className="text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-themed">Update available</p>
              <p className="text-xs text-themed-muted">v{info?.latestVersion}</p>
            </div>
            <Button variant="primary" onClick={() => { setShowModal(true) }} className="text-xs px-3 py-1.5">
              View
            </Button>
            <button onClick={dismiss} className="rounded-lg p-1 text-themed-muted hover:text-themed-secondary transition-all">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Update modal */}
      <Modal
        open={showModal}
        onClose={handleClose}
        title="Software Update"
        className="max-w-lg"
        actions={
          <>
            {status === 'available' && (
              <>
                <Button variant="secondary" onClick={handleClose}>Later</Button>
                {info?.downloadUrl ? (
                  <Button variant="primary" onClick={handleDownload}>
                    <Download size={16} /> Download Update
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => window.open(info?.releaseUrl, '_blank')}>
                    <ExternalLink size={16} /> View Release
                  </Button>
                )}
              </>
            )}
            {status === 'downloading' && (
              <Button variant="secondary" onClick={cancelDownload}>Cancel</Button>
            )}
            {status === 'downloaded' && (
              <>
                <Button variant="secondary" onClick={handleClose}>Later</Button>
                <Button variant="primary" onClick={handleInstall}>
                  Install & Restart
                </Button>
              </>
            )}
            {status === 'installing' && (
              <Button variant="secondary" disabled>Installing...</Button>
            )}
            {status === 'error' && (
              <>
                <Button variant="secondary" onClick={handleClose}>Close</Button>
                <Button variant="primary" onClick={handleRetry}>
                  <RefreshCw size={16} /> Retry
                </Button>
              </>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {/* Version info */}
          {info && (
            <div className="rounded-xl border border-[var(--color-border-subtle)] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-themed-muted">Current Version</span>
                <span className="text-xs font-mono text-themed">v{info.currentVersion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-themed-muted">Latest Version</span>
                <span className="text-xs font-mono text-accent font-semibold">v{info.latestVersion}</span>
              </div>
              {info.publishedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-themed-muted">Published</span>
                  <span className="text-xs text-themed">{new Date(info.publishedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Status-specific content */}
          {status === 'available' && info?.releaseNotes && (
            <div>
              <p className="text-xs font-medium text-themed mb-2">Release Notes</p>
              <div className="max-h-40 overflow-auto rounded-xl bg-primary p-3 border border-[var(--color-border-subtle)] text-xs text-themed-muted whitespace-pre-wrap">
                {info.releaseNotes}
              </div>
            </div>
          )}

          {status === 'downloading' && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-themed-muted">
                <span>Downloading update...</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              {progress.totalBytes > 0 && (
                <p className="text-xs text-themed-muted text-right">
                  {formatBytes(progress.transferredBytes)} / {formatBytes(progress.totalBytes)}
                </p>
              )}
            </div>
          )}

          {status === 'downloaded' && (
            <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/[0.04] p-4">
              <ArrowUpCircle size={18} className="text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-themed">Ready to install</p>
                <p className="text-xs text-themed-muted mt-0.5">
                  The app will close and the installer will run silently. It will relaunch automatically when done.
                </p>
              </div>
            </div>
          )}

          {status === 'installing' && (
            <div className="flex items-center gap-3 p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm text-themed">Installing update, app will close shortly...</p>
            </div>
          )}

          {status === 'error' && error && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/[0.04] p-4">
              <span className="text-danger text-sm">{error}</span>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
