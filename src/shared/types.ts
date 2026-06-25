export type Platform = 'google' | 'teams' | 'zoom' | 'unknown'

export interface Meeting {
  id: string
  title: string
  startTime: Date
  endTime: Date
  joinUrl?: string
  platform: Platform
  calendarSource: 'google' | 'microsoft'
}

export interface ReminderTiming {
  minutes: number
  enabled: boolean
}

export interface PlatformTheme {
  planeColor: string
  bannerColor: string
  textColor: string
}

// ─── Reminder Engine Types ────────────────────────────────────────────────────

export type ReminderUrgency = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

export type MeetingStage =
  | 'NOT_SCHEDULED'
  | 'SCHEDULED'
  | 'UPCOMING_15'
  | 'UPCOMING_10'
  | 'UPCOMING_5'
  | 'UPCOMING_2'
  | 'FINAL_CALL'
  | 'STARTING'
  | 'ACTIVE'
  | 'ENDED'

export type UserContext = 'IDLE' | 'CODING' | 'BROWSER' | 'FULLSCREEN' | 'UNKNOWN'

export interface ReminderStageConfig {
  minutesBefore: number
  urgency: ReminderUrgency
  enabled: boolean
}

export interface ReminderProfileConfig {
  id: string
  name: string
  stages: ReminderStageConfig[]
  isBuiltIn?: boolean
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  // Legacy reminder config (kept for backward compatibility)
  reminders: ReminderTiming[]
  customReminders: number[]

  // Reminder Engine v2
  activeReminderProfileId: string
  customReminderProfiles: ReminderProfileConfig[]
  reminderCountdownEnabled: boolean

  // Animation
  animationDuration: number
  animationSpeed: 'slow' | 'medium' | 'fast'
  messageTemplate: string
  planeColor: string
  bannerColor: string
  textColor: string
  fontFamily: string
  fontSize: number
  fontWeight: string

  // Sound
  soundEnabled: boolean
  soundVolume: number
  customSoundPath?: string

  // Per-platform theming
  platformThemes: Record<Platform, Partial<PlatformTheme>>

  // System
  launchAtLogin: boolean
  googleCalendarEnabled: boolean
  microsoftCalendarEnabled: boolean
}

// ─── Overlay Payload (sent to renderer) ──────────────────────────────────────

export interface ReminderPayload {
  meeting: Meeting
  minutesBefore: number
  urgency?: ReminderUrgency
  stage?: MeetingStage
  settings: AppSettings
}

export type IpcChannels =
  | 'show-overlay'
  | 'hide-overlay'
  | 'test-animation'
  | 'get-settings'
  | 'save-settings'
  | 'open-url'
  | 'get-upcoming-meetings'
  | 'connect-google'
  | 'connect-microsoft'
  | 'disconnect-google'
  | 'disconnect-microsoft'
  | 'get-auth-status'
  | 'overlay-click-join'
