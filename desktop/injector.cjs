// Runs in Claude Desktop's Electron main process once desktop/patch.mjs has
// added `require('./skinshift/injector.cjs').install()` to the app's entry.
//
// For every window showing claude.ai it works out the open project (the same
// detector the browser extension uses, run in the page) and applies that
// project's theme with webContents.insertCSS, swapping it as you navigate.
//
// UNOFFICIAL: this modifies the installed app. An app update replaces the
// patched files (re-run the patch), and a failure here is caught so it can
// never stop the app from starting.

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const HOME = path.join(os.homedir(), '.skinshift')
const THEMES = path.join(HOME, 'themes')

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function themeFile(key) {
  return path.join(THEMES, `${key.replace(/[^a-z0-9-]/gi, '_')}.json`)
}

function createInjector({ core, detect, config = () => readJson(path.join(HOME, 'config.json'), {}), log = () => {} }) {
  const inFlight = new Map()

  async function themeFor(info) {
    if (!info) return null
    const cfg = config()
    if (info.kind === 'chat' && !cfg.themeChats) return null
    const file = themeFile(info.key)
    const saved = readJson(file, null)
    if (saved && saved.off) return null
    if (saved) return core.normalizeTheme(saved)
    if (cfg.auto === false || !info.idea) return null
    if (!inFlight.has(info.key)) {
      const complete = cfg.apiKey ? core.anthropicComplete({ apiKey: cfg.apiKey, model: cfg.model }) : undefined
      inFlight.set(info.key, core.generateTheme({ idea: info.idea, projectName: info.name, complete }).then(({ theme, source }) => {
        fs.mkdirSync(THEMES, { recursive: true })
        fs.writeFileSync(file, JSON.stringify({ ...theme, key: info.key, projectName: info.name, source }, null, 2))
        return theme
      }).finally(() => inFlight.delete(info.key)))
    }
    return inFlight.get(info.key)
  }

  function attach(wc) {
    let cssKey = null
    let appliedFor = null
    let seq = 0
    const apply = async () => {
      const mine = ++seq
      try {
        const url = new URL(wc.getURL())
        const info = url.hostname === 'claude.ai' ? await detect(wc) : null
        if (mine !== seq) return
        if (info && appliedFor === info.key) return
        const theme = await themeFor(info)
        if (mine !== seq) return
        if (cssKey) {
          await wc.removeInsertedCSS(cssKey)
          cssKey = null
        }
        appliedFor = theme ? info.key : null
        if (theme) {
          cssKey = await wc.insertCSS(core.toClaudeAiCss(theme), { cssOrigin: 'user' })
          await wc.executeJavaScript(`document.documentElement.setAttribute('data-skinshift', ${JSON.stringify(theme.id)})`)
        } else {
          await wc.executeJavaScript(`document.documentElement.removeAttribute('data-skinshift')`)
        }
      } catch (error) {
        log(`skinshift: ${error && error.message}`)
      }
    }
    wc.on('did-finish-load', () => { appliedFor = null; cssKey = null; apply() })
    wc.on('did-navigate-in-page', apply)
    return apply
  }

  return { attach, themeFor }
}

function install() {
  try {
    const { app } = require('electron')
    const detectSource = require('./detect.generated.cjs')
    const corePromise = import(pathToFileURL(path.join(__dirname, 'core', 'index.js')).href)
    app.on('web-contents-created', async (_event, wc) => {
      try {
        const core = await corePromise
        const injector = createInjector({
          core,
          detect: target => target.executeJavaScript(detectSource, true),
          log: line => console.warn(line),
        })
        injector.attach(wc)
      } catch (error) {
        console.warn(`skinshift: ${error && error.message}`)
      }
    })
  } catch (error) {
    console.warn(`skinshift: not installed: ${error && error.message}`)
  }
}

module.exports = { install, createInjector, themeFile }
