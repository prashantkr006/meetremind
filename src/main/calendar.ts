import { google } from 'googleapis'
import { AuthManager } from './auth'
import { StoreManager } from './store'
import { Meeting, Platform } from '../shared/types'

function detectPlatform(text: string): Platform {
  if (/zoom\.us/i.test(text)) return 'zoom'
  if (/teams\.microsoft\.com/i.test(text)) return 'teams'
  if (/meet\.google\.com/i.test(text)) return 'google'
  return 'unknown'
}

function extractJoinUrl(text: string): string | undefined {
  const patterns = [
    /https:\/\/[\w.-]*zoom\.us\/j\/[\w?=&%]+/i,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[\w%@./-]+/i,
    /https:\/\/meet\.google\.com\/[\w-]+/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[0]
  }
  return undefined
}

export class CalendarManager {
  private auth: AuthManager
  private store: StoreManager
  private meetings: Meeting[] = []
  private pollInterval: NodeJS.Timeout | null = null

  constructor(auth: AuthManager, store: StoreManager) {
    this.auth = auth
    this.store = store
  }

  async init() {
    await this.auth.init()
    await this.sync()
  }

  getUpcomingMeetings(): Meeting[] {
    const now = Date.now()
    const twoHours = 2 * 60 * 60 * 1000
    return this.meetings
      .filter((m) => new Date(m.startTime).getTime() > now - 60_000 &&
                     new Date(m.startTime).getTime() < now + twoHours)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }

  getAllUpcoming(): Meeting[] {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    return this.meetings
      .filter((m) => new Date(m.startTime).getTime() > now - 60_000 &&
                     new Date(m.startTime).getTime() < now + dayMs)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }

  start() {
    if (this.pollInterval) return
    this.pollInterval = setInterval(() => this.sync(), 3 * 60_000)
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  async sync() {
    const all: Meeting[] = []
    try {
      const google = await this.fetchGoogleMeetings()
      all.push(...google)
    } catch (e) {
      console.error('Google calendar sync failed:', e)
    }
    try {
      const ms = await this.fetchMicrosoftMeetings()
      all.push(...ms)
    } catch (e) {
      console.error('Microsoft calendar sync failed:', e)
    }

    // Deduplicate by id
    const seen = new Set<string>()
    this.meetings = all.filter((m) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
  }

  private async fetchGoogleMeetings(): Promise<Meeting[]> {
    const client = this.auth.getGoogleClient()
    if (!client) return []

    const cal = google.calendar({ version: 'v3', auth: client })
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const resp = await cal.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: tomorrow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    })

    return (resp.data.items ?? []).map((e) => {
      const desc = e.description ?? ''
      const loc = e.location ?? ''
      const combined = desc + ' ' + loc
      const joinUrl = e.hangoutLink ?? extractJoinUrl(combined)
      const platform = joinUrl ? detectPlatform(joinUrl) : detectPlatform(combined)

      return {
        id: `google-${e.id}`,
        title: e.summary ?? 'Untitled',
        startTime: new Date(e.start?.dateTime ?? e.start?.date ?? ''),
        endTime: new Date(e.end?.dateTime ?? e.end?.date ?? ''),
        joinUrl,
        platform,
        calendarSource: 'google' as const,
      }
    })
  }

  private async fetchMicrosoftMeetings(): Promise<Meeting[]> {
    const token = this.auth.getMicrosoftToken()
    if (!token) return []

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const url =
      `https://graph.microsoft.com/v1.0/me/calendarview` +
      `?startDateTime=${now.toISOString()}&endDateTime=${tomorrow.toISOString()}` +
      `&$orderby=start/dateTime&$top=50` +
      `&$select=id,subject,start,end,onlineMeeting,bodyPreview,location`

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resp.ok) {
      if (resp.status === 401) await this.auth.disconnectMicrosoft()
      throw new Error(`Microsoft Graph error ${resp.status}`)
    }

    const data = (await resp.json()) as {
      value: Array<{
        id: string
        subject: string
        start: { dateTime: string }
        end: { dateTime: string }
        onlineMeeting?: { joinUrl?: string }
        bodyPreview: string
        location?: { displayName?: string }
      }>
    }

    return (data.value ?? []).map((e) => {
      const combined = (e.bodyPreview ?? '') + ' ' + (e.location?.displayName ?? '')
      const joinUrl = e.onlineMeeting?.joinUrl ?? extractJoinUrl(combined)
      const platform = joinUrl ? detectPlatform(joinUrl) : detectPlatform(combined)

      return {
        id: `ms-${e.id}`,
        title: e.subject ?? 'Untitled',
        startTime: new Date(e.start.dateTime + 'Z'),
        endTime: new Date(e.end.dateTime + 'Z'),
        joinUrl,
        platform,
        calendarSource: 'microsoft' as const,
      }
    })
  }
}
