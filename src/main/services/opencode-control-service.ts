import { spawn, ChildProcess, execFile, exec } from 'child_process'
import { createConnection } from 'net'
import { detectOpenCode } from './package-manager-service'

export type OpenCodeRuntimeMode = 'cli' | 'web'

export interface OpenCodeRuntimeStatus {
  mode: OpenCodeRuntimeMode
  running: boolean
  pid: number | null
  startedAt: string | null
  port: number | null
  command: string | null
  args: string[]
  error: string | null
}

export interface OpenCodeRuntimeOverview {
  cli: OpenCodeRuntimeStatus
  web: OpenCodeRuntimeStatus
}

interface ManagedProcess {
  process: ChildProcess
  startedAt: string
  command: string
  args: string[]
  port: number | null
}

const managed = new Map<OpenCodeRuntimeMode, ManagedProcess>()

function emptyStatus(mode: OpenCodeRuntimeMode): OpenCodeRuntimeStatus {
  return {
    mode,
    running: false,
    pid: null,
    startedAt: null,
    port: null,
    command: null,
    args: [],
    error: null,
  }
}

function isAlive(child: ChildProcess): boolean {
  return child.exitCode === null && !child.killed
}

async function resolveOpenCodeCommand(): Promise<string> {
  try {
    const detected = await detectOpenCode()
    if (detected.found && detected.path) {
      return detected.path
    }
  } catch {
    // fallback to PATH resolution
  }
  return 'opencode'
}

function validateWebPort(port: number | undefined): number {
  if (!Number.isInteger(port) || (port as number) < 1 || (port as number) > 65535) {
    throw new Error('Invalid web port. Use integer 1-65535.')
  }
  return port as number
}

function getStatus(mode: OpenCodeRuntimeMode): OpenCodeRuntimeStatus {
  const current = managed.get(mode)
  if (!current) return emptyStatus(mode)

  if (!isAlive(current.process)) {
    managed.delete(mode)
    return emptyStatus(mode)
  }

  return {
    mode,
    running: true,
    pid: current.process.pid ?? null,
    startedAt: current.startedAt,
    port: current.port,
    command: current.command,
    args: current.args,
    error: null,
  }
}

function waitForSpawn(child: ChildProcess, timeoutMs = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false

    const onError = (err: Error): void => {
      if (settled) return
      settled = true
      reject(err)
    }

    child.once('error', onError)

    setTimeout(() => {
      if (settled) return
      settled = true
      child.removeListener('error', onError)
      resolve()
    }, timeoutMs)
  })
}

function killTreeWindows(pid: number): Promise<void> {
  return new Promise((resolve) => {
    execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { shell: true, timeout: 15000 }, () => {
      resolve()
    })
  })
}

/**
 * Check if a port is currently in use by attempting a TCP connection.
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' })
    socket.setTimeout(1000)
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.on('error', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

/**
 * Find and kill all processes listening on a specific port (Windows).
 * Uses netstat to find PIDs, then taskkill to terminate them.
 */
function killProcessOnPort(port: number): Promise<void> {
  return new Promise((resolve) => {
    // Find PIDs listening on the port using netstat
    exec(`netstat -ano`, { timeout: 10000 }, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve()
        return
      }

      // Parse netstat output and find LISTENING entries for our exact port
      const pids = new Set<number>()
      const portPattern = `:${port}`
      for (const line of stdout.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.includes('LISTENING')) continue
        const parts = trimmed.split(/\s+/)
        // parts: [TCP, localAddr:port, foreignAddr:port, state, PID]
        if (parts.length < 5) continue
        const localAddr = parts[1]
        // Ensure exact port match (not :80890 matching :8089)
        if (!localAddr.endsWith(portPattern)) continue
        const pid = parseInt(parts[parts.length - 1], 10)
        if (pid && pid > 0) pids.add(pid)
      }

      if (pids.size === 0) {
        resolve()
        return
      }

      // Kill all found PIDs
      const killPromises = Array.from(pids).map((pid) => killTreeWindows(pid))
      Promise.all(killPromises).then(() => resolve())
    })
  })
}

export async function startOpenCode(mode: OpenCodeRuntimeMode, port?: number, force?: boolean): Promise<OpenCodeRuntimeStatus> {
  const existing = getStatus(mode)
  if (existing.running) return existing

  const command = await resolveOpenCodeCommand()
  const args = mode === 'web' ? ['web', '--port', String(validateWebPort(port))] : []
  const processPort = mode === 'web' ? validateWebPort(port) : null

  // Check if port is already in use before starting
  if (processPort) {
    const portBusy = await isPortInUse(processPort)
    if (portBusy) {
      if (force) {
        // Force mode: kill whatever is on the port, then proceed
        await killProcessOnPort(processPort)
        // Wait for port to be released
        await new Promise((r) => setTimeout(r, 1000))
        const stillBusy = await isPortInUse(processPort)
        if (stillBusy) {
          throw new Error(`Port ${processPort} masih digunakan setelah mencoba menghentikan proses. Coba stop manual atau gunakan port lain.`)
        }
      } else {
        throw new Error(`PORT_IN_USE:${processPort}`)
      }
    }
  }

  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    windowsHide: true,
    stdio: 'ignore',
  })

  await waitForSpawn(child)

  if (!child.pid) {
    throw new Error('Failed to start process: PID unavailable')
  }

  const managedProcess: ManagedProcess = {
    process: child,
    startedAt: new Date().toISOString(),
    command,
    args,
    port: processPort,
  }

  managed.set(mode, managedProcess)

  child.on('exit', () => {
    const current = managed.get(mode)
    if (current?.process.pid === child.pid) {
      managed.delete(mode)
    }
  })

  return getStatus(mode)
}

export async function stopOpenCode(mode: OpenCodeRuntimeMode, port?: number): Promise<OpenCodeRuntimeStatus> {
  const current = managed.get(mode)
  // Use provided port, or fall back to the managed process port
  const targetPort = port ?? current?.port ?? null

  if (current) {
    const pid = current.process.pid
    if (pid) {
      await killTreeWindows(pid)
    } else {
      try {
        current.process.kill()
      } catch {
        // ignore
      }
    }
    managed.delete(mode)
  }

  // Also kill any process still occupying the port (handles orphan/external processes)
  if (targetPort) {
    // Wait briefly for the managed process to fully release the port
    if (current) await new Promise((r) => setTimeout(r, 500))
    const stillBusy = await isPortInUse(targetPort)
    if (stillBusy) {
      await killProcessOnPort(targetPort)
    }
  }

  return emptyStatus(mode)
}

export async function restartOpenCode(mode: OpenCodeRuntimeMode, port?: number): Promise<OpenCodeRuntimeStatus> {
  const previous = getStatus(mode)
  const restartPort = mode === 'web'
    ? (Number.isInteger(port) ? (port as number) : (previous.port ?? 3000))
    : undefined

  // Pass port to stop so it can kill processes on that port
  await stopOpenCode(mode, restartPort)
  return startOpenCode(mode, restartPort)
}

export function getOpenCodeRuntimeOverview(): OpenCodeRuntimeOverview {
  return {
    cli: getStatus('cli'),
    web: getStatus('web'),
  }
}

export async function stopAllOpenCodeRuntime(): Promise<void> {
  await Promise.all([stopOpenCode('cli'), stopOpenCode('web')])
}
