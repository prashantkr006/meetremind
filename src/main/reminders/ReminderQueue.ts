import type { ScheduledReminder, ReminderEvent } from './types'

// Maintains the ordered list of reminders waiting to fire.
// Primary use: scheduling timers + future "upcoming reminders" UI panel.
export class ReminderQueue {
  private items: ScheduledReminder[] = []

  add(item: ScheduledReminder): void {
    this.items.push(item)
    this.items.sort(
      (a, b) => a.event.scheduledAt.getTime() - b.event.scheduledAt.getTime(),
    )
  }

  // Cancel all pending timers and clear the queue
  clear(): void {
    for (const item of this.items) {
      clearTimeout(item.timer)
    }
    this.items = []
  }

  peek(): ReminderEvent | undefined {
    return this.items[0]?.event
  }

  size(): number {
    return this.items.length
  }

  // Returns upcoming events sorted by scheduled time (read-only snapshot)
  snapshot(): ReminderEvent[] {
    return this.items.map((i) => i.event)
  }
}
