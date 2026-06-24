#!/usr/bin/env node
/**
 * Generates icon files from assets/icons/icon.svg:
 *   icon.png  (512x512) — Linux + macOS fallback
 *   icon.ico  (multi-size) — Windows
 *
 * For macOS icon.icns, electron-builder converts icon.png automatically
 * when building on a Mac or via GitHub Actions (see .github/workflows/release.yml).
 *
 * Run: npm run generate-icons
 */
const sharp = require('sharp')
const pngToIco = require('png-to-ico').default
const fs = require('fs')
const path = require('path')
const os = require('os')

const svgPath  = path.join(__dirname, '../assets/icons/icon.svg')
const iconsDir = path.join(__dirname, '../assets/icons')

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error('Missing assets/icons/icon.svg')
    process.exit(1)
  }

  const svg = fs.readFileSync(svgPath)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetremind-icons-'))
  console.log('Generating icons from icon.svg ...')

  // Write PNGs at each required size to temp dir
  const icoSizes = [16, 32, 48, 256]
  const tmpPaths = {}
  for (const size of [...icoSizes, 512, 1024]) {
    const buf = await sharp(svg).resize(size, size).png().toBuffer()
    const p = path.join(tmpDir, `icon-${size}.png`)
    fs.writeFileSync(p, buf)
    tmpPaths[size] = p
    process.stdout.write(`  ${size}x${size}`)
  }
  console.log()

  // 1024x1024 PNG → icon.png (macOS requires 1024x1024 for icns conversion)
  fs.copyFileSync(tmpPaths[1024], path.join(iconsDir, 'icon.png'))
  console.log('✓ icon.png (1024x1024) — macOS / Linux')

  // Multi-size ICO → icon.ico
  const icoBuffer = await pngToIco(icoSizes.map(s => tmpPaths[s]))
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer)
  console.log('✓ icon.ico (16/32/48/256) — Windows')

  // Clean up temp files
  fs.rmSync(tmpDir, { recursive: true })

  console.log()
  console.log('icon.icns: electron-builder auto-generates from icon.png during mac build')
}

main().catch(err => { console.error(err.message); process.exit(1) })
