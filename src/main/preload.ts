import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings): Promise<boolean> => ipcRenderer.invoke('save-settings', settings),
  testAnimation: (): Promise<void> => ipcRenderer.invoke('test-animation'),
  openUrl: (url: string): Promise<void> => ipcRenderer.invoke('open-url', url),
  getUpcomingMeetings: () => ipcRenderer.invoke('get-upcoming-meetings'),
  getAuthStatus: () => ipcRenderer.invoke('get-auth-status'),
  connectGoogle: () => ipcRenderer.invoke('connect-google'),
  connectMicrosoft: (useWorkAccount?: boolean) => ipcRenderer.invoke('connect-microsoft', useWorkAccount),
  disconnectGoogle: () => ipcRenderer.invoke('disconnect-google'),
  disconnectMicrosoft: () => ipcRenderer.invoke('disconnect-microsoft'),
  overlayClickJoin: (url: string) => ipcRenderer.invoke('overlay-click-join', url),

  // Overlay-specific: receive animation trigger
  onShowAnimation: (cb: (payload: unknown) => void) => {
    ipcRenderer.on('show-animation', (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners('show-animation')
  },
})
