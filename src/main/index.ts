import { app, BrowserWindow, ipcMain, shell, Tray, Menu, screen } from 'electron'
import path from 'path'
import { config as loadEnv } from 'dotenv'
import { StoreManager } from './store'
import { OverlayManager } from './overlay'
import { CalendarManager } from './calendar'
import { AuthManager } from './auth'
import { ReminderScheduler } from './scheduler'
import { createTrayIcon } from './trayIcon'

function isDev() { return process.env.NODE_ENV === 'development' }

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let storeManager: StoreManager
let overlayManager: OverlayManager
let calendarManager: CalendarManager
let authManager: AuthManager
let scheduler: ReminderScheduler

app.setName('MeetRemind')

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    mainWindow.show()
  }
})

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'MeetRemind',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  })

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  // Always open DevTools while we're iterating (remove before shipping)
  mainWindow.webContents.openDevTools({ mode: 'detach' })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
  })
}

function createTray() {
  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('MeetRemind')
  updateTrayMenu()

  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

function updateTrayMenu() {
  const settings = storeManager.getSettings()
  const meetings = calendarManager?.getUpcomingMeetings() ?? []

  const meetingItems = meetings.slice(0, 5).map((m) => ({
    label: `${m.title} — ${new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    click: () => {
      if (m.joinUrl) shell.openExternal(m.joinUrl)
    },
  }))

  const menu = Menu.buildFromTemplate([
    { label: 'MeetRemind', enabled: false },
    { type: 'separator' },
    ...(meetingItems.length > 0
      ? [...meetingItems, { type: 'separator' as const }]
      : [{ label: 'No upcoming meetings', enabled: false }, { type: 'separator' as const }]),
    {
      label: 'Test Animation',
      click: () => overlayManager.showTest(calendarManager.getUpcomingMeetings()),
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    {
      label: settings.soundEnabled ? 'Mute Sounds' : 'Unmute Sounds',
      click: () => {
        const s = storeManager.getSettings()
        storeManager.saveSettings({ ...s, soundEnabled: !s.soundEnabled })
        updateTrayMenu()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.exit(0)
      },
    },
  ])

  tray?.setContextMenu(menu)
}

function setupIpc() {
  ipcMain.handle('get-settings', () => storeManager.getSettings())

  ipcMain.handle('save-settings', (_e, settings) => {
    storeManager.saveSettings(settings)
    updateTrayMenu()
    return true
  })

  ipcMain.handle('test-animation', () => {
    overlayManager.showTest(calendarManager.getUpcomingMeetings())
  })

  ipcMain.handle('open-url', (_e, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('get-upcoming-meetings', () => {
    return calendarManager.getUpcomingMeetings()
  })

  ipcMain.handle('get-auth-status', () => {
    return authManager.getStatus()
  })

  ipcMain.handle('connect-google', async () => {
    return authManager.connectGoogle()
  })

  ipcMain.handle('connect-microsoft', async (_e, useWorkAccount?: boolean) => {
    return authManager.connectMicrosoft(useWorkAccount)
  })

  ipcMain.handle('disconnect-google', async () => {
    return authManager.disconnectGoogle()
  })

  ipcMain.handle('disconnect-microsoft', async () => {
    return authManager.disconnectMicrosoft()
  })

  ipcMain.handle('overlay-click-join', (_e, url: string) => {
    shell.openExternal(url)
    overlayManager.hide()
  })
}

app.whenReady().then(async () => {
  // Load .env (dev credentials)
  loadEnv({ path: path.join(app.getAppPath(), '.env') })

  storeManager = new StoreManager()
  authManager = new AuthManager(storeManager)
  calendarManager = new CalendarManager(authManager, storeManager)
  overlayManager = new OverlayManager(storeManager)
  scheduler = new ReminderScheduler(calendarManager, overlayManager, storeManager)

  await createMainWindow()
  createTray()
  setupIpc()

  // Start polling calendars
  await calendarManager.init()
  scheduler.start()

  // Refresh tray every minute
  setInterval(updateTrayMenu, 60_000)
})

app.on('window-all-closed', () => {
  // Keep running in tray
})

app.on('activate', () => {
  mainWindow?.show()
})
