import React, { useEffect, useState } from 'react'
import AirplaneAnimation from './AirplaneAnimation'
import type { ReminderPayload } from '@shared/types'

export default function App() {
  const [payload, setPayload] = useState<(ReminderPayload & { platformTheme?: Record<string, string> }) | null>(null)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const api = (window as unknown as { electronAPI?: { onShowAnimation?: (cb: (p: unknown) => void) => void } }).electronAPI
    if (api?.onShowAnimation) {
      api.onShowAnimation((p) => {
        setPayload(p as ReminderPayload)
        setKey((k) => k + 1)
      })
    }
  }, [])

  if (!payload) {
    // In dev mode, show a test animation on load
    return (
      <DevTestAnimation />
    )
  }

  return <AirplaneAnimation key={key} payload={payload} />
}

function DevTestAnimation() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Auto-trigger in dev after 500ms
    const t = setTimeout(() => setShow(true), 500)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  const testPayload: ReminderPayload = {
    meeting: {
      id: 'dev-test',
      title: 'Team Standup',
      startTime: new Date(Date.now() + 5 * 60_000),
      endTime: new Date(Date.now() + 35 * 60_000),
      joinUrl: 'https://meet.google.com/test',
      platform: 'google',
      calendarSource: 'google',
    },
    minutesBefore: 5,
    settings: {
      reminders: [],
      customReminders: [],
      animationDuration: 8,
      animationSpeed: 'medium',
      messageTemplate: '{title} starts in {minutes} min on {platform}',
      planeColor: '#3B82F6',
      bannerColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter',
      fontSize: 18,
      fontWeight: '600',
      soundEnabled: false,
      soundVolume: 0.7,
      platformThemes: { google: {}, teams: {}, zoom: {}, unknown: {} },
      launchAtLogin: false,
      googleCalendarEnabled: false,
      microsoftCalendarEnabled: false,
    },
  }

  return <AirplaneAnimation key="dev" payload={testPayload} />
}
