import { useEffect } from 'react'
import { useConfigStore } from '../stores'

export function useUnsavedWarning(): void {
  const isDirty = useConfigStore((s) => s.isDirty)
  const isAgentDirty = useConfigStore((s) => s.isAgentDirty)

  useEffect(() => {
    function handler(e: BeforeUnloadEvent): void {
      if (isDirty || isAgentDirty) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, isAgentDirty])
}
