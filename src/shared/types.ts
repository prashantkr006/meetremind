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

export interface AppSettings {
  reminders: ReminderTiming[]
  customReminders: number[]
  animationDuration: number  // seconds
  animationSpeed: 'slow' | 'medium' | 'fast'
  messageTemplate: string
  planeColor: string
  bannerColor: string
  textColor: string
  fontFamily: string
  fontSize: number
  fontWeight: string
  soundEnabled: boolean
  soundVolume: number
  customSoundPath?: string
  platformThemes: Record<Platform, Partial<PlatformTheme>>
  launchAtLogin: boolean
  googleCalendarEnabled: boolean
  microsoftCalendarEnabled: boolean
}


export interface ReminderPayload {
  meeting: Meeting
  minutesBefore: number
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
