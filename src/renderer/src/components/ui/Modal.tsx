import { useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-lg rounded-lg border border-border-default bg-card p-6 shadow-xl animate-slide-up ${className}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-themed">{title}</h2>
          <button onClick={onClose} className="text-themed-muted hover:text-themed-secondary transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="text-sm text-themed-secondary">{children}</div>
        {actions && <div className="mt-4 flex justify-end gap-2">{actions}</div>}
      </div>
    </div>
  )
}
