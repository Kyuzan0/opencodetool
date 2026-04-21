import { app, shell, BrowserWindow, Menu, globalShortcut, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerConfigIpc } from './ipc/config-ipc'
import { registerPackageManagerIpc } from './ipc/package-manager-ipc'
import { registerShellIpc } from './ipc/shell-ipc'
import { registerSkillIpc } from './ipc/skill-ipc'
import { registerTerminalIpc } from './ipc/terminal-ipc'
import { registerBackupIpc } from './ipc/backup-ipc'
import { registerProjectIpc } from './ipc/project-ipc'
import { registerUninstallIpc } from './ipc/uninstall-ipc'
import { registerOpenCodeControlIpc } from './ipc/opencode-control-ipc'
import { registerSmitheryIpc } from './ipc/smithery-ipc'
import { registerGitHubSkillIpc } from './ipc/github-skill-ipc'
import { registerUpdateIpc } from './ipc/update-ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0f0f',
    title: 'OpenCode Manager',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Disable DevTools
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
      _event.preventDefault()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // Security: Only allow http/https URLs to prevent RCE via arbitrary URI schemes
    try {
      const url = new URL(details.url)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        shell.openExternal(details.url)
      }
    } catch {
      // Invalid URL — silently deny
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Config', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:open-config') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save') },
        { type: 'separator' },
        { label: 'Import Config...', click: () => mainWindow?.webContents.send('menu:import') },
        { label: 'Export Config...', click: () => mainWindow?.webContents.send('menu:export') },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => mainWindow?.webContents.send('menu:toggle-sidebar') },
        { label: 'Toggle Terminal', accelerator: 'CmdOrCtrl+`', click: () => mainWindow?.webContents.send('menu:toggle-terminal') },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About OpenCode Manager', click: () => mainWindow?.webContents.send('menu:about') },
        { type: 'separator' },
        { label: 'OpenCode Documentation', click: () => shell.openExternal('https://opencode.ai') },
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.opencode.manager')

  // Register all IPC handlers
  registerConfigIpc()
  registerPackageManagerIpc()
  registerShellIpc()
  registerSkillIpc()
  registerTerminalIpc()
  registerBackupIpc()
  registerProjectIpc()
  registerUninstallIpc()
  registerOpenCodeControlIpc()
  registerSmitheryIpc()
  registerGitHubSkillIpc()
  registerUpdateIpc()

  // Create menu
  createMenu()

  app.on('browser-window-created', (_, window) => {
    // Skip optimizer.watchWindowShortcuts — it auto-opens DevTools on F12
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Global error handlers — prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error)
  dialog.showErrorBox(
    'Unexpected Error',
    `An unexpected error occurred:\n\n${error.message}\n\nThe application may be unstable. Please restart.`
  )
})

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason)
})

// H3 Fix: Kill all terminal processes before quit
app.on('before-quit', () => {
  try {
    const { destroyAllTerminals } = require('./services/terminal-service')
    destroyAllTerminals()
  } catch { /* service may not be loaded */ }

  try {
    const { stopAllOpenCodeRuntime } = require('./services/opencode-control-service')
    stopAllOpenCodeRuntime()
  } catch { /* service may not be loaded */ }

  try {
    const { unwatchAll } = require('./services/file-watcher-service')
    unwatchAll()
  } catch { /* service may not be loaded */ }
})
