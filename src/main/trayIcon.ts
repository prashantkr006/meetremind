import { nativeImage, app } from 'electron'
import path from 'path'

export function createTrayIcon(): Electron.NativeImage {
  const iconPath = path.join(app.getAppPath(), 'assets', 'icons', 'icon.png')
  const img = nativeImage.createFromPath(iconPath)
  return img.resize({ width: 16, height: 16 })
}
