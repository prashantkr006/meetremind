import type { Meeting, ReminderProfileConfig } from '../../shared/types'
import type { ReminderEvent } from './types'
import { computeStage, computeUrgency } from './ReminderState'

// Builds a ReminderEvent from its constituent parts.
// Context is supplied separately (async) by the pipeline.
export function buildReminderEvent(
  meeting: Meeting,
  minutesBefore: number,
  profile: ReminderProfileConfig,
): Omit<ReminderEvent, 'context'> {
  const startMs = new Date(meeting.startTime).getTime()
  const scheduledAt = new Date(startMs - minutesBefore * 60_000)

  // Use urgency from profile stage definition if present; fall back to computed
  const profileStage = profile.stages.find((s) => s.minutesBefore === minutesBefore)
  const urgency = profileStage?.urgency ?? computeUrgency(minutesBefore)

  return {
    id: `${meeting.id}:${minutesBefore}`,
    meeting,
    minutesBefore,
    stage: computeStage(minutesBefore),
    urgency,
    profile,
    scheduledAt,
    // Future fields — undefined until implemented
    theme: undefined,
    vehicle: undefined,
    weather: undefined,
    aiSummary: undefined,
  }
}
