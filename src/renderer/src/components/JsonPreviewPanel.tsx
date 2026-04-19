import { useMemo, useState } from 'react'
import { useConfigStore } from '../stores'
import { Copy, Check, Search } from 'lucide-react'

interface JsonPreviewPanelProps {
  type: 'opencode' | 'agent'
  className?: string
}

function highlightJson(json: string): JSX.Element[] {
  return json.split('\n').map((line, i) => {
    const highlighted = line
      .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="text-green-400">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-blue-400">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-orange-400">$1</span>')
      .replace(/: (null)/g, ': <span class="text-gray-500">$1</span>')
    return (
      <div key={i} className="flex">
        <span className="inline-block w-10 shrink-0 select-none text-right pr-3 text-themed-muted">{i + 1}</span>
        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    )
  })
}

export default function JsonPreviewPanel({ type, className = '' }: JsonPreviewPanelProps): JSX.Element {
  const { openCodeConfig, agentConfig } = useConfigStore()
  const [copied, setCopied] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)

  const config = type === 'opencode' ? openCodeConfig : agentConfig
  const jsonStr = useMemo(() => JSON.stringify(config || {}, null, 2), [config])
  const lines = useMemo(() => highlightJson(jsonStr), [jsonStr])

  const filteredLines = useMemo(() => {
    if (!searchTerm) return lines
    return lines.filter((_, i) => {
      const raw = jsonStr.split('\n')[i]
      return raw?.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [lines, searchTerm, jsonStr])

  async function copyToClipboard(): Promise<void> {
    await navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`rounded-md border border-border-default bg-primary ${className}`}>
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <span className="text-xs font-medium text-themed-secondary">
          {type === 'opencode' ? 'opencode.json' : 'oh-my-openagent.json'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchVisible(!searchVisible)}
            className="text-themed-muted hover:text-themed-secondary"
            title="Search (Ctrl+F)"
          >
            <Search size={14} />
          </button>
          <button onClick={copyToClipboard} className="flex items-center gap-1 text-xs text-themed-muted hover:text-themed-secondary">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      {searchVisible && (
        <div className="border-b border-border-default px-3 py-1">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent text-xs text-themed-secondary outline-none placeholder:text-themed-muted"
            autoFocus
          />
        </div>
      )}
      <div className="max-h-[500px] overflow-auto p-3 font-mono text-xs leading-5 text-themed-secondary">
        {filteredLines}
      </div>
    </div>
  )
}
