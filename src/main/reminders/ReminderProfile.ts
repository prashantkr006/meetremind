import type { ReminderProfileConfig } from '../../shared/types'

export const BUILTIN_PROFILES: ReadonlyArray<ReminderProfileConfig> = [
  {
    id: 'default',
    name: 'Default',
    isBuiltIn: true,
    stages: [
      { minutesBefore: 15, urgency: 'LOW',    enabled: true },
      { minutesBefore: 5,  urgency: 'NORMAL', enabled: true },
      { minutesBefore: 1,  urgency: 'HIGH',   enabled: true },
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    isBuiltIn: true,
    stages: [
      { minutesBefore: 5, urgency: 'NORMAL', enabled: true },
      { minutesBefore: 1, urgency: 'HIGH',   enabled: true },
    ],
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    isBuiltIn: true,
    stages: [
      { minutesBefore: 30, urgency: 'LOW',      enabled: true },
      { minutesBefore: 20, urgency: 'LOW',      enabled: true },
      { minutesBefore: 15, urgency: 'LOW',      enabled: true },
      { minutesBefore: 10, urgency: 'NORMAL',   enabled: true },
      { minutesBefore: 5,  urgency: 'NORMAL',   enabled: true },
      { minutesBefore: 2,  urgency: 'HIGH',     enabled: true },
      { minutesBefore: 1,  urgency: 'CRITICAL', enabled: true },
    ],
  },
]

export function resolveProfile(
  id: string,
  customProfiles: ReminderProfileConfig[],
): ReminderProfileConfig {
  const custom = customProfiles.find((p) => p.id === id)
  if (custom) return custom
  const builtin = BUILTIN_PROFILES.find((p) => p.id === id)
  if (builtin) return builtin
  // Fallback to default if id not found
  return BUILTIN_PROFILES[0]
}

export function allProfiles(customProfiles: ReminderProfileConfig[]): ReminderProfileConfig[] {
  return [...BUILTIN_PROFILES, ...customProfiles]
}
