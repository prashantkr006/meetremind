import React, { useEffect, useState } from 'react'

function getAPI() {
  return (window as unknown as { electronAPI?: Record<string, (...args: unknown[]) => Promise<unknown>> }).electronAPI
}

export default function CalendarPage() {
  const [status, setStatus] = useState({ google: false, microsoft: false })
  const [loading, setLoading] = useState<'google' | 'microsoft' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msAccountType, setMsAccountType] = useState<'personal' | 'work'>('personal')

  const refreshStatus = async () => {
    const api = getAPI()
    if (!api) return
    const s = await api.getAuthStatus() as { google: boolean; microsoft: boolean }
    setStatus(s)
  }

  useEffect(() => { refreshStatus() }, [])

  const connectGoogle = async () => {
    setLoading('google')
    setError(null)
    const api = getAPI()
    const result = await api?.connectGoogle() as { success: boolean; error?: string }
    if (!result?.success) setError(result?.error ?? 'Connection failed')
    await refreshStatus()
    setLoading(null)
  }

  const connectMicrosoft = async () => {
    setLoading('microsoft')
    setError(null)
    const api = getAPI()
    const result = await api?.connectMicrosoft(msAccountType === 'work') as { success: boolean; error?: string }
    if (!result?.success) setError(result?.error ?? 'Connection failed')
    await refreshStatus()
    setLoading(null)
  }

  const disconnect = async (provider: 'google' | 'microsoft') => {
    setError(null)
    const api = getAPI()
    if (provider === 'google') await api?.disconnectGoogle()
    else await api?.disconnectMicrosoft()
    await refreshStatus()
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Calendar Integration</h1>
      <p className="text-slate-400 text-sm mb-8">
        Connect your calendars to automatically detect upcoming meetings. Tokens are stored securely in your OS keychain.
      </p>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl p-4 mb-6 text-sm whitespace-pre-line">
          <div className="font-semibold mb-1">Connection failed</div>
          {error}
        </div>
      )}

      {/* Google Calendar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 mt-0.5 shrink-0">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="8" fill="#fff"/>
              <path d="M34 14H14a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V16a2 2 0 0 0-2-2z" fill="#1a73e8"/>
              <path d="M14 22h20M22 14v20" stroke="#fff" strokeWidth="2"/>
              <rect x="18" y="25" width="5" height="5" rx="1" fill="#fff"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-semibold">Google Calendar</span>
              {status.google && (
                <span className="text-xs px-2 py-0.5 bg-green-900 text-green-300 border border-green-700 rounded-full">
                  Connected
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm">Sync meetings from Gmail / Google Workspace. Detects Google Meet links automatically.</p>
          </div>
          <div className="shrink-0">
            {status.google ? (
              <button onClick={() => disconnect('google')}
                className="px-3 py-1.5 text-sm text-red-400 border border-red-800 hover:bg-red-900/40 rounded-lg transition-colors">
                Disconnect
              </button>
            ) : (
              <button onClick={connectGoogle} disabled={loading === 'google'}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors">
                {loading === 'google' ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Microsoft */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 mt-0.5 shrink-0">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="8" fill="#fff"/>
              <rect x="10" y="10" width="13" height="13" fill="#f25022"/>
              <rect x="25" y="10" width="13" height="13" fill="#7fba00"/>
              <rect x="10" y="25" width="13" height="13" fill="#00a4ef"/>
              <rect x="25" y="25" width="13" height="13" fill="#ffb900"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-semibold">Microsoft Outlook / Teams</span>
              {status.microsoft && (
                <span className="text-xs px-2 py-0.5 bg-green-900 text-green-300 border border-green-700 rounded-full">
                  Connected
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mb-3">Sync from Outlook or Office 365. Detects Teams meeting links in invites.</p>

            {!status.microsoft && (
              <div className="flex items-center gap-1 mb-1">
                <span className="text-slate-400 text-xs mr-2">Account type:</span>
                <button
                  onClick={() => setMsAccountType('personal')}
                  className={`px-3 py-1 text-xs rounded-l-lg border transition-colors ${
                    msAccountType === 'personal'
                      ? 'bg-blue-700 border-blue-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Personal (Outlook.com / Hotmail)
                </button>
                <button
                  onClick={() => setMsAccountType('work')}
                  className={`px-3 py-1 text-xs rounded-r-lg border-t border-b border-r transition-colors ${
                    msAccountType === 'work'
                      ? 'bg-blue-700 border-blue-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Work / School
                </button>
              </div>
            )}

            {!status.microsoft && msAccountType === 'work' && (
              <div className="mt-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-800/50 rounded-lg p-2">
                If your organization blocks this (error AADSTS5000225), your IT admin must approve the app in Azure AD.
                Share this with them: <span className="font-mono">Enterprise Apps → Admin consent → App ID in .env</span>
              </div>
            )}
          </div>
          <div className="shrink-0">
            {status.microsoft ? (
              <button onClick={() => disconnect('microsoft')}
                className="px-3 py-1.5 text-sm text-red-400 border border-red-800 hover:bg-red-900/40 rounded-lg transition-colors">
                Disconnect
              </button>
            ) : (
              <button onClick={connectMicrosoft} disabled={loading === 'microsoft'}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors">
                {loading === 'microsoft' ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-slate-300 font-semibold mb-2 text-sm">How it works</h3>
        <ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
          <li>Calendars are polled every 3 minutes</li>
          <li>Zoom, Google Meet, and Teams links are auto-detected</li>
          <li>Tokens are stored securely in your OS keychain — never on a server</li>
          <li>Token refresh happens automatically in the background</li>
        </ul>
      </div>
    </div>
  )
}
