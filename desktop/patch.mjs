#!/usr/bin/env node
// EXPERIMENTAL, UNOFFICIAL. Patches an installed Claude Desktop so it loads the
// Skinshift injector. Read docs/desktop.md before running it.
//
//   node desktop/patch.mjs status    [--app <path to app.asar>]
//   node desktop/patch.mjs install   [--app <path>] [--force]
//   node desktop/patch.mjs uninstall [--app <path>]
//
// What it does: backs up app.asar, extracts it, copies desktop/injector.cjs,
// the claude.ai detector and /core into <app>/skinshift/, adds one guarded
// require line to the top of the app's main entry, and repacks.
//
// Why it is opt-in: on macOS and Windows, Electron's ASAR integrity check
// rejects a modified archive unless the hash in the signed binary is updated,
// so the app would refuse to start; this script does not touch binaries or
// signatures and so refuses those platforms unless --force. Every app update
// replaces the archive and removes the patch.

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { homedir, platform, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..')
const MARK = '/* skinshift */'
const LINE = `${MARK} try { require('./skinshift/injector.cjs').install() } catch (e) { console.warn('skinshift', e) }\n`

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}

function candidates() {
  const p = platform()
  if (p === 'darwin') return ['/Applications/Claude.app/Contents/Resources/app.asar']
  if (p === 'win32') {
    const base = join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'AnthropicClaude')
    const apps = existsSync(base) ? readdirSync(base).filter(d => d.startsWith('app-')).sort().reverse() : []
    return apps.map(d => join(base, d, 'resources', 'app.asar'))
  }
  return [
    '/usr/lib/claude-desktop/resources/app.asar',
    '/usr/lib/claude-desktop/app.asar',
    '/opt/Claude/resources/app.asar',
    join(homedir(), '.local/share/claude-desktop/resources/app.asar'),
  ]
}

function asar(...args) {
  execFileSync('npx', ['--yes', '@electron/asar@3', ...args], { stdio: 'inherit' })
}

function findAsar() {
  const given = arg('--app')
  const found = given ? [given] : candidates().filter(existsSync)
  if (!found.length) throw new Error(`Claude Desktop's app.asar was not found; pass --app <path>. Looked in:\n  ${candidates().join('\n  ')}`)
  return found[0]
}

function extract(archive) {
  const dir = mkdtempSync(join(tmpdir(), 'skinshift-'))
  asar('extract', archive, dir)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  return { dir, main: join(dir, pkg.main || 'index.js') }
}

const command = process.argv[2] || 'status'
const archive = findAsar()
const backup = `${archive}.skinshift-backup`

if (command === 'status') {
  const { dir, main } = extract(archive)
  console.log(`${archive}\n  patched: ${readFileSync(main, 'utf8').includes(MARK)}\n  backup: ${existsSync(backup)}`)
  rmSync(dir, { recursive: true, force: true })
} else if (command === 'install') {
  if ((platform() === 'darwin' || platform() === 'win32') && !process.argv.includes('--force')) {
    console.error('Refusing: on macOS and Windows the ASAR integrity check will stop a patched Claude Desktop from starting. See docs/desktop.md. Use the browser extension, or pass --force if you know how to handle the integrity fuse.')
    process.exit(2)
  }
  const { dir, main } = extract(archive)
  const source = readFileSync(main, 'utf8')
  if (source.includes(MARK)) {
    console.log('Already patched.')
  } else {
    if (!existsSync(backup)) copyFileSync(archive, backup)
    const target = join(dir, 'skinshift')
    cpSync(join(repo, 'core'), join(target, 'core'), { recursive: true })
    writeFileSync(join(target, 'core', 'package.json'), '{ "type": "module" }\n')
    copyFileSync(join(here, 'injector.cjs'), join(target, 'injector.cjs'))
    copyFileSync(join(here, 'detect.generated.cjs'), join(target, 'detect.generated.cjs'))
    const rel = dirname(main) === dir ? './skinshift/injector.cjs' : `${'../'.repeat(main.slice(dir.length + 1).split(/[\\/]/).length - 1)}skinshift/injector.cjs`
    const shebang = source.startsWith('#!') ? source.slice(0, source.indexOf('\n') + 1) : ''
    writeFileSync(main, shebang + LINE.replace('./skinshift/injector.cjs', rel) + source.slice(shebang.length))
    asar('pack', dir, archive)
    console.log(`Patched ${archive}. Backup at ${backup}. Restart Claude Desktop.`)
  }
  rmSync(dir, { recursive: true, force: true })
} else if (command === 'uninstall') {
  if (!existsSync(backup)) throw new Error(`No backup at ${backup}; reinstall Claude Desktop to restore it.`)
  copyFileSync(backup, archive)
  rmSync(backup)
  console.log(`Restored ${archive}.`)
} else {
  console.error('usage: patch.mjs status|install|uninstall [--app <path>] [--force]')
  process.exit(1)
}
