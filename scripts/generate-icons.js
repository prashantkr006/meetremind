#!/usr/bin/env node
const sharp = require('sharp')
const pngToIco = require('png-to-ico').default
const png2icons = require('png2icons')
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

  // 1024x1024 PNG → icon.png
  fs.copyFileSync(tmpPaths[1024], path.join(iconsDir, 'icon.png'))
  console.log('✓ icon.png (1024x1024) — Linux / macOS source')

  // Multi-size ICO → icon.ico (Windows)
  const icoBuffer = await pngToIco(icoSizes.map(s => tmpPaths[s]))
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer)
  console.log('✓ icon.ico (16/32/48/256) — Windows')

  // 1024x1024 PNG → icon.icns (macOS) via pure-JS png2icons (no sips/iconutil needed)
  const input = fs.readFileSync(tmpPaths[1024])
  const icns = png2icons.createICNS(input, png2icons.BICUBIC, 0)
  if (!icns) throw new Error('png2icons failed to create ICNS')
  fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icns)
  console.log('✓ icon.icns — macOS')

  fs.rmSync(tmpDir, { recursive: true })
}

main().catch(err => { console.error(err.message); process.exit(1) })
