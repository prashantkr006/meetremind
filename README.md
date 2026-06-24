# MeetRemind ✈️

A cross-platform desktop meeting reminder that flies a cartoon airplane with a trailing banner across your screen before meetings.

## Quick Start

```bash
npm install
npm run dev
```

The "Test Animation" button works immediately — no calendar setup needed.

---

## OAuth Setup (Optional — needed for calendar sync)

### Google Calendar

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Enable APIs** → enable **Google Calendar API**
3. **Credentials → Create credentials → OAuth 2.0 Client ID → Desktop app**
4. Download credentials, copy Client ID and Client Secret
5. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxx
   ```

### Microsoft Calendar (Outlook/Teams)

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. **New registration** → Name: `MeetRemind` → Supported account types: **Any Azure AD + personal Microsoft accounts**
3. **Redirect URIs → Add** `http://localhost:42814` (type: Public client/native)
4. **API permissions → Add → Microsoft Graph → Delegated → `Calendars.Read`** → Grant admin consent
5. Copy **Application (client) ID**
6. Add to `.env`:
   ```
   MICROSOFT_CLIENT_ID=xxxx
   ```

---

## Sound

Place a `propeller.mp3` in `assets/sounds/`. See `assets/sounds/README.txt` for a CC0 source.

---

## Development

```bash
npm run dev          # Start everything (renderer + overlay + electron)
npm run build        # Production build
npm run dist:win     # Package for Windows
npm run dist:mac     # Package for macOS
npm run dist:linux   # Package for Linux
```

## Architecture

```
src/
  main/         Electron main process
    index.ts    App entry, IPC, tray
    overlay.ts  Transparent always-on-top window manager
    calendar.ts Google + Microsoft calendar sync
    auth.ts     OAuth flow + keychain storage
    scheduler.ts Reminder timing engine
    store.ts    electron-store wrapper
  renderer/     Settings UI (React + Tailwind, port 5173)
  overlay/      Animation window (React, port 5174)
  shared/       Types shared between main + renderer
assets/
  sounds/       propeller.mp3 (add manually)
  icons/        App icons
```

## Features

- ✈️ Animated airplane flies across screen with trailing banner
- 🗓 Google Calendar + Microsoft Outlook/Teams sync
- ⏰ Multiple reminder times per meeting (5/10/15 min + custom)
- 🎨 Full color/font customization with per-platform overrides
- 🔊 Sound with volume control
- 💻 System tray with quick access and upcoming meetings
- 🔒 OAuth tokens stored in OS keychain (keytar)
- 🖱 Click banner to join meeting directly
