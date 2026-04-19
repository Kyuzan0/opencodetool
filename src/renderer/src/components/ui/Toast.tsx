import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import type { Toast as ToastType } from '@shared/types'

interface ToastProps {
  toast: ToastType
  onDismiss: (id: string) => void
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const colors = {
  success: 'border-success/20 bg-success/[0.06] text-success',
  error: 'border-danger/20 bg-danger/[0.06] text-danger',
  warning: 'border-warning/20 bg-warning/[0.06] text-warning',
  info: 'border-accent/20 bg-accent/[0.06] text-accent'
}

export default function Toast({ toast, onDismiss }: ToastProps): JSX.Element {
  const Icon = icons[toast.type]
  const duration = toast.duration ?? 5000

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(toast.id), duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, duration, onDismiss])

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-elevated backdrop-blur-sm animate-slide-in-right ${colors[toast.type]}`}
    >
      <Icon size={17} className="shrink-0" />
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="rounded-md p-0.5 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer({
  toasts,
  onDismiss
}: {
  toasts: ToastType[]
  onDismiss: (id: string) => void
}): JSX.Element {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
