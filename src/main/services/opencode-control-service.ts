import { spawn, ChildProcess, execFile } from 'child_process'
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

export async function startOpenCode(mode: OpenCodeRuntimeMode, port?: number): Promise<OpenCodeRuntimeStatus> {
  const existing = getStatus(mode)
  if (existing.running) return existing

  const command = await resolveOpenCodeCommand()
  const args = mode === 'web' ? ['web', '--port', String(validateWebPort(port))] : []
  const processPort = mode === 'web' ? validateWebPort(port) : null

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

export async function stopOpenCode(mode: OpenCodeRuntimeMode): Promise<OpenCodeRuntimeStatus> {
  const current = managed.get(mode)
  if (!current) return emptyStatus(mode)

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
  return emptyStatus(mode)
}

export async function restartOpenCode(mode: OpenCodeRuntimeMode, port?: number): Promise<OpenCodeRuntimeStatus> {
  const previous = getStatus(mode)
  const restartPort = mode === 'web'
    ? (Number.isInteger(port) ? (port as number) : (previous.port ?? 3000))
    : undefined

  await stopOpenCode(mode)
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
