import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timestamp: string
  read: boolean
  source?: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
}

interface NotificationActions {
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notif) => {
        const newNotif: Notification = {
          ...notif,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          read: false
        }
        set((s) => ({
          notifications: [newNotif, ...s.notifications].slice(0, 100),
          unreadCount: s.unreadCount + 1
        }))
      },

      removeNotification: (id) =>
        set((s) => {
          const notif = s.notifications.find((n) => n.id === id)
          return {
            notifications: s.notifications.filter((n) => n.id !== id),
            unreadCount: notif && !notif.read ? Math.max(0, s.unreadCount - 1) : s.unreadCount
          }
        }),

      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0
        })),

      clearAll: () => set({ notifications: [], unreadCount: 0 })
    }),
    { name: 'opencode-manager-notifications' }
  )
)
