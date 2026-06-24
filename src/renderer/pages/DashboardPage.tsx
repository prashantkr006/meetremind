import React, { useEffect, useState } from 'react'
import type { Meeting } from '@shared/types'

function IconPlane({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
    </svg>
  )
}

function IconWarning({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z" />
    </svg>
  )
}

function IconCalendar({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-slate-600">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14zm0-10H5V5h14zM7 10h5v5H7z" />
    </svg>
  )
}

type API = typeof window extends { electronAPI: infer T } ? T : never

function getAPI() {
  return (window as unknown as { electronAPI?: Record<string, (...args: unknown[]) => Promise<unknown>> }).electronAPI
}

const PLATFORM_COLORS: Record<string, string> = {
  google: 'bg-green-900 text-green-300 border-green-700',
  teams: 'bg-purple-900 text-purple-300 border-purple-700',
  zoom: 'bg-blue-900 text-blue-300 border-blue-700',
  unknown: 'bg-slate-700 text-slate-300 border-slate-600',
}

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google Meet',
  teams: 'Teams',
  zoom: 'Zoom',
  unknown: 'Unknown',
}

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [authStatus, setAuthStatus] = useState({ google: false, microsoft: false })
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)

  const load = async () => {
    const api = getAPI()
    if (!api) return
    const [m, auth] = await Promise.all([
      api.getUpcomingMeetings() as Promise<Meeting[]>,
      api.getAuthStatus() as Promise<{ google: boolean; microsoft: boolean }>,
    ])
    setMeetings(m)
    setAuthStatus(auth)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  const testAnimation = async () => {
    setTesting(true)
    const api = getAPI()
    await api?.testAnimation()
    setTimeout(() => setTesting(false), 1500)
  }

  const now = Date.now()

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Your upcoming meetings for today</p>
        </div>
        <button
          onClick={testAnimation}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <IconPlane />
          {testing ? 'Launching...' : 'Test Animation'}
        </button>
      </div>

      {/* Auth status */}
      {!authStatus.google && !authStatus.microsoft && (
        <div className="bg-amber-900/40 border border-amber-700 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-400"><IconWarning /></span>
            <div>
              <div className="text-amber-300 font-medium">No calendars connected</div>
              <div className="text-amber-400/80 text-sm mt-1">
                Go to <strong>Calendar</strong> to connect Google or Microsoft. Reminders still work — use "Test Animation" to preview.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected badges */}
      {(authStatus.google || authStatus.microsoft) && (
        <div className="flex gap-2 mb-6">
          {authStatus.google && (
            <span className="px-3 py-1 bg-green-900/50 border border-green-700 text-green-300 rounded-full text-xs font-medium">
              ✓ Google Calendar
            </span>
          )}
          {authStatus.microsoft && (
            <span className="px-3 py-1 bg-purple-900/50 border border-purple-700 text-purple-300 rounded-full text-xs font-medium">
              ✓ Microsoft Calendar
            </span>
          )}
        </div>
      )}

      {/* Meetings */}
      {loading ? (
        <div className="text-slate-500 text-center py-16">Loading meetings...</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex justify-center mb-3 text-slate-600"><IconCalendar /></div>
          <div className="text-slate-400 font-medium">No meetings in the next 2 hours</div>
          <div className="text-slate-600 text-sm mt-1">Enjoy the break!</div>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const start = new Date(m.startTime)
            const minsUntil = Math.round((start.getTime() - now) / 60_000)
            const isNow = minsUntil <= 0 && minsUntil > -30

            return (
              <div
                key={m.id}
                className={`bg-slate-800 border rounded-xl p-4 flex items-center gap-4 transition-all ${
                  isNow ? 'border-blue-500 shadow-lg shadow-blue-900/30' : 'border-slate-700'
                }`}
              >
                <div className="text-center min-w-[60px]">
                  <div className="text-white font-bold text-sm">
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={`text-xs mt-0.5 font-medium ${isNow ? 'text-blue-400' : 'text-slate-500'}`}>
                    {isNow ? 'Now' : minsUntil > 0 ? `in ${minsUntil}m` : 'Started'}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{m.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${PLATFORM_COLORS[m.platform]}`}>
                      {PLATFORM_LABELS[m.platform]}
                    </span>
                  </div>
                </div>

                {m.joinUrl && (
                  <button
                    onClick={() => getAPI()?.openUrl(m.joinUrl!)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors shrink-0"
                  >
                    Join →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
