import { useMemo } from 'react'
import { Modal, Button } from './ui'
import { Save, X } from 'lucide-react'

interface ConfigDiffProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  original: Record<string, unknown> | null
  modified: Record<string, unknown> | null
  title?: string
  loading?: boolean
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber: number
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const origLines = original.split('\n')
  const modLines = modified.split('\n')
  const lines: DiffLine[] = []

  const maxLen = Math.max(origLines.length, modLines.length)
  let lineNum = 1

  // Simple line-by-line diff
  for (let i = 0; i < maxLen; i++) {
    const origLine = origLines[i]
    const modLine = modLines[i]

    if (origLine === undefined && modLine !== undefined) {
      lines.push({ type: 'added', content: modLine, lineNumber: lineNum++ })
    } else if (modLine === undefined && origLine !== undefined) {
      lines.push({ type: 'removed', content: origLine, lineNumber: lineNum++ })
    } else if (origLine !== modLine) {
      lines.push({ type: 'removed', content: origLine || '', lineNumber: lineNum })
      lines.push({ type: 'added', content: modLine || '', lineNumber: lineNum++ })
    } else {
      lines.push({ type: 'unchanged', content: origLine || '', lineNumber: lineNum++ })
    }
  }

  return lines
}

export default function ConfigDiff({
  open,
  onClose,
  onConfirm,
  original,
  modified,
  title = 'Review Changes',
  loading = false
}: ConfigDiffProps): JSX.Element | null {
  const diffLines = useMemo(() => {
    if (!original || !modified) return []
    const origStr = JSON.stringify(original, null, 2)
    const modStr = JSON.stringify(modified, null, 2)
    return computeDiff(origStr, modStr)
  }, [original, modified])

  const hasChanges = diffLines.some((l) => l.type !== 'unchanged')
  const addedCount = diffLines.filter((l) => l.type === 'added').length
  const removedCount = diffLines.filter((l) => l.type === 'removed').length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-3xl"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            <X size={16} /> Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading} disabled={!hasChanges}>
            <Save size={16} /> Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-success">+{addedCount} added</span>
          <span className="text-danger">-{removedCount} removed</span>
          <span className="text-[var(--color-text-muted)]">{diffLines.filter((l) => l.type === 'unchanged').length} unchanged</span>
        </div>

        {/* Diff view */}
        {!hasChanges ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">
            No changes detected
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]">
            <div className="font-mono text-xs leading-relaxed">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={`flex ${
                    line.type === 'added'
                      ? 'bg-success/[0.08] text-success'
                      : line.type === 'removed'
                      ? 'bg-danger/[0.08] text-danger'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  <span className="w-10 shrink-0 text-right pr-2 py-0.5 text-[var(--color-text-muted)] select-none border-r border-[var(--color-border-subtle)]">
                    {line.lineNumber}
                  </span>
                  <span className="w-5 shrink-0 text-center py-0.5 select-none">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </span>
                  <span className="flex-1 py-0.5 pr-4 whitespace-pre">{line.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
