import { useState } from 'react'
import { Bell, X, CheckCircle, AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react'
import { useNotificationStore } from '../stores/notification-store'

export default function NotificationCenter(): JSX.Element {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAllRead, clearAll, removeNotification } = useNotificationStore()

  const levelIcons = {
    success: <CheckCircle size={14} className="text-success shrink-0" />,
    error: <AlertCircle size={14} className="text-danger shrink-0" />,
    warning: <AlertTriangle size={14} className="text-warning shrink-0" />,
    info: <Info size={14} className="text-accent shrink-0" />
  }

  function formatTime(iso: string): string {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead() }}
        className="relative rounded-lg p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-elevated overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">Notifications</span>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-[var(--color-text-muted)] hover:text-danger transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear all
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-[var(--color-text-muted)]">
                  <Bell size={24} className="opacity-30 mb-2" />
                  <p className="text-xs">No notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-2.5 px-4 py-3 border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-primary)] transition-colors ${
                      !notif.read ? 'bg-accent/[0.03]' : ''
                    }`}
                  >
                    <span className="mt-0.5">{levelIcons[notif.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{formatTime(notif.timestamp)}</p>
                    </div>
                    <button
                      onClick={() => removeNotification(notif.id)}
                      className="shrink-0 text-[var(--color-text-muted)] hover:text-danger transition-colors p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
