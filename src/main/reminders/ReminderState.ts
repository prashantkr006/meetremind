import type { MeetingStage, ReminderUrgency } from '../../shared/types'

// Pure function: map minutes-before to a meeting stage
export function computeStage(minutesBefore: number): MeetingStage {
  if (minutesBefore > 15)  return 'SCHEDULED'
  if (minutesBefore > 10)  return 'UPCOMING_15'
  if (minutesBefore > 5)   return 'UPCOMING_10'
  if (minutesBefore > 2)   return 'UPCOMING_5'
  if (minutesBefore > 1)   return 'UPCOMING_2'
  if (minutesBefore > 0)   return 'FINAL_CALL'
  if (minutesBefore === 0) return 'STARTING'
  return 'ACTIVE'
}

// Pure function: map minutes-before to urgency
export function computeUrgency(minutesBefore: number): ReminderUrgency {
  if (minutesBefore > 10) return 'LOW'
  if (minutesBefore > 5)  return 'NORMAL'
  if (minutesBefore > 1)  return 'HIGH'
  return 'CRITICAL'
}

// Deterministic stage transitions — ordered list used for validation
export const STAGE_ORDER: MeetingStage[] = [
  'NOT_SCHEDULED',
  'SCHEDULED',
  'UPCOMING_15',
  'UPCOMING_10',
  'UPCOMING_5',
  'UPCOMING_2',
  'FINAL_CALL',
  'STARTING',
  'ACTIVE',
  'ENDED',
]

export function stageIndex(stage: MeetingStage): number {
  return STAGE_ORDER.indexOf(stage)
}

// Returns true if transitioning from `from` to `to` is a valid forward move
export function isValidTransition(from: MeetingStage, to: MeetingStage): boolean {
  return stageIndex(to) > stageIndex(from)
}
