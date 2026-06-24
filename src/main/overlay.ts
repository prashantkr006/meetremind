import { BrowserWindow, screen } from 'electron'
import path from 'path'
import { StoreManager } from './store'
import type { Meeting, ReminderPayload } from '../shared/types'

const SPEED_MULTIPLIERS: Record<string, number> = { slow: 1.6, medium: 1.0, fast: 0.6 }

function isDev() {
  return process.env.NODE_ENV === 'development'
}

export class OverlayManager {
  private window: BrowserWindow | null = null
  private store: StoreManager
  private hideTimer: NodeJS.Timeout | null = null

  constructor(store: StoreManager) {
    this.store = store
  }

  private async getOrCreateWindow(): Promise<BrowserWindow> {
    if (this.window && !this.window.isDestroyed()) {
      return this.window
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    const OVERLAY_HEIGHT = 200

    this.window = new BrowserWindow({
      width,
      height: OVERLAY_HEIGHT,
      x: 0,
      y: Math.floor(height * 0.15),
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    this.window.setIgnoreMouseEvents(true, { forward: true })

    if (isDev()) {
      await this.window.loadURL('http://localhost:5174')
    } else {
      await this.window.loadFile(path.join(__dirname, '../../overlay/index.html'))
    }

    this.window.on('closed', () => {
      this.window = null
    })

    return this.window
  }

  async show(meeting: Meeting, minutesBefore: number): Promise<void> {
    const settings = this.store.getSettings()
    const win = await this.getOrCreateWindow()

    const platformTheme = settings.platformThemes[meeting.platform] ?? {}
    const payload: ReminderPayload & { platformTheme: typeof platformTheme } = {
      meeting: { ...meeting, startTime: meeting.startTime, endTime: meeting.endTime },
      minutesBefore,
      settings,
      platformTheme,
    }

    win.setIgnoreMouseEvents(false)
    win.show()
    win.webContents.send('show-animation', payload)

    // Hide after animation completes (speed-aware) + small buffer
    const multiplier = SPEED_MULTIPLIERS[settings.animationSpeed] ?? 1.0
    const animMs = settings.animationDuration * 1000 * multiplier
    if (this.hideTimer) clearTimeout(this.hideTimer)
    this.hideTimer = setTimeout(() => this.hide(), animMs + 1500)
  }

  async showTest(upcomingMeetings: Meeting[] = []): Promise<void> {
    // Use the nearest real meeting if calendar is connected
    if (upcomingMeetings.length > 0) {
      const next = upcomingMeetings[0]
      const minsLeft = Math.max(1, Math.round((new Date(next.startTime).getTime() - Date.now()) / 60_000))
      await this.show(next, minsLeft)
      return
    }

    // Demo meeting when no calendar connected
    const testMeeting: Meeting = {
      id: 'test',
      title: 'Team Standup',
      startTime: new Date(Date.now() + 5 * 60_000),
      endTime: new Date(Date.now() + 35 * 60_000),
      joinUrl: 'https://meet.google.com/test',
      platform: 'google',
      calendarSource: 'google',
    }
    await this.show(testMeeting, 5)
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide()
      this.window.setIgnoreMouseEvents(true, { forward: true })
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }
}
