import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface JsonEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  label?: string
  error?: string
  className?: string
}

export default function JsonEditor({
  value,
  onChange,
  readOnly = false,
  label,
  error,
  className = ''
}: JsonEditorProps): JSX.Element {
  const [copied, setCopied] = useState(false)
  const lines = value.split('\n')

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-themed-secondary">{label}</label>
          <button onClick={copyToClipboard} className="inline-flex items-center gap-1 text-xs text-themed-muted hover:text-themed-secondary">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <div className="relative overflow-hidden rounded-md border border-border-default bg-primary">
        <div className="flex max-h-96 overflow-auto">
          <div className="select-none border-r border-border-default bg-secondary/30 px-3 py-3 text-right font-mono text-xs leading-5 text-themed-muted">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            className="flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-5 text-themed outline-none"
            rows={Math.max(lines.length, 5)}
          />
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
