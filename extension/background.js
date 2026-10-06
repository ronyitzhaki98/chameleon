// Service worker: owns the theme store and the model calls, so the API key
// never touches the claude.ai page.
import { anthropicComplete, generateTheme, normalizeTheme, toClaudeAiCss } from './core/index.js'

const inFlight = new Map()

async function settings() {
  const s = await chrome.storage.local.get({ apiKey: '', model: 'claude-sonnet-5-5', auto: true, themeChats: false })
  return s
}

async function getTheme(key) {
  const k = `theme:${key}`
  return (await chrome.storage.local.get(k))[k] || null
}

async function design(info) {
  if (inFlight.has(info.key)) return inFlight.get(info.key)
  const job = (async () => {
    const s = await settings()
    const complete = s.apiKey ? anthropicComplete({ apiKey: s.apiKey, model: s.model, browser: true }) : undefined
    const { theme, source, error } = await generateTheme({ idea: info.idea, projectName: info.name, complete })
    await chrome.storage.local.set({ [`theme:${info.key}`]: { ...theme, key: info.key, projectName: info.name, source } })
    return { theme, source, error }
  })().finally(() => inFlight.delete(info.key))
  inFlight.set(info.key, job)
  return job
}

async function resolve(info) {
  if (!info) return { css: null }
  const s = await settings()
  if (info.kind === 'chat' && !s.themeChats) return { css: null }
  if ((await chrome.storage.local.get(`off:${info.key}`))[`off:${info.key}`]) return { css: null }
  let theme = await getTheme(info.key)
  if (!theme) {
    if (!s.auto || !info.idea) return { css: null, pending: !info.idea }
    theme = (await design(info)).theme
  }
  theme = normalizeTheme(theme)
  return { css: toClaudeAiCss(theme), theme }
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  const run = async () => {
    switch (msg.type) {
      case 'resolve':
        return resolve(msg.info)
      case 'design': {
        await chrome.storage.local.remove(`off:${msg.info.key}`)
        const r = await design(msg.info)
        return { ...r, css: toClaudeAiCss(r.theme) }
      }
      case 'off':
        await chrome.storage.local.remove(`theme:${msg.key}`)
        await chrome.storage.local.set({ [`off:${msg.key}`]: true })
        return { ok: true }
      case 'list': {
        const all = await chrome.storage.local.get(null)
        return Object.entries(all).filter(([k]) => k.startsWith('theme:')).map(([, v]) => v)
      }
      default:
        return { error: `unknown message ${msg.type}` }
    }
  }
  run().then(reply, e => reply({ error: String(e?.message || e) }))
  return true
})
