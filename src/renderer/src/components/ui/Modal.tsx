import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  className = ''
}: ModalProps): JSX.Element | null {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative z-10 w-full max-w-lg rounded-xl border border-border-default bg-card shadow-elevated animate-slide-up overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-themed tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-themed-muted hover:text-themed-secondary hover:bg-white/[0.04] transition-all"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 text-sm text-themed-secondary">{children}</div>
        {actions && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border-default bg-surface/50">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
