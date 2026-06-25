import type { Meeting } from '../../shared/types'
import type { ReminderEvent } from './types'
import { CalendarManager } from '../calendar'
import { OverlayManager } from '../overlay'
import { StoreManager } from '../store'
import { resolveProfile } from './ReminderProfile'
import { buildReminderEvent } from './ReminderEvent'
import { ReminderPipeline } from './ReminderPipeline'
import { ReminderQueue } from './ReminderQueue'
import { contextProvider } from './ReminderContext'

// How often the engine re-reads meetings and rebuilds the timer schedule.
// Does NOT make API calls — only reads the in-memory list from CalendarManager.
const RESCHEDULE_INTERVAL_MS = 60_000

export class ReminderEngine {
  private calendar: CalendarManager
  private overlay: OverlayManager
  private store: StoreManager
  private pipeline: ReminderPipeline
  private queue: ReminderQueue
  private rescheduleTimer: NodeJS.Timeout | null = null

  // Tracks which (meetingId:minutes) keys have already fired this session
  private fired = new Set<string>()

  constructor(
    calendar: CalendarManager,
    overlay: OverlayManager,
    store: StoreManager,
  ) {
    this.calendar = calendar
    this.overlay = overlay
    this.store = store
    this.pipeline = new ReminderPipeline(contextProvider)
    this.queue = new ReminderQueue()
  }

  start(): void {
    if (this.rescheduleTimer) return
    this.calendar.start()
    this.reschedule()
    this.rescheduleTimer = setInterval(() => this.reschedule(), RESCHEDULE_INTERVAL_MS)
  }

  stop(): void {
    if (this.rescheduleTimer) {
      clearInterval(this.rescheduleTimer)
      this.rescheduleTimer = null
    }
    this.queue.clear()
    this.calendar.stop()
  }

  // Called by the tray / IPC test action — bypasses the pipeline for immediacy
  async triggerTest(meetings: Meeting[]): Promise<void> {
    await this.overlay.showTest(meetings)
  }

  // Snapshot of what's queued — usable by future "upcoming reminders" UI
  upcomingEvents(): ReminderEvent[] {
    return this.queue.snapshot()
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private reschedule(): void {
    this.queue.clear()
    const settings = this.store.getSettings()
    const meetings = this.calendar.getAllUpcoming()
    const now = Date.now()

    const profile = resolveProfile(
      settings.activeReminderProfileId,
      settings.customReminderProfiles,
    )

    const enabledStages = profile.stages.filter((s) => s.enabled)

    for (const meeting of meetings) {
      const startMs = new Date(meeting.startTime).getTime()

      for (const stage of enabledStages) {
        const fireAt = startMs - stage.minutesBefore * 60_000
        const delay = fireAt - now

        // Skip if the fire time has already passed
        if (delay < 0) continue

        const eventKey = `${meeting.id}:${stage.minutesBefore}`
        if (this.fired.has(eventKey)) continue

        const partialEvent = buildReminderEvent(meeting, stage.minutesBefore, profile)
        const event: ReminderEvent = { ...partialEvent, context: 'UNKNOWN' }

        const timer = setTimeout(() => this.fire(event), delay)
        this.queue.add({ event, timer })
      }
    }

    // Evict stale fired keys for meetings that are over
    const liveIds = new Set(meetings.map((m) => m.id))
    for (const key of this.fired) {
      const meetingId = key.split(':')[0]
      if (!liveIds.has(meetingId)) this.fired.delete(key)
    }
  }

  private async fire(event: ReminderEvent): Promise<void> {
    // Mark fired before pipeline in case pipeline is slow
    this.fired.add(event.id)

    const result = await this.pipeline.run(event)
    if (!result) return // suppressed by a pipeline stage

    const firedEvent: ReminderEvent = { ...result, firedAt: new Date() }
    await this.overlay.show(firedEvent.meeting, firedEvent.minutesBefore)
  }
}
