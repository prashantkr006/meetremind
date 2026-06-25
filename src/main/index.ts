import { app, BrowserWindow, ipcMain, shell, Tray, Menu, screen } from 'electron'
import path from 'path'
import { config as loadEnv } from 'dotenv'
import { StoreManager } from './store'
import { OverlayManager } from './overlay'
import { CalendarManager } from './calendar'
import { AuthManager } from './auth'
import { ReminderEngine } from './reminders'
import { createTrayIcon } from './trayIcon'

function isDev() { return process.env.NODE_ENV === 'development' }

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let storeManager: StoreManager
let overlayManager: OverlayManager
let calendarManager: CalendarManager
let authManager: AuthManager
let reminderEngine: ReminderEngine

app.setName('MeetRemind')

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

function getAppIcon() {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  return path.join(app.getAppPath(), 'assets', 'icons', iconName)
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'MeetRemind',
    icon: getAppIcon(),
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

  if (isDev()) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())
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
    click: () => { if (m.joinUrl) shell.openExternal(m.joinUrl) },
  }))

  const menu = Menu.buildFromTemplate([
    { label: 'MeetRemind', enabled: false },
    { type: 'separator' },
    ...(meetingItems.length > 0
      ? [...meetingItems, { type: 'separator' as const }]
      : [{ label: 'No upcoming meetings', enabled: false }, { type: 'separator' as const }]),
    {
      label: 'Test Animation',
      click: () => reminderEngine.triggerTest(calendarManager.getUpcomingMeetings()),
    },
    {
      label: 'Settings',
      click: () => { mainWindow?.show(); mainWindow?.focus() },
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
    { label: 'Quit', click: () => app.exit(0) },
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
    reminderEngine.triggerTest(calendarManager.getUpcomingMeetings())
  })

  ipcMain.handle('open-url', (_e, url: string) => shell.openExternal(url))

  ipcMain.handle('get-upcoming-meetings', () => calendarManager.getUpcomingMeetings())

  ipcMain.handle('get-auth-status', () => authManager.getStatus())

  ipcMain.handle('connect-google', async () => authManager.connectGoogle())

  ipcMain.handle('connect-microsoft', async (_e, useWorkAccount?: boolean) =>
    authManager.connectMicrosoft(useWorkAccount),
  )

  ipcMain.handle('disconnect-google', async () => authManager.disconnectGoogle())

  ipcMain.handle('disconnect-microsoft', async () => authManager.disconnectMicrosoft())

  ipcMain.handle('overlay-click-join', (_e, url: string) => {
    shell.openExternal(url)
    overlayManager.hide()
  })
}

app.whenReady().then(async () => {
  loadEnv({ path: path.join(app.getAppPath(), '.env') })

  storeManager   = new StoreManager()
  authManager    = new AuthManager(storeManager)
  calendarManager = new CalendarManager(authManager, storeManager)
  overlayManager  = new OverlayManager(storeManager)
  reminderEngine  = new ReminderEngine(calendarManager, overlayManager, storeManager)

  await createMainWindow()
  createTray()
  setupIpc()

  await calendarManager.init()
  reminderEngine.start()

  setInterval(updateTrayMenu, 60_000)
})

app.on('window-all-closed', () => { /* stay in tray */ })

app.on('activate', () => mainWindow?.show())
