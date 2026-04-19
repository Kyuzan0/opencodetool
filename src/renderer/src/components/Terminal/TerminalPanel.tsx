import { useState, useEffect, useRef, useCallback } from 'react'
import { useUiStore, useSettingsStore } from '../../stores'
import { Button } from '../ui'
import { Terminal, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { ShellInfo } from '@shared/types'

interface TerminalTab {
  id: string
  title: string
  shellName: string
  output: string[]
}

export default function TerminalPanel(): JSX.Element | null {
  const { terminalVisible, toggleTerminal } = useUiStore()
  const { preferredShell } = useSettingsStore()
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeTab, setActiveTab] = useState('')
  const [shells, setShells] = useState<ShellInfo[]>([])
  const [selectedShell, setSelectedShell] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [panelHeight, setPanelHeight] = useState(300)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.shell.detect().then((detected: ShellInfo[]) => {
      setShells(detected.filter((s) => s.available))
      if (!selectedShell) {
        const pref = detected.find((s) => s.name.toLowerCase().includes(preferredShell.toLowerCase()))
        setSelectedShell(pref?.path || detected[0]?.path || '')
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    window.api.terminal.onData((id: string, data: string) => {
      setTabs((prev) => prev.map((t) =>
        t.id === id ? { ...t, output: [...t.output, data] } : t
      ))
    })
    window.api.terminal.onExit((id: string) => {
      setTabs((prev) => prev.map((t) =>
        t.id === id ? { ...t, output: [...t.output, '\r\n[Process exited]\r\n'] } : t
      ))
    })
    return () => { window.api.terminal.removeListeners() }
  }, [])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [tabs, activeTab])

  const createTab = useCallback(async () => {
    const shellPath = selectedShell || shells[0]?.path
    if (!shellPath) return
    try {
      const id = await window.api.terminal.create(shellPath)
      const shellName = shells.find((s) => s.path === shellPath)?.name || 'Shell'
      const newTab: TerminalTab = { id, title: `${shellName} ${tabs.length + 1}`, shellName, output: [] }
      setTabs((prev) => [...prev, newTab])
      setActiveTab(id)
    } catch (e) {
      console.error('Failed to create terminal:', e)
    }
  }, [selectedShell, shells, tabs.length])

  const closeTab = useCallback(async (id: string) => {
    try { await window.api.terminal.destroy(id) } catch {}
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (activeTab === id) setActiveTab(next[next.length - 1]?.id || '')
      return next
    })
  }, [activeTab])

  const handleInput = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeTab) {
      await window.api.terminal.write(activeTab, inputValue + '\n')
      setInputValue('')
    }
  }, [activeTab, inputValue])

  if (!terminalVisible) return null

  const currentTab = tabs.find((t) => t.id === activeTab)

  return (
    <div className="border-t border-border-default bg-primary" style={{ height: panelHeight }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-3 py-1">
        <div className="flex items-center gap-1">
          <Terminal size={14} className="text-themed-muted" />
          <span className="text-xs font-medium text-themed-secondary">Terminal</span>
          {/* Tabs */}
          <div className="ml-2 flex items-center gap-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-xs ${
                  activeTab === tab.id ? 'bg-accent/10 text-accent' : 'text-themed-muted hover:text-themed-secondary'
                }`}
              >
                <span>{tab.title}</span>
                <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }} className="hover:text-danger">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedShell}
            onChange={(e) => setSelectedShell(e.target.value)}
            className="rounded border border-border-default bg-secondary px-2 py-0.5 text-xs text-themed-secondary"
          >
            {shells.map((s) => (
              <option key={s.path} value={s.path}>{s.name}</option>
            ))}
          </select>
          <button onClick={createTab} className="text-themed-muted hover:text-themed-secondary" title="New Terminal">
            <Plus size={14} />
          </button>
          <button onClick={toggleTerminal} className="text-themed-muted hover:text-themed-secondary" title="Close Panel">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[calc(100%-60px)] flex-col">
        {currentTab ? (
          <>
            <div ref={outputRef} className="flex-1 overflow-auto p-2 font-mono text-xs leading-5 text-themed-secondary">
              {currentTab.output.map((line, i) => (
                <pre key={i} className="whitespace-pre-wrap">{line}</pre>
              ))}
            </div>
            <div className="border-t border-border-default px-2 py-1">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInput}
                placeholder="Type command and press Enter..."
                className="w-full bg-transparent font-mono text-xs text-themed outline-none placeholder:text-themed-muted"
                autoFocus
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-themed-muted text-sm">
            <button onClick={createTab} className="flex items-center gap-2 hover:text-themed-secondary">
              <Plus size={16} /> Create a new terminal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
