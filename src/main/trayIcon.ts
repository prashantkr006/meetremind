import { nativeImage } from 'electron'

// Generate a simple tray icon programmatically as a data URI
// so we don't need an external file
export function createTrayIcon(): Electron.NativeImage {
  // 16x16 PNG encoded as base64 (blue airplane emoji approximation)
  // We draw a simple plane shape using canvas-like SVG → PNG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <rect width="16" height="16" rx="3" fill="#3B82F6"/>
    <text x="2" y="13" font-size="12">✈</text>
  </svg>`

  const b64 = Buffer.from(svg).toString('base64')
  const dataUri = `data:image/svg+xml;base64,${b64}`
  return nativeImage.createFromDataURL(dataUri)
}
