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
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-accent/30 bg-accent/10 text-accent'
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
    <div className={`flex items-center gap-3 rounded-md border px-4 py-3 shadow-lg ${colors[toast.type]}`}>
      <Icon size={18} />
      <span className="flex-1 text-sm">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastType[]; onDismiss: (id: string) => void }): JSX.Element {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
