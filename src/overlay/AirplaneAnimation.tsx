import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReminderPayload, AppSettings, Platform } from '@shared/types'

interface Props {
  payload: ReminderPayload & { platformTheme?: Record<string, string> }
}

const PLATFORM_LABELS: Record<Platform, string> = {
  google: 'Google Meet',
  teams: 'Teams',
  zoom: 'Zoom',
  unknown: 'Meeting',
}

function buildMessage(template: string, title: string, minutes: number, platform: Platform): string {
  return template
    .replace('{title}', title)
    .replace('{minutes}', String(minutes))
    .replace('{platform}', PLATFORM_LABELS[platform])
}

function getSpeedMs(speed: AppSettings['animationSpeed'], duration: number): number {
  const multipliers = { slow: 1.6, medium: 1.0, fast: 0.6 }
  return duration * 1000 * multipliers[speed]
}

export default function AirplaneAnimation({ payload }: Props) {
  const { meeting, minutesBefore, settings, platformTheme = {} } = payload
  const containerRef = useRef<HTMLDivElement>(null)
  const flyDivRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [animating, setAnimating] = useState(false)
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)

  const planeColor = (platformTheme as Record<string, string>).planeColor ?? settings.planeColor
  const bannerColor = (platformTheme as Record<string, string>).bannerColor ?? settings.bannerColor
  const textColor = (platformTheme as Record<string, string>).textColor ?? settings.textColor
  const durationMs = getSpeedMs(settings.animationSpeed, settings.animationDuration)
  const message = buildMessage(settings.messageTemplate, meeting.title, minutesBefore, meeting.platform)

  useLayoutEffect(() => {
    setScreenWidth(window.innerWidth)
    // Double rAF: first paints element at off-screen startX, second starts the animation
    // This prevents the 1-frame flash at x=0 that setTimeout caused
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setAnimating(true))
      return () => cancelAnimationFrame(id2)
    })
    return () => cancelAnimationFrame(id1)
  }, [])

  useEffect(() => {
    if (!animating || !settings.soundEnabled) return
    const audio = new Audio()
    audioRef.current = audio
    audio.loop = true
    audio.volume = settings.soundVolume
    const src = settings.customSoundPath ?? 'sounds/propeller.mp3'
    audio.src = src
    audio.play().catch(() => {})

    const stopAudio = () => {
      audio.pause()
      audio.currentTime = 0
    }

    // Stop on animationend (precise) with a durationMs timeout as fallback
    const div = flyDivRef.current
    div?.addEventListener('animationend', stopAudio, { once: true })
    const fallback = setTimeout(stopAudio, durationMs + 200)

    return () => {
      div?.removeEventListener('animationend', stopAudio)
      clearTimeout(fallback)
      audio.pause()
    }
  }, [animating, durationMs, settings.soundEnabled, settings.soundVolume])

  const handleJoin = () => {
    if (meeting.joinUrl) {
      const api = (window as unknown as { electronAPI?: { overlayClickJoin?: (url: string) => void } }).electronAPI
      if (api?.overlayClickJoin) {
        api.overlayClickJoin(meeting.joinUrl)
      } else {
        window.open(meeting.joinUrl, '_blank')
      }
    }
  }

  // SVG sizes
  const planeW = 120
  const planeH = 60
  const bannerPadX = 20
  const bannerPadY = 10
  const fontSize = settings.fontSize
  // Estimate banner width (rough): ~0.6 * fontSize per char
  const estimatedBannerW = Math.max(300, message.length * fontSize * 0.55 + bannerPadX * 2)
  const bannerH = fontSize + bannerPadY * 2 + 8
  const ropeLen = 30
  // Layout: [Banner][rope][Plane] — plane leads (enters screen first), banner trails
  const totalW = estimatedBannerW + ropeLen + planeW
  const svgH = Math.max(planeH, bannerH) + 10

  const startX = -totalW
  const endX = screenWidth + 50

  // Banner starts at x=0, plane starts at x=estimatedBannerW+ropeLen
  const planeX = estimatedBannerW + ropeLen

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        ref={flyDivRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          // Always set the off-screen start position so there's never a flash at x=0
          transform: `translateY(-50%) translateX(${startX}px)`,
          willChange: 'transform',
          // CSS animation overrides transform once it starts
          animation: animating
            ? `flyAcross ${durationMs}ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards`
            : 'none',
        }}
      >
        <style>{`
          @keyframes flyAcross {
            from { transform: translateY(-50%) translateX(${startX}px); }
            to   { transform: translateY(-50%) translateX(${endX}px); }
          }
        `}</style>

        <svg
          width={totalW}
          height={svgH}
          viewBox={`0 0 ${totalW} ${svgH}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }}
        >
          {/* Banner trails behind the plane (drawn first = behind) */}
          <BannerSvg
            x={0}
            y={(svgH - bannerH) / 2}
            w={estimatedBannerW}
            h={bannerH}
            bg={bannerColor}
            text={message}
            textColor={textColor}
            fontSize={fontSize}
            fontFamily={settings.fontFamily}
            fontWeight={settings.fontWeight}
            hasLink={!!meeting.joinUrl}
          />

          {/* Rope connecting banner to plane tail */}
          <line
            x1={estimatedBannerW}
            y1={svgH / 2}
            x2={planeX}
            y2={svgH / 2}
            stroke="#6B7280"
            strokeWidth="2"
            strokeDasharray="4,3"
          />

          {/* Plane leads (drawn last = on top) */}
          <AirplaneSvg color={planeColor} x={planeX} y={(svgH - planeH) / 2} w={planeW} h={planeH} />
        </svg>
      </div>

      {/* Invisible clickable overlay on the banner area */}
      {meeting.joinUrl && (
        <div
          onClick={handleJoin}
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            transform: `translateY(-50%) translateX(${startX}px)`,
            width: estimatedBannerW,
            height: bannerH,
            cursor: 'pointer',
            pointerEvents: 'auto',
            animation: animating
              ? `flyAcrossClick ${durationMs}ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards`
              : 'none',
          }}
          title="Click to join meeting"
        >
          <style>{`
            @keyframes flyAcrossClick {
              from { transform: translateY(-50%) translateX(${startX}px); }
              to   { transform: translateY(-50%) translateX(${endX}px); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

function AirplaneSvg({ color, x, y, w, h }: { color: string; x: number; y: number; w: number; h: number }) {
  const cx = x
  const cy = y

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Main fuselage */}
      <ellipse cx={w * 0.52} cy={h * 0.52} rx={w * 0.45} ry={h * 0.22} fill={color} />

      {/* Nose cone */}
      <path
        d={`M ${w * 0.95} ${h * 0.52} Q ${w * 1.05} ${h * 0.42} ${w} ${h * 0.52} Q ${w * 1.05} ${h * 0.62} ${w * 0.95} ${h * 0.52}`}
        fill={color}
      />

      {/* Main wings */}
      <path
        d={`M ${w * 0.55} ${h * 0.45}
            L ${w * 0.75} ${h * 0.0}
            L ${w * 0.85} ${h * 0.05}
            L ${w * 0.65} ${h * 0.48}
            Z`}
        fill={color}
        opacity="0.95"
      />
      <path
        d={`M ${w * 0.55} ${h * 0.58}
            L ${w * 0.75} ${h}
            L ${w * 0.85} ${h * 0.95}
            L ${w * 0.65} ${h * 0.54}
            Z`}
        fill={color}
        opacity="0.95"
      />

      {/* Tail fin (vertical) */}
      <path
        d={`M ${w * 0.12} ${h * 0.42}
            L ${w * 0.08} ${h * 0.1}
            L ${w * 0.22} ${h * 0.38}
            Z`}
        fill={color}
        opacity="0.9"
      />

      {/* Horizontal stabilizer */}
      <path
        d={`M ${w * 0.15} ${h * 0.5}
            L ${w * 0.05} ${h * 0.28}
            L ${w * 0.12} ${h * 0.3}
            L ${w * 0.2} ${h * 0.5}
            Z`}
        fill={color}
        opacity="0.85"
      />
      <path
        d={`M ${w * 0.15} ${h * 0.54}
            L ${w * 0.05} ${h * 0.76}
            L ${w * 0.12} ${h * 0.74}
            L ${w * 0.2} ${h * 0.54}
            Z`}
        fill={color}
        opacity="0.85"
      />

      {/* Cockpit windows */}
      <ellipse cx={w * 0.82} cy={h * 0.45} rx={w * 0.07} ry={h * 0.1} fill="#E0F2FE" opacity="0.9" />

      {/* Engine pod */}
      <ellipse cx={w * 0.55} cy={h * 0.68} rx={w * 0.1} ry={h * 0.08} fill={darken(color, 20)} />

      {/* Highlight on fuselage */}
      <ellipse cx={w * 0.55} cy={h * 0.4} rx={w * 0.3} ry={h * 0.08} fill="white" opacity="0.18" />
    </g>
  )
}

function BannerSvg({
  x, y, w, h, bg, text, textColor, fontSize, fontFamily, fontWeight, hasLink
}: {
  x: number; y: number; w: number; h: number
  bg: string; text: string; textColor: string
  fontSize: number; fontFamily: string; fontWeight: string
  hasLink: boolean
}) {
  const notchSize = 16

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Banner body — notch on RIGHT side, pointing toward the rope/plane */}
      <path
        d={`
          M 0 0
          L ${w - notchSize} 0
          L ${w} ${h / 2}
          L ${w - notchSize} ${h}
          L 0 ${h}
          Z
        `}
        fill={bg}
        stroke="#D1D5DB"
        strokeWidth="1.5"
      />

      {/* Shadow on bottom */}
      <path
        d={`
          M 0 ${h * 0.85}
          L ${w - notchSize} ${h * 0.85}
          L ${w} ${h / 2}
          L ${w - notchSize} ${h}
          L 0 ${h}
          Z
        `}
        fill="rgba(0,0,0,0.06)"
      />

      {/* Text */}
      <text
        x={(w - notchSize) / 2}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily={`${fontFamily}, Inter, system-ui, sans-serif`}
        fontSize={fontSize}
        fontWeight={fontWeight}
        fill={textColor}
      >
        {text}
        {hasLink && (
          <tspan fill="#3B82F6" fontSize={fontSize * 0.85}> → Join</tspan>
        )}
      </text>
    </g>
  )
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, (n >> 16) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
