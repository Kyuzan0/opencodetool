import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

interface TerminalInstance {
  id: string
  process: ChildProcess
  shell: string
}

const terminals = new Map<string, TerminalInstance>()
const emitter = new EventEmitter()
let nextId = 1

export function createTerminal(
  shellPath: string,
  cwd?: string,
  env?: Record<string, string>
): string {
  const id = `term_${nextId++}`
  const mergedEnv = { ...process.env, ...env }

  const proc = spawn(shellPath, [], {
    cwd: cwd || process.cwd(),
    env: mergedEnv,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe']
  })

  proc.stdout?.on('data', (data: Buffer) => {
    emitter.emit(`data:${id}`, data.toString())
  })

  proc.stderr?.on('data', (data: Buffer) => {
    emitter.emit(`data:${id}`, data.toString())
  })

  proc.on('exit', (code) => {
    emitter.emit(`exit:${id}`, code)
    terminals.delete(id)
  })

  terminals.set(id, { id, process: proc, shell: shellPath })
  return id
}

export function writeToTerminal(id: string, data: string): void {
  const term = terminals.get(id)
  if (term?.process.stdin?.writable) {
    term.process.stdin.write(data)
  }
}

export function resizeTerminal(_id: string, _cols: number, _rows: number): void {
  // Resize not supported without node-pty
}

export function destroyTerminal(id: string): void {
  const term = terminals.get(id)
  if (term) {
    term.process.kill()
    terminals.delete(id)
  }
}

export function onTerminalData(id: string, callback: (data: string) => void): void {
  emitter.on(`data:${id}`, callback)
}

export function onTerminalExit(id: string, callback: (code: number | null) => void): void {
  emitter.on(`exit:${id}`, callback)
}

export function removeTerminalListeners(id: string): void {
  emitter.removeAllListeners(`data:${id}`)
  emitter.removeAllListeners(`exit:${id}`)
}
