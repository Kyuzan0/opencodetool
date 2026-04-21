import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUiStore, useConfigStore } from '../stores'

export function useKeyboardShortcuts(): void {
  const navigate = useNavigate()
  const toggleTerminal = useUiStore((s) => s.toggleTerminal)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === '`') {
        e.preventDefault()
        toggleTerminal()
        return
      }

      if (ctrl && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      // Ctrl+S: Trigger save via menu event (config pages listen for this)
      if (ctrl && e.key === 's') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('menu:save'))
        return
      }

      if (ctrl && e.key === '1') { e.preventDefault(); navigate('/'); return }
      if (ctrl && e.key === '2') { e.preventDefault(); navigate('/opencode-config'); return }
      if (ctrl && e.key === '3') { e.preventDefault(); navigate('/agent-config'); return }
      if (ctrl && e.key === '4') { e.preventDefault(); navigate('/plugins'); return }
      if (ctrl && e.key === '5') { e.preventDefault(); navigate('/skills'); return }
      if (ctrl && e.key === '6') { e.preventDefault(); navigate('/settings'); return }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate, toggleTerminal, toggleSidebar])
}
