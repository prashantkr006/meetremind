import type {
  Meeting,
  ReminderUrgency,
  MeetingStage,
  UserContext,
  ReminderProfileConfig,
} from '../../shared/types'

// A single reminder event — everything needed to display one reminder
export interface ReminderEvent {
  readonly id: string                    // `${meetingId}:${minutesBefore}`
  readonly meeting: Meeting
  readonly minutesBefore: number
  readonly stage: MeetingStage
  readonly urgency: ReminderUrgency
  readonly context: UserContext
  readonly profile: ReminderProfileConfig
  readonly scheduledAt: Date             // wall-clock time this should fire
  firedAt?: Date                         // set when actually dispatched

  // Future extension slots — typed but not yet implemented
  readonly theme?: string                // future: custom animation theme
  readonly vehicle?: string              // future: rocket, train, etc.
  readonly weather?: unknown             // future: weather-aware theming
  readonly aiSummary?: string            // future: AI meeting brief
}

// A rule can suppress a reminder by returning false
export interface ReminderRule {
  readonly name: string
  evaluate(event: ReminderEvent): boolean
}

// A pipeline stage transforms or suppresses an event
export interface PipelineStage {
  readonly name: string
  process(event: ReminderEvent): Promise<ReminderEvent | null>
}

// A context provider detects the current user activity
export interface ContextProvider {
  readonly name: string
  detect(): Promise<UserContext>
}

// Internal: a timer handle paired with its event
export interface ScheduledReminder {
  event: ReminderEvent
  timer: NodeJS.Timeout
}
