#!/usr/bin/env node
// Launches Electron with ELECTRON_RUN_AS_NODE cleared.
// VSCode sets this env var (it's itself built on Electron), which breaks our app.
const { spawn } = require('child_process')
const path = require('path')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const electronPath = require('electron')

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env,
  cwd: path.resolve(__dirname, '..'),
})

child.on('close', (code) => process.exit(code ?? 0))
