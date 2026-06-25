import type { AppSettings } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  // Legacy (kept for migration)
  reminders: [
    { minutes: 5, enabled: true },
    { minutes: 10, enabled: false },
    { minutes: 15, enabled: true },
  ],
  customReminders: [],

  // Reminder Engine v2
  activeReminderProfileId: 'default',
  customReminderProfiles: [],
  reminderCountdownEnabled: true,

  // Animation
  animationDuration: 8,
  animationSpeed: 'medium',
  messageTemplate: '{title} starts in {minutes} min on {platform}',
  planeColor: '#3B82F6',
  bannerColor: '#FFFFFF',
  textColor: '#1F2937',
  fontFamily: 'Inter',
  fontSize: 18,
  fontWeight: '600',

  // Sound
  soundEnabled: true,
  soundVolume: 0.7,

  // Platform themes
  platformThemes: {
    google: {},
    teams: {},
    zoom: {},
    unknown: {},
  },

  // System
  launchAtLogin: false,
  googleCalendarEnabled: false,
  microsoftCalendarEnabled: false,
}
