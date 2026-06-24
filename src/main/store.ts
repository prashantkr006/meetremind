import Store from 'electron-store'
import type { AppSettings } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/defaults'

export class StoreManager {
  private store: Store<{ settings: AppSettings }>

  constructor() {
    this.store = new Store({
      name: 'meetremind-config',
      defaults: {
        settings: DEFAULT_SETTINGS,
      },
    })
  }

  getSettings(): AppSettings {
    const stored = this.store.get('settings', DEFAULT_SETTINGS)
    // Merge with defaults in case new keys were added
    return { ...DEFAULT_SETTINGS, ...stored }
  }

  saveSettings(settings: AppSettings): void {
    this.store.set('settings', settings)
  }
}
