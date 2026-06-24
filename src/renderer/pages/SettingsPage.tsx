import React, { useEffect, useState, useCallback } from 'react'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { AppSettings, Platform } from '@shared/types'

function getAPI() {
  return (window as unknown as { electronAPI?: Record<string, (...args: unknown[]) => Promise<unknown>> }).electronAPI
}

const FONT_OPTIONS = [
  'Inter', 'Arial', 'Georgia', 'Verdana', 'Trebuchet MS',
  'Courier New', 'Comic Sans MS', 'Impact',
]

const PLATFORM_OPTIONS: { id: Platform; label: string; color: string }[] = [
  { id: 'google', label: 'Google Meet', color: 'text-green-400' },
  { id: 'teams', label: 'Microsoft Teams', color: 'text-purple-400' },
  { id: 'zoom', label: 'Zoom', color: 'text-blue-400' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [customMin, setCustomMin] = useState('')

  useEffect(() => {
    getAPI()?.getSettings().then((s) => {
      if (s) setSettings(s as AppSettings)
    })
  }, [])

  const save = useCallback(async (s: AppSettings) => {
    await getAPI()?.saveSettings(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  const update = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: val }
      save(next)
      return next
    })
  }

  const toggleReminder = (minutes: number) => {
    const next = settings.reminders.map((r) =>
      r.minutes === minutes ? { ...r, enabled: !r.enabled } : r
    )
    update('reminders', next)
  }

  const addCustomReminder = () => {
    const m = parseInt(customMin, 10)
    if (!m || m < 1 || m > 120) return
    if (settings.customReminders.includes(m)) return
    update('customReminders', [...settings.customReminders, m].sort((a, b) => a - b))
    setCustomMin('')
  }

  const removeCustomReminder = (m: number) => {
    update('customReminders', settings.customReminders.filter((x) => x !== m))
  }

  const updatePlatformTheme = (platform: Platform, key: string, val: string) => {
    const next: AppSettings = {
      ...settings,
      platformThemes: {
        ...settings.platformThemes,
        [platform]: { ...settings.platformThemes[platform], [key]: val },
      },
    }
    setSettings(next)
    save(next)
  }

  const testAnimation = () => getAPI()?.testAnimation()

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Customize your airplane reminder experience</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-400 text-sm">✓ Saved</span>}
          <button
            onClick={testAnimation}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            ✈️ Test Animation
          </button>
        </div>
      </div>

      {/* --- Reminder Timing --- */}
      <Section title="Reminder Timing" icon="⏰">
        <div className="mb-3">
          <Label>Notify me before meetings</Label>
          <div className="flex gap-3 mt-2 flex-wrap">
            {settings.reminders.map((r) => (
              <button
                key={r.minutes}
                onClick={() => toggleReminder(r.minutes)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  r.enabled
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {r.minutes} min
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Custom reminder times</Label>
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              min={1} max={120}
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomReminder()}
              placeholder="e.g. 20"
              className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={addCustomReminder}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-sm rounded-lg"
            >
              + Add
            </button>
          </div>
          {settings.customReminders.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {settings.customReminders.map((m) => (
                <span key={m} className="flex items-center gap-1 px-3 py-1 bg-slate-700 border border-slate-600 text-slate-300 rounded-full text-sm">
                  {m} min
                  <button onClick={() => removeCustomReminder(m)} className="text-slate-500 hover:text-red-400 ml-1">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* --- Message Template --- */}
      <Section title="Message Template" icon="💬">
        <Label>Template (use {'{title}'}, {'{minutes}'}, {'{platform}'})</Label>
        <input
          type="text"
          value={settings.messageTemplate}
          onChange={(e) => update('messageTemplate', e.target.value)}
          className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:outline-none focus:border-blue-500"
        />
        <div className="mt-2 px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 text-slate-400 text-sm font-mono">
          Preview: {settings.messageTemplate
            .replace('{title}', 'Team Standup')
            .replace('{minutes}', '5')
            .replace('{platform}', 'Google Meet')}
        </div>
      </Section>

      {/* --- Animation --- */}
      <Section title="Animation" icon="🎬">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Speed</Label>
            <select
              value={settings.animationSpeed}
              onChange={(e) => update('animationSpeed', e.target.value as AppSettings['animationSpeed'])}
              className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:outline-none"
            >
              <option value="slow">Slow</option>
              <option value="medium">Medium (default)</option>
              <option value="fast">Fast</option>
            </select>
          </div>
          <div>
            <Label>Duration (seconds): {settings.animationDuration}s</Label>
            <input
              type="range" min={3} max={20} step={1}
              value={settings.animationDuration}
              onChange={(e) => update('animationDuration', Number(e.target.value))}
              className="w-full mt-3"
            />
          </div>
        </div>
      </Section>

      {/* --- Appearance --- */}
      <Section title="Appearance" icon="🎨">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <ColorField label="Plane color" value={settings.planeColor} onChange={(v) => update('planeColor', v)} />
          <ColorField label="Banner color" value={settings.bannerColor} onChange={(v) => update('bannerColor', v)} />
          <ColorField label="Text color" value={settings.textColor} onChange={(v) => update('textColor', v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Font family</Label>
            <select
              value={settings.fontFamily}
              onChange={(e) => update('fontFamily', e.target.value)}
              className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:outline-none"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Font size: {settings.fontSize}px</Label>
            <input
              type="range" min={12} max={32} step={1}
              value={settings.fontSize}
              onChange={(e) => update('fontSize', Number(e.target.value))}
              className="w-full mt-3"
            />
          </div>
        </div>
        <div className="mt-4">
          <Label>Font weight</Label>
          <div className="flex gap-2 mt-2">
            {['400', '500', '600', '700'].map((w) => (
              <button
                key={w}
                onClick={() => update('fontWeight', w)}
                className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                  settings.fontWeight === w
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
                style={{ fontWeight: w }}
              >
                {w === '400' ? 'Regular' : w === '500' ? 'Medium' : w === '600' ? 'Semi-bold' : 'Bold'}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* --- Sound --- */}
      <Section title="Sound" icon="🔊">
        <div className="flex items-center justify-between mb-4">
          <Label>Enable sound</Label>
          <Toggle value={settings.soundEnabled} onChange={(v) => update('soundEnabled', v)} />
        </div>
        {settings.soundEnabled && (
          <div>
            <Label>Volume: {Math.round(settings.soundVolume * 100)}%</Label>
            <input
              type="range" min={0} max={1} step={0.05}
              value={settings.soundVolume}
              onChange={(e) => update('soundVolume', Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>
        )}
      </Section>

      {/* --- Per-platform overrides --- */}
      <Section title="Per-Platform Overrides" icon="🏷️">
        <p className="text-slate-500 text-sm mb-4">Leave blank to use default colors above.</p>
        {PLATFORM_OPTIONS.map((p) => (
          <div key={p.id} className="mb-5">
            <div className={`text-sm font-semibold mb-2 ${p.color}`}>{p.label}</div>
            <div className="grid grid-cols-3 gap-3">
              <ColorField
                label="Plane"
                value={(settings.platformThemes[p.id]?.planeColor) ?? ''}
                onChange={(v) => updatePlatformTheme(p.id, 'planeColor', v)}
                allowEmpty
              />
              <ColorField
                label="Banner"
                value={(settings.platformThemes[p.id]?.bannerColor) ?? ''}
                onChange={(v) => updatePlatformTheme(p.id, 'bannerColor', v)}
                allowEmpty
              />
              <ColorField
                label="Text"
                value={(settings.platformThemes[p.id]?.textColor) ?? ''}
                onChange={(v) => updatePlatformTheme(p.id, 'textColor', v)}
                allowEmpty
              />
            </div>
          </div>
        ))}
      </Section>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">{children}</div>
}

function ColorField({
  label, value, onChange, allowEmpty = false
}: {
  label: string; value: string; onChange: (v: string) => void; allowEmpty?: boolean
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={value || '#3B82F6'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-slate-600"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={allowEmpty ? 'Default' : '#000000'}
          className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 text-white text-xs rounded-lg focus:outline-none focus:border-blue-500 font-mono"
        />
      </div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-600'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}
