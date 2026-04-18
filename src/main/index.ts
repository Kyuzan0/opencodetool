import { app, shell, BrowserWindow, Menu, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerConfigIpc } from './ipc/config-ipc'
import { registerPackageManagerIpc } from './ipc/package-manager-ipc'
import { registerShellIpc } from './ipc/shell-ipc'
import { registerSkillIpc } from './ipc/skill-ipc'
import { registerTerminalIpc } from './ipc/terminal-ipc'
import { registerBackupIpc } from './ipc/backup-ipc'
import { registerProjectIpc } from './ipc/project-ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
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
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About OpenCode Manager', click: () => mainWindow?.webContents.send('menu:about') },
        { type: 'separator' },
        { label: 'OpenCode Documentation', click: () => shell.openExternal('https://opencode.ai') },
        { label: 'oh-my-openagent Docs', click: () => shell.openExternal('https://github.com/code-yeongyu/oh-my-openagent') }
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

  // Create menu
  createMenu()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
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

// H3 Fix: Kill all terminal processes before quit
app.on('before-quit', () => {
  try {
    const { destroyAllTerminals } = require('./services/terminal-service')
    destroyAllTerminals()
  } catch { /* service may not be loaded */ }
})
