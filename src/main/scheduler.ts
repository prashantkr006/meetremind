import { CalendarManager } from './calendar'
import { OverlayManager } from './overlay'
import { StoreManager } from './store'
import { Meeting } from '../shared/types'

interface FiredKey {
  meetingId: string
  minutes: number
}

export class ReminderScheduler {
  private calendar: CalendarManager
  private overlay: OverlayManager
  private store: StoreManager
  private interval: NodeJS.Timeout | null = null
  private fired = new Set<string>()

  constructor(cal: CalendarManager, overlay: OverlayManager, store: StoreManager) {
    this.calendar = cal
    this.overlay = overlay
    this.store = store
  }

  start() {
    if (this.interval) return
    this.check()
    this.interval = setInterval(() => this.check(), 30_000) // check every 30s
    this.calendar.start()
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.calendar.stop()
  }

  private check() {
    const settings = this.store.getSettings()
    const meetings = this.calendar.getAllUpcoming()
    const now = Date.now()

    const reminderMinutes = [
      ...settings.reminders.filter((r) => r.enabled).map((r) => r.minutes),
      ...settings.customReminders,
    ]

    for (const meeting of meetings) {
      const startMs = new Date(meeting.startTime).getTime()
      const minutesUntil = (startMs - now) / 60_000

      for (const mins of reminderMinutes) {
        // Fire if we're within 30s of the target window
        if (minutesUntil <= mins && minutesUntil > mins - 0.5) {
          const key = `${meeting.id}:${mins}`
          if (!this.fired.has(key)) {
            this.fired.add(key)
            this.overlay.show(meeting, mins)
          }
        }
      }
    }

    // Clean up fired keys for meetings that have passed
    for (const key of this.fired) {
      const [id] = key.split(':')
      const meeting = meetings.find((m) => m.id === id)
      if (!meeting || new Date(meeting.startTime).getTime() < now - 60_000) {
        this.fired.delete(key)
      }
    }
  }
}
